const { parse } = require('pg-connection-string');

let dbConfig = {};

if (process.env.DATABASE_URL) {
  try {
    const parsed = parse(process.env.DATABASE_URL);
    console.log('🔧 Using DATABASE_URL configuration');
    
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
      },
      logging: process.env.NODE_ENV === 'development' ? console.log : false
    };
  } catch (error) {
    console.error('❌ Error parsing DATABASE_URL:', error);
  }
} else {
  console.log('🔧 Using default database configuration');
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
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  };
}

console.log('🔧 Database config:', {
  host: dbConfig.HOST,
  user: dbConfig.USER,
  database: dbConfig.DB,
  ssl: dbConfig.dialectOptions?.ssl
});

module.exports = dbConfig;