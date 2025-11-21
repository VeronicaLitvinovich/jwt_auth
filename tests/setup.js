
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'test_lab4db';
process.env.DB_USER = 'test_adminname';
process.env.DB_PASSWORD = 'test_1234password';

jest.setTimeout(30000);

afterAll(async () => {
});