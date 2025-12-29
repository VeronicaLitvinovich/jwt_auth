const authController = require('../../app/controllers/auth.controller');
const db = require('../../app/models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

jest.mock('../../app/models');
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-session-id-123')
}));

describe('Auth Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      body: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      cookie: jest.fn(),
      clearCookie: jest.fn()
    };
    
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('should register user successfully with default role', (done) => {
      mockReq.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        setRoles: jest.fn().mockReturnValue({
          then: jest.fn().mockImplementation((callback) => {
            callback();
            return { catch: jest.fn() };
          })
        })
      };

      db.user.create.mockReturnValue({
        then: jest.fn().mockImplementation((callback) => {
          callback(mockUser);
          return { catch: jest.fn() };
        })
      });
      bcrypt.hashSync.mockReturnValue('hashedPassword');

      authController.signup(mockReq, mockRes);

      setTimeout(() => {
        try {
          expect(db.user.create).toHaveBeenCalledWith({
            username: 'testuser',
            email: 'test@example.com',
            password: 'hashedPassword'
          });
          expect(mockUser.setRoles).toHaveBeenCalledWith([1]);
          expect(mockRes.send).toHaveBeenCalledWith({ 
            message: "User registered successfully!" 
          });
          done();
        } catch (error) {
          done(error);
        }
      }, 0);
    });

    it('should handle registration error', (done) => {
      mockReq.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const error = new Error('Database error');
      db.user.create.mockReturnValue({
        then: jest.fn().mockImplementation((callback) => {
          return { 
            catch: jest.fn().mockImplementation((errorCallback) => {
              errorCallback(error);
            })
          };
        })
      });

      authController.signup(mockReq, mockRes);

      setTimeout(() => {
        try {
          expect(mockRes.status).toHaveBeenCalledWith(500);
          expect(mockRes.send).toHaveBeenCalledWith({ message: 'Database error' });
          done();
        } catch (error) {
          done(error);
        }
      }, 0);
    });
  });

  describe('signin', () => {
    it('should authenticate user successfully', (done) => {
      mockReq.body = {
        username: 'testuser',
        password: 'password123'
      };

      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedPassword',
        update: jest.fn().mockReturnValue({
          then: jest.fn().mockImplementation((callback) => {
            callback();
            return { catch: jest.fn() };
          })
        }),
        getRoles: jest.fn().mockReturnValue({
          then: jest.fn().mockImplementation((callback) => {
            callback([{ name: 'user' }]);
            return { catch: jest.fn() };
          })
        })
      };

      db.user.findOne.mockReturnValue({
        then: jest.fn().mockImplementation((callback) => {
          callback(mockUser);
          return { catch: jest.fn() };
        })
      });
      bcrypt.compareSync.mockReturnValue(true);
      jwt.sign
        .mockReturnValueOnce('accessToken')
        .mockReturnValueOnce('refreshToken');

      authController.signin(mockReq, mockRes);

      setTimeout(() => {
        try {
          expect(bcrypt.compareSync).toHaveBeenCalledWith('password123', 'hashedPassword');
          expect(jwt.sign).toHaveBeenCalledTimes(2);
          expect(mockUser.update).toHaveBeenCalledWith({
            refreshToken: 'refreshToken',
            sessionId: 'mock-session-id-123',
            sessionExpires: expect.any(Date)
          });
          expect(mockRes.cookie).toHaveBeenCalledWith('sessionId', 'mock-session-id-123', {
            httpOnly: true,
            secure: false,
            maxAge: 24 * 60 * 60 * 1000
          });
          done();
        } catch (error) {
          done(error);
        }
      }, 0);
    });

    it('should return 404 for non-existent user', (done) => {
      mockReq.body = {
        username: 'nonexistent',
        password: 'password123'
      };

      db.user.findOne.mockReturnValue({
        then: jest.fn().mockImplementation((callback) => {
          callback(null);
          return { catch: jest.fn() };
        })
      });

      authController.signin(mockReq, mockRes);

      setTimeout(() => {
        try {
          expect(mockRes.status).toHaveBeenCalledWith(404);
          expect(mockRes.send).toHaveBeenCalledWith({ message: "User Not found." });
          done();
        } catch (error) {
          done(error);
        }
      }, 0);
    });

    it('should return 401 for invalid password', (done) => {
      mockReq.body = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      const mockUser = {
        password: 'hashedPassword'
      };

      db.user.findOne.mockReturnValue({
        then: jest.fn().mockImplementation((callback) => {
          callback(mockUser);
          return { catch: jest.fn() };
        })
      });
      bcrypt.compareSync.mockReturnValue(false);

      authController.signin(mockReq, mockRes);

      setTimeout(() => {
        try {
          expect(mockRes.status).toHaveBeenCalledWith(401);
          expect(mockRes.send).toHaveBeenCalledWith({
            accessToken: null,
            message: "Invalid Password!"
          });
          done();
        } catch (error) {
          done(error);
        }
      }, 0);
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens successfully', (done) => {
      mockReq.body = {
        refreshToken: 'valid-refresh-token'
      };

      const mockUser = {
        id: 1,
        refreshToken: 'valid-refresh-token',
        update: jest.fn().mockReturnValue({
          then: jest.fn().mockImplementation((callback) => {
            callback();
            return { catch: jest.fn() };
          })
        })
      };

      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, { id: 1 });
      });
      db.user.findByPk.mockReturnValue({
        then: jest.fn().mockImplementation((callback) => {
          callback(mockUser);
          return { catch: jest.fn() };
        })
      });
      jwt.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      authController.refreshToken(mockReq, mockRes);

      setTimeout(() => {
        try {
          expect(mockUser.update).toHaveBeenCalledWith({
            refreshToken: 'new-refresh-token'
          });
          expect(mockRes.status).toHaveBeenCalledWith(200);
          expect(mockRes.send).toHaveBeenCalledWith({
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token'
          });
          done();
        } catch (error) {
          done(error);
        }
      }, 0);
    });

    it('should return 403 for invalid refresh token', (done) => {
      mockReq.body = {
        refreshToken: 'invalid-token'
      };

      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(new Error('Invalid token'), null);
      });

      authController.refreshToken(mockReq, mockRes);

      setTimeout(() => {
        try {
          expect(mockRes.status).toHaveBeenCalledWith(403);
          expect(mockRes.send).toHaveBeenCalledWith({ 
            message: "Invalid refresh token!" 
          });
          done();
        } catch (error) {
          done(error);
        }
      }, 0);
    });
  });

  describe('logout', () => {
    it('should logout user successfully', (done) => {
      mockReq.userId = 1;

      const mockUser = {
        update: jest.fn().mockReturnValue({
          then: jest.fn().mockImplementation((callback) => {
            callback();
            return { catch: jest.fn() };
          })
        })
      };

      db.user.findByPk.mockReturnValue({
        then: jest.fn().mockImplementation((callback) => {
          callback(mockUser);
          return { catch: jest.fn() };
        })
      });

      authController.logout(mockReq, mockRes);

      setTimeout(() => {
        try {
          expect(mockUser.update).toHaveBeenCalledWith({
            refreshToken: null,
            sessionId: null,
            sessionExpires: null
          });
          expect(mockRes.clearCookie).toHaveBeenCalledWith('sessionId');
          expect(mockRes.status).toHaveBeenCalledWith(200);
          expect(mockRes.send).toHaveBeenCalledWith({ 
            message: "Logged out successfully!" 
          });
          done();
        } catch (error) {
          done(error);
        }
      }, 0);
    });
  });
});ваприоть