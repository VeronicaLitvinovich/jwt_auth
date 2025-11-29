const authJwt = require('../../app/middleware/authJwt');
const db = require('../../app/models');
const jwt = require('jsonwebtoken');

jest.mock('../../app/models');
jest.mock('jsonwebtoken');

console.log = jest.fn();

describe('Auth JWT Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {},
      cookies: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      clearCookie: jest.fn()
    };
    mockNext = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('verifyToken', () => {
    it('should call next for valid token', () => {
      mockReq.headers['x-access-token'] = 'valid-token';
      
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, { id: 1 });
      });

      authJwt.verifyToken(mockReq, mockRes, mockNext);

      expect(mockReq.userId).toBe(1);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 for missing token', () => {
      authJwt.verifyToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "No token provided!"
      });
    });

    it('should return 401 for invalid token', () => {
      mockReq.headers['x-access-token'] = 'invalid-token';
      
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(new Error('Invalid token'), null);
      });

      authJwt.verifyToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Unauthorized!"
      });
    });
  });

  describe('verifySession', () => {
    it('should call next for valid session', async () => {
      mockReq.cookies.sessionId = 'valid-session-id';
      
      const mockUser = {
        id: 1
      };

      db.user.findOne.mockResolvedValue(mockUser);

      await authJwt.verifySession(mockReq, mockRes, mockNext);

      expect(mockReq.userId).toBe(1);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 for missing session', async () => {
      await authJwt.verifySession(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "No active session!"
      });
    });

    it('should return 401 for expired session', async () => {
      mockReq.cookies.sessionId = 'expired-session-id';
      
      db.user.findOne.mockResolvedValue(null);

      await authJwt.verifySession(mockReq, mockRes, mockNext);

      expect(mockRes.clearCookie).toHaveBeenCalledWith('sessionId');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Session expired!"
      });
    });
  });

  describe('verifyHybridToken', () => {
    it('should prioritize session over token', async () => {
      mockReq.cookies.sessionId = 'valid-session-id';
      mockReq.headers['x-access-token'] = 'valid-token';
      
      const mockUser = {
        id: 1
      };

      db.user.findOne.mockResolvedValue(mockUser);

      await authJwt.verifyHybridToken(mockReq, mockRes, mockNext);

      expect(db.user.findOne).toHaveBeenCalled();
      expect(jwt.verify).not.toHaveBeenCalled();
      expect(mockReq.userId).toBe(1);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should fallback to token when session is invalid', async () => {
      mockReq.cookies.sessionId = 'invalid-session-id';
      mockReq.headers['x-access-token'] = 'valid-token';
      
      db.user.findOne.mockResolvedValue(null);
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, { id: 2 });
      });

      await authJwt.verifyHybridToken(mockReq, mockRes, mockNext);

      expect(jwt.verify).toHaveBeenCalled();
      expect(mockReq.userId).toBe(2);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 when no authentication provided', async () => {
      await authJwt.verifyHybridToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "No authentication provided!"
      });
    });
  });

  describe('isAdmin', () => {
    it('should call next for admin user', (done) => {
      mockReq.userId = 1;
      
      const mockUser = {
        getRoles: jest.fn().mockReturnValue({
          then: jest.fn().mockImplementation((callback) => {
            callback([{ name: 'admin' }]);
            return { catch: jest.fn() };
          })
        })
      };

      db.user.findByPk.mockResolvedValue(mockUser);

      authJwt.isAdmin(mockReq, mockRes, mockNext);

      setTimeout(() => {
        try {
          expect(mockNext).toHaveBeenCalled();
          done();
        } catch (error) {
          done(error);
        }
      }, 0);
    });

    it('should return 403 for non-admin user', (done) => {
      mockReq.userId = 2;
      
      const mockUser = {
        getRoles: jest.fn().mockReturnValue({
          then: jest.fn().mockImplementation((callback) => {
            callback([{ name: 'user' }]);
            return { catch: jest.fn() };
          })
        })
      };

      db.user.findByPk.mockResolvedValue(mockUser);

      authJwt.isAdmin(mockReq, mockRes, mockNext);

      setTimeout(() => {
        try {
          expect(mockRes.status).toHaveBeenCalledWith(403);
          expect(mockRes.send).toHaveBeenCalledWith({
            message: "Require Admin Role!"
          });
          done();
        } catch (error) {
          done(error);
        }
      }, 0);
    });

    it('should handle user not found', (done) => {
      mockReq.userId = 999;
      
      db.user.findByPk.mockResolvedValue(null);

      authJwt.isAdmin(mockReq, mockRes, mockNext);

      setTimeout(() => {
        try {
          expect(mockRes.status).toHaveBeenCalledWith(403);
          expect(mockRes.send).toHaveBeenCalledWith({
            message: "Require Admin Role!"
          });
          done();
        } catch (error) {
          done(error);
        }
      }, 0);
    });
  });fhgjk
});