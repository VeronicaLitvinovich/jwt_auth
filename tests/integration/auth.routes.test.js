const request = require('supertest');

// Используем базовый URL из переменных окружения
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8080';

describe('Auth Routes Integration Tests', () => {
  describe('POST /api/auth/signup', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: `testuser_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        password: 'password123'
      };

      const response = await request(BASE_URL)
        .post('/api/auth/signup')
        .send(userData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('username', userData.username);
      expect(response.body).toHaveProperty('email', userData.email);
    });

    it('should return 400 for duplicate username', async () => {
      const userData = {
        username: 'duplicateuser',
        email: 'duplicate@example.com',
        password: 'password123'
      };

      // Первая регистрация
      await request(BASE_URL)
        .post('/api/auth/signup')
        .send(userData);

      // Вторая попытка с тем же username
      const response = await request(BASE_URL)
        .post('/api/auth/signup')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Failed! Username is already in use!');
    });
  });

  describe('POST /api/auth/signin', () => {
    it('should authenticate user and return tokens', async () => {
      const userData = {
        username: `signinuser_${Date.now()}`,
        email: `signin_${Date.now()}@example.com`,
        password: 'password123'
      };

      // Сначала регистрируем пользователя
      await request(BASE_URL)
        .post('/api/auth/signup')
        .send(userData);

      // Затем пробуем войти
      const response = await request(BASE_URL)
        .post('/api/auth/signin')
        .send({
          username: userData.username,
          password: userData.password
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('username', userData.username);
      expect(response.body).toHaveProperty('accessToken');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(BASE_URL)
        .post('/api/auth/signin')
        .send({
          username: 'nonexistent',
          password: 'password123'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'User Not found.');
    });
  });
});