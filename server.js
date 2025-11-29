const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const db = require("./app/models");

const app = express();

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Metrics
let requestCount = 0;
let errorCount = 0;

app.use((req, res, next) => {
  requestCount++;
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Improved role initialization
// Улучшенная инициализация ролей
const initializeRoles = async () => {
  try {
    const Role = db.role;
    
    console.log('🔧 Starting role initialization...');
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    
    if (!Role) {
      console.error('❌ Role model is not available');
      return;
    }

    const rolesToCreate = [
      { id: 1, name: "user" },
      { id: 2, name: "admin" }
    ];
    
    let successCount = 0;
    for (const roleData of rolesToCreate) {
      try {
        console.log(`🔄 Processing role: ${roleData.name} (ID: ${roleData.id})`);
        const [role, created] = await Role.findOrCreate({
          where: { id: roleData.id },
          defaults: roleData
        });
        if (created) {
          console.log(`✅ Created role: ${roleData.name}`);
          successCount++;
        } else {
          console.log(`ℹ️ Role already exists: ${roleData.name}`);
          successCount++;
        }
      } catch (error) {
        console.error(`❌ Error creating role ${roleData.name}:`, error.message);
      }
    }
    
    if (successCount === rolesToCreate.length) {
      console.log('🎉 Role initialization completed successfully');
    } else {
      console.error(`⚠️ Role initialization partially completed: ${successCount}/${rolesToCreate.length} roles`);
    }
  } catch (error) {
    console.error('❌ Role initialization failed:', error.message);
    console.error('Full error:', error);
  }
};

// Улучшенная инициализация базы данных
const initDatabase = async () => {
  try {
    console.log('🔧 Starting database initialization...');
    console.log(`📊 NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`📊 DB_HOST: ${process.env.DB_HOST}`);
    console.log(`📊 DB_PORT: ${process.env.DB_PORT}`);
    console.log(`📊 DB_USER: ${process.env.DB_USER}`);
    console.log(`📊 DB_NAME: ${process.env.DB_NAME}`);
    console.log(`📊 PORT: ${process.env.PORT}`);
    
    // Проверяем наличие обязательных переменных
    if (!process.env.DB_HOST) {
      console.error('❌ DB_HOST is not set');
    }
    if (!process.env.DB_USER) {
      console.error('❌ DB_USER is not set');
    }
    
    await db.sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // В production используем безопасную синхронизацию
    const syncOptions = process.env.NODE_ENV === 'production' 
      ? { alter: true } // Безопасное изменение структуры
      : { force: false }; // В development/test
    
    await db.sequelize.sync(syncOptions);
    console.log('✅ Database synchronized');
    
    await initializeRoles();
    console.log('🎉 Database initialization completed');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.error('Full error:', error);
    
    // В production продолжаем работу даже при ошибке БД
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️ Continuing in production mode despite DB issues');
    }
  }
};

// Initialize DB with delay
setTimeout(initDatabase, 3000);

// Health endpoint
app.get("/health", async (req, res) => {
  const healthcheck = {
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "JWT Auth API",
    environment: process.env.NODE_ENV,
    nodeVersion: process.version,
    database: {
      dialect: process.env.DB_DIALECT,
      host: process.env.DB_HOST,
      status: "Unknown"
    }
  };

  try {
    await db.sequelize.authenticate();
    healthcheck.database.status = "Connected";
    
    if (process.env.DB_DIALECT === 'postgres') {
      const [result] = await db.sequelize.query("SELECT version();");
      healthcheck.database.version = result[0]?.version || "Unknown";
    }
  } catch (err) {
    healthcheck.status = "ERROR";
    healthcheck.database.status = `Error: ${err.message}`;
    return res.status(503).json(healthcheck);
  }

  res.json(healthcheck);
});

// Main endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "🚀 JWT Authentication API", 
    environment: process.env.NODE_ENV,
    status: "running"
  });
});

// Routes
require('./app/routes/auth.routes')(app);
require('./app/routes/user.routes')(app);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: "Route not found", 
    path: req.path, 
    method: req.method 
  });
});

// Error handler
app.use((err, req, res, next) => {
  errorCount++;
  console.error('Error:', err.message);
  res.status(500).json({ 
    error: "Internal server error", 
    message: err.message 
  });
});

const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎉 Server running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV}`);
});

// Improved graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n📢 ${signal} received, shutting down gracefully`);
  console.log(`📊 Current time: ${new Date().toISOString()}`);
  console.log(`🔍 NODE_ENV: ${process.env.NODE_ENV}`);
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    // In test environment, don't exit immediately
    if (process.env.NODE_ENV === 'test') {
      console.log('ℹ️ Test environment - delayed exit');
      setTimeout(() => {
        console.log('🧪 Test cleanup completed');
        process.exit(0);
      }, 2000);
    } else {
      process.exit(0);
    }
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.log('❌ Forced shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;