const request = require('supertest');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8080';

describe('Smoke Tests - Basic API Functionality', () => {
  // Тест 1: Проверка здоровья приложения
  it('health check should return 200', async () => {
    const response = await request(BASE_URL).get('/health');
    expect(response.status).toBe(200);
  });

  // Тест 2: Проверка главной страницы
  it('root endpoint should return 200', async () => {
    const response = await request(BASE_URL).get('/');
    expect(response.status).toBe(200);
  });

  // Тест 3: Проверка публичного маршрута
  it('public route should return 200', async () => {
    const response = await request(BASE_URL).get('/api/test/all');
    expect(response.status).toBe(200);
  });

  // Тест 4: Регистрация пользователя
  it('should register a user', async () => {
    const userData = {
      username: `smoketest_${Date.now()}`,
      email: `smoke_${Date.now()}@example.com`,
      password: 'password123'
    };

    const response = await request(BASE_URL)
      .post('/api/auth/signup')
      .send(userData);

    expect(response.status).toBe(200);
  });

  // Тест 5: Вход пользователя
  it('should sign in a user', async () => {
    const userData = {
      username: `signintest_${Date.now()}`,
      email: `signin_${Date.now()}@example.com`,
      password: 'password123'
    };

    // Регистрация
    await request(BASE_URL)
      .post('/api/auth/signup')
      .send(userData);

    // Вход
    const response = await request(BASE_URL)
      .post('/api/auth/signin')
      .send({
        username: userData.username,
        password: userData.password
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
  });
});3454657