const request = require('supertest');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8080';

describe('Smoke Tests - Basic API Functionality', () => {
  it('health check should return 200', async () => {
    const response = await request(BASE_URL).get('/health');
    expect(response.status).toBe(200);
  });

  it('root endpoint should return 200', async () => {
    const response = await request(BASE_URL).get('/');
    expect(response.status).toBe(200);
  });

  it('public route should return 200', async () => {
    const response = await request(BASE_URL).get('/api/test/all');
    expect(response.status).toBe(200);
  });

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

  it('should sign in a user', async () => {
    const userData = {
      username: `signintest_${Date.now()}`,
      email: `signin_${Date.now()}@example.com`,
      password: 'password123'
    };

    await request(BASE_URL)
      .post('/api/auth/signup')
      .send(userData);

    const response = await request(BASE_URL)
      .post('/api/auth/signin')
      .send({
        username: userData.username,
        password: userData.password
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
  });
});