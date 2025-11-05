const request = require('supertest');
const app = require('../../server');
const db = require('../../app/models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authConfig = require('../../app/config/auth.config');

jest.mock('../../app/middleware/verifySignUp', () => ({
  checkDuplicateUsernameOrEmail: jest.fn((req, res, next) => {
    if (req.body.username === 'existinguser') {
      return res.status(400).send({
        message: "Failed! Username is already in use!"
      });
    }
    next();
  }),
  checkRolesExisted: jest.fn((req, res, next) => next())
}));

describe('Auth Routes Integration Tests', () => {
  let validRefreshToken;

  beforeEach(() => {
    jest.clearAllMocks();
    
    validRefreshToken = jwt.sign(
      { id: 1 }, 
      authConfig.secret, 
      { 
        algorithm: 'HS256',
        expiresIn: 604800 
      }
    );
    
    db.user.findOne.mockImplementation((query) => {
      if (query.where.username === 'testuser') {
        return Promise.resolve({
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          password: bcrypt.hashSync('password123', 8),
          getRoles: jest.fn().mockResolvedValue([{ name: 'user' }]),
          setRoles: jest.fn().mockResolvedValue(true),
          update: jest.fn().mockResolvedValue(true)
        });
      }
      if (query.where.username === 'existinguser') {
        return Promise.resolve({
          id: 2,
          username: 'existinguser',
          email: 'existing@example.com',
          password: bcrypt.hashSync('password123', 8)
        });
      }
      if (query.where.sessionId === 'valid-session-id') {
        return Promise.resolve({
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          getRoles: jest.fn().mockResolvedValue([{ name: 'user' }])
        });
      }
      return Promise.resolve(null);
    });

    db.user.create.mockImplementation((data) => {
      return Promise.resolve({
        id: 1,
        username: data.username,
        email: data.email,
        password: data.password,
        setRoles: jest.fn().mockResolvedValue(true),
        getRoles: jest.fn().mockResolvedValue([{ name: 'user' }]),
        update: jest.fn().mockResolvedValue(true)
      });
    });

    db.user.findByPk.mockImplementation((id) => {
      if (id === 1) {
        return Promise.resolve({
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          update: jest.fn().mockResolvedValue(true)
        });
      }
      return Promise.resolve(null);
    });
  });

  describe('POST /api/auth/signup', () => {
    test('should register new user', async () => {
      const userData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'User registered successfully!');
    });

    test('should not register user with duplicate username', async () => {
      const userData = {
        username: 'existinguser',
        email: 'test2@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Failed! Username is already in use!');
    });
  });

  describe('POST /api/auth/signin', () => {
    test('should login with correct credentials', async () => {
      const loginData = {
        username: 'testuser',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/signin')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body.username).toBe('testuser');
    });

    test('should not login with wrong password', async () => {
      const loginData = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/signin')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Invalid Password!');
    });

    test('should not login with non-existent user', async () => {
      const loginData = {
        username: 'nonexistent',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/signin')
        .send(loginData)
        .expect(404);

      expect(response.body).toHaveProperty('message', 'User Not found.');
    });
  });

  describe('POST /api/auth/refresh', () => {
    test('should refresh token with valid refresh token', async () => {
      db.user.findByPk.mockResolvedValueOnce({
        id: 1,
        username: 'testuser',
        refreshToken: validRefreshToken, 
        update: jest.fn().mockResolvedValue(true)
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: validRefreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    test('should return 403 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(403);

      expect(response.body).toHaveProperty('message', 'Invalid refresh token!');
    });

    test('should return 403 when no refresh token provided', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({}) 
        .expect(403);

      expect(response.body).toHaveProperty('message', 'Refresh Token is required!');
    });
  });

  describe('GET /api/auth/session', () => {
    test('should return valid session info', async () => {
      const response = await request(app)
        .get('/api/auth/session')
        .set('Cookie', ['sessionId=valid-session-id'])
        .expect(200);

      expect(response.body).toHaveProperty('sessionValid', true);
      expect(response.body.username).toBe('testuser');
    });

    test('should return 401 for invalid session', async () => {
      db.user.findOne.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/auth/session')
        .set('Cookie', ['sessionId=invalid-session-id'])
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Session expired or invalid!');
    });

    test('should return 401 when no session cookie', async () => {
      const response = await request(app)
        .get('/api/auth/session')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'No active session!');
    });
  });
});