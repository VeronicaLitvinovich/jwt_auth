const request = require('supertest');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8080';

describe('Basic API Tests', () => {
  test('Health check should work', async () => {
    const response = await request(BASE_URL).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status');
  });

  test('Root endpoint should work', async () => {
    const response = await request(BASE_URL).get('/');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
  });

  test('Public endpoint should be accessible', async () => {
    const response = await request(BASE_URL).get('/api/test/all');
    expect(response.status).toBe(200);
  });
});