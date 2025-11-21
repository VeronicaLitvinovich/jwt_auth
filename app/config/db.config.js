const { parse } = require('pg-connection-string');

let dbConfig = {};

if (process.env.DATABASE_URL) {
  const parsed = parse(process.env.DATABASE_URL);
  dbConfig = {
    HOST: parsed.host,
    USER: parsed.user,
    PASSWORD: parsed.password,
    DB: parsed.database,
    dialect: "postgres",
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  };
} else {
  dbConfig = {
    HOST: process.env.DB_HOST || 'localhost',
    USER: process.env.DB_USER || 'test_adminname',
    PASSWORD: process.env.DB_PASSWORD || 'test_1234password',
    DB: process.env.DB_NAME || 'test_lab4db',
    dialect: "postgres",
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  };
}

module.exports = dbConfig;