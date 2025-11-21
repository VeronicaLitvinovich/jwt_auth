const request = require('supertest');
const app = require('../../server');
const db = require('../../app/models');
const jwt = require('jsonwebtoken');

jest.mock('../../app/models');
jest.mock('jsonwebtoken');

console.log = jest.fn();

describe('User Routes Integration Tests', () => {
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

  describe('GET /api/test/all', () => {
    it('should return public content', (done) => {
      request(server)
        .get('/api/test/all')
        .expect(200)
        .end((err, response) => {
          if (err) return done(err);
          
          expect(response.text).toBe('Test info lab4.');
          done();
        });
    });
  });

  describe('GET /api/test/user-session', () => {
    it('should return user content for valid session', (done) => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
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

      request(server)
        .get('/api/test/user-session')
        .set('Cookie', ['sessionId=valid-session-id'])
        .expect(200)
        .end((err, response) => {
          if (err) return done(err);
          
          expect(response.text).toBe('Test User lab4.');
          done();
        });
    });

    it('should return 401 for invalid session', (done) => {
      db.user.findOne.mockReturnValue({
        then: jest.fn().mockImplementation((callback) => {
          callback(null);
          return { catch: jest.fn() };
        })
      });

      request(server)
        .get('/api/test/user-session')
        .set('Cookie', ['sessionId=invalid-session-id'])
        .expect(401)
        .end((err, response) => {
          if (err) return done(err);
          
          expect(response.body).toEqual({ 
            message: "Session expired!" 
          });
          done();
        });
    });
  });

  describe('GET /api/test/user-token', () => {
    it('should return user content for valid token', (done) => {
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, { id: 1 });
      });

      request(server)
        .get('/api/test/user-token')
        .set('x-access-token', 'valid-token')
        .expect(200)
        .end((err, response) => {
          if (err) return done(err);
          
          expect(response.text).toBe('Test User lab4.');
          done();
        });
    });

    it('should return 401 for invalid token', (done) => {
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(new Error('Invalid token'), null);
      });

      request(server)
        .get('/api/test/user-token')
        .set('x-access-token', 'invalid-token')
        .expect(401)
        .end((err, response) => {
          if (err) return done(err);
          
          expect(response.body).toEqual({ 
            message: "Unauthorized!" 
          });
          done();
        });
    });
  });

  describe('GET /api/test/admin', () => {
    it('should return admin content for admin user with session', (done) => {
      const mockUser = {
        id: 1,
        username: 'adminuser',
        email: 'admin@example.com',
        getRoles: jest.fn().mockReturnValue({
          then: jest.fn().mockImplementation((callback) => {
            callback([{ name: 'admin' }]);
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

      db.user.findByPk.mockReturnValue({
        then: jest.fn().mockImplementation((callback) => {
          callback(mockUser);
          return { catch: jest.fn() };
        })
      });

      request(server)
        .get('/api/test/admin')
        .set('Cookie', ['sessionId=valid-admin-session'])
        .expect(200)
        .end((err, response) => {
          if (err) return done(err);
          
          expect(response.text).toBe('Test Admin lab4.');
          done();
        });
    });

    it('should return 403 for non-admin user', (done) => {
      const mockUser = {
        id: 2,
        username: 'regularuser',
        email: 'user@example.com',
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

      db.user.findByPk.mockReturnValue({
        then: jest.fn().mockImplementation((callback) => {
          callback(mockUser);
          return { catch: jest.fn() };
        })
      });

      request(server)
        .get('/api/test/admin')
        .set('Cookie', ['sessionId=valid-user-session'])
        .expect(403)
        .end((err, response) => {
          if (err) return done(err);
          
          expect(response.body).toEqual({ 
            message: "Require Admin Role!" 
          });
          done();
        });
    });
  });
});