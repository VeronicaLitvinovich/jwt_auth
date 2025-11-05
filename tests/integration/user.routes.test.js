const request = require('supertest');
const app = require('../../server');

jest.mock('../../app/middleware/authJwt', () => ({
  verifySession: jest.fn((req, res, next) => {
    const sessionId = req.cookies ? req.cookies.sessionId : null;
    
    if (sessionId === 'valid-session') {
      req.userId = 1;
      next();
    } else {
      res.status(401).send({ message: "No active session!" });
    }
  }),
  
  verifyToken: jest.fn((req, res, next) => {
    const token = req.headers['x-access-token'];
    
    if (token === 'valid-token') {
      req.userId = 1;
      next();
    } else {
      res.status(403).send({ message: "No token provided!" });
    }
  }),
  
  verifyHybridToken: jest.fn((req, res, next) => {
    const token = req.headers['x-access-token'];
    const sessionId = req.cookies ? req.cookies.sessionId : null;
    
    if (token === 'valid-token' || sessionId === 'valid-session') {
      req.userId = 1;
      next();
    } else {
      res.status(403).send({ message: "No authentication provided!" });
    }
  }),
  
  isAdmin: jest.fn((req, res, next) => {
    next();
  })
}));

jest.mock('../../app/controllers/user.controller', () => ({
  allAccess: jest.fn((req, res) => {
    res.status(200).send('Test info lab4.');
  }),
  userBoard: jest.fn((req, res) => {
    res.status(200).send('Test User lab4.');
  }),
  adminBoard: jest.fn((req, res) => {
    res.status(200).send('Test Admin lab4.');
  })
}));

describe('User Routes Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/test/all', () => {
    test('should return public content', async () => {
      const response = await request(app)
        .get('/api/test/all')
        .expect(200);

      expect(response.text).toBe('Test info lab4.');
    });
  });

  describe('GET /api/test/user', () => {
    test('should access user content with valid session', async () => {
      const response = await request(app)
        .get('/api/test/user')
        .set('Cookie', ['sessionId=valid-session'])
        .expect(200);

      expect(response.text).toBe('Test User lab4.');
    });

    test('should deny access without session', async () => {
      const response = await request(app)
        .get('/api/test/user')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'No active session!');
    });
  });

  describe('GET /api/test/user-token', () => {
    test('should access user content with valid token', async () => {
      const response = await request(app)
        .get('/api/test/user-token')
        .set('x-access-token', 'valid-token')
        .expect(200);

      expect(response.text).toBe('Test User lab4.');
    });

    test('should deny access without token', async () => {
      const response = await request(app)
        .get('/api/test/user-token')
        .expect(403);

      expect(response.body).toHaveProperty('message', 'No token provided!');
    });
  });

  describe('GET /api/test/admin', () => {
    test('should access admin content with valid session', async () => {
      const response = await request(app)
        .get('/api/test/admin')
        .set('Cookie', ['sessionId=valid-session'])
        .expect(200);

      expect(response.text).toBe('Test Admin lab4.');
    });

    test('should access admin content with valid token', async () => {
      const response = await request(app)
        .get('/api/test/admin')
        .set('x-access-token', 'valid-token')
        .expect(200);

      expect(response.text).toBe('Test Admin lab4.');
    });
  });
});