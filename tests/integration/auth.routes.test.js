const request = require('supertest');
const app = require('../../server');
const db = require('../../app/models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

jest.mock('../../app/models');
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');

console.log = jest.fn();

describe('Auth Routes Integration Tests', () => {
  let server;

  beforeAll(async () => {
    server = app;
  });

  afterAll(async () => {
    if (server && server.close) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/signup', () => {
    it('should register a new user successfully', (done) => {
      const userData = {
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

      db.user.findOne
        .mockReturnValueOnce({
          then: jest.fn().mockImplementation((callback) => {
            callback(null);
            return { catch: jest.fn() };
          })
        })
        .mockReturnValueOnce({
          then: jest.fn().mockImplementation((callback) => {
            callback(null);
            return { catch: jest.fn() };
          })
        });

      db.ROLES = ['user', 'admin'];
      bcrypt.hashSync.mockReturnValue('hashedPassword');

      request(server)
        .post('/api/auth/signup')
        .send(userData)
        .expect(200)
        .end((err, response) => {
          if (err) return done(err);
          
          expect(response.body).toEqual({ 
            message: "User registered successfully!" 
          });
          expect(db.user.create).toHaveBeenCalledWith({
            username: 'testuser',
            email: 'test@example.com',
            password: 'hashedPassword'
          });
          expect(mockUser.setRoles).toHaveBeenCalledWith([1]);
          done();
        });
    });

    it('should return 400 for duplicate username', (done) => {
      const userData = {
        username: 'existinguser',
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = { username: 'existinguser' };
      db.user.findOne.mockReturnValue({
        then: jest.fn().mockImplementation((callback) => {
          callback(mockUser);
          return { catch: jest.fn() };
        })
      });

      request(server)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400)
        .end((err, response) => {
          if (err) return done(err);
          
          expect(response.body).toEqual({
            message: "Failed! Username is already in use!"
          });
          done();
        });
    });
  });

  describe('POST /api/auth/signin', () => {
    it('should authenticate user and return tokens', (done) => {
      const loginData = {
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
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      request(server)
        .post('/api/auth/signin')
        .send(loginData)
        .expect(200)
        .end((err, response) => {
          if (err) return done(err);
          
          expect(response.body).toMatchObject({
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            sessionId: expect.any(String),
            roles: ['ROLE_USER']
          });
          expect(response.headers['set-cookie']).toBeDefined();
          done();
        });
    });

    it('should return 404 for non-existent user', (done) => {
      const loginData = {
        username: 'nonexistent',
        password: 'password123'
      };

      db.user.findOne.mockReturnValue({
        then: jest.fn().mockImplementation((callback) => {
          callback(null);
          return { catch: jest.fn() };
        })
      });

      request(server)
        .post('/api/auth/signin')
        .send(loginData)
        .expect(404)
        .end((err, response) => {
          if (err) return done(err);
          
          expect(response.body).toEqual({ message: "User Not found." });
          done();
        });
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens successfully', (done) => {
      const refreshData = {
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

      request(server)
        .post('/api/auth/refresh')
        .send(refreshData)
        .expect(200)
        .end((err, response) => {
          if (err) return done(err);
          
          expect(response.body).toEqual({
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token'
          });
          done();
        });
    });
  });
});