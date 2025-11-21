module.exports = {
  HOST: process.env.DB_HOST || 'localhost',
  USER: process.env.DB_USER || 'test_admin',
  PASSWORD: process.env.DB_PASSWORD || 'test_1234',
  DB: process.env.DB_NAME || 'test_lab4db',
  dialect: process.env.DB_DIALECT || 'postgres',
  storage: process.env.DB_STORAGE, // для SQLite
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};