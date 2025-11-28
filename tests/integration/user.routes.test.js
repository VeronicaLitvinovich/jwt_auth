const request = require('supertest');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8080';

describe('User Routes Integration Tests', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Создаем пользователя для тестов
    const userData = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'password123'
    };

    const signupResponse = await request(BASE_URL)
      .post('/api/auth/signup')
      .send(userData);

    userId = signupResponse.body.id;

    const signinResponse = await request(BASE_URL)
      .post('/api/auth/signin')
      .send({
        username: userData.username,
        password: userData.password
      });

    authToken = signinResponse.body.accessToken;
  });

  describe('GET /api/test/all', () => {
    it('should return public content', async () => {
      const response = await request(BASE_URL)
        .get('/api/test/all');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Public Content.');
    });
  });

  describe('GET /api/test/user', () => {
    it('should return user content for authenticated user', async () => {
      const response = await request(BASE_URL)
        .get('/api/test/user')
        .set('x-access-token', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'User Content.');
    });

    it('should return 401 for missing token', async () => {
      const response = await request(BASE_URL)
        .get('/api/test/user');

      expect(response.status).toBe(401);
    });
  });
});