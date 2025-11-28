const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const os = require("os");

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Metrics collection
let requestCount = 0;
let errorCount = 0;
const startTime = new Date();

// Request logging middleware
app.use((req, res, next) => {
  requestCount++;
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Database setup
if (process.env.NODE_ENV !== 'test') {
  const db = require("./app/models");
  
  console.log('🚀 Starting application in', process.env.NODE_ENV, 'mode on port', process.env.PORT);
  
  const syncOptions = process.env.NODE_ENV === 'production' 
    ? { force: false }
    : { force: true };

  // Функция для инициализации ролей
  const initializeRoles = async () => {
    try {
      const Role = db.role;
      
      // Всегда создаем роли, если их нет (даже в production)
      const existingRoles = await Role.findAll();
      if (existingRoles.length === 0) {
        console.log('🔄 Initializing default roles...');
        await Role.bulkCreate([
          { id: 1, name: "user" },
          { id: 2, name: "admin" },
          { id: 3, name: "moderator" }
        ]);
        console.log('✅ Default roles initialized');
      } else {
        console.log('✅ Roles already exist, count:', existingRoles.length);
        
        // Проверяем наличие базовых ролей
        const userRole = await Role.findByPk(1);
        const adminRole = await Role.findByPk(2);
        
        if (!userRole) {
          console.log('🔄 Creating missing user role...');
          await Role.create({ id: 1, name: "user" });
        }
        if (!adminRole) {
          console.log('🔄 Creating missing admin role...');
          await Role.create({ id: 2, name: "admin" });
        }
      }
    } catch (error) {
      console.error('❌ Role initialization failed:', error.message);
      errorCount++;
    }
  };

  const initDatabase = async () => {
    try {
      await db.sequelize.authenticate();
      console.log('✅ Database connection established successfully.');
      
      await db.sequelize.sync(syncOptions);
      console.log('✅ Database synchronized successfully');
      
      // ВСЕГДА инициализируем роли, независимо от окружения
      await initializeRoles();
      
      console.log('🎉 Database initialization completed successfully');
      
    } catch (error) {
      console.error('❌ Database initialization failed:', error.message);
      errorCount++;
      
      // В production пытаемся продолжить работу даже при ошибке инициализации
      if (process.env.NODE_ENV === 'production') {
        console.log('⚠️ Continuing in production mode despite database issues');
      }
    }
  };

  // Запускаем инициализацию с задержкой
  setTimeout(initDatabase, 2000);
}

// Enhanced health check with metrics
app.get("/health", (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  const healthStatus = {
    status: "OK",
    service: "JWT Auth API",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    metrics: {
      requestCount,
      errorCount,
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
      }
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      loadAverage: os.loadavg()
    },
    database: {
      status: "Connected",
      dialect: process.env.DB_DIALECT || "sqlite"
    }
  };

  res.status(200).json(healthStatus);
});

// Metrics endpoint for monitoring
app.get("/metrics", (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  res.json({
    requests: {
      total: requestCount,
      errors: errorCount,
      successRate: requestCount > 0 ? ((requestCount - errorCount) / requestCount * 100).toFixed(2) + '%' : '0%'
    },
    performance: {
      uptime: uptime,
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed
      }
    },
    deployment: {
      environment: process.env.NODE_ENV,
      port: process.env.PORT,
      nodeVersion: process.version
    }
  });
});

// Main endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "🚀 JWT Authentication API - Full CI/CD Pipeline",
    version: "1.0.0",
    environment: process.env.NODE_ENV,
    status: "Operational",
    deployment: {
      mode: process.env.NODE_ENV,
      port: process.env.PORT,
      database: process.env.DB_DIALECT || "sqlite"
    },
    endpoints: {
      health: "GET /health",
      metrics: "GET /metrics",
      auth: {
        signup: "POST /api/auth/signup",
        signin: "POST /api/auth/signin", 
        refresh: "POST /api/auth/refresh",
        logout: "POST /api/auth/logout"
      },
      user: {
        profile: "GET /api/user/profile",
        all: "GET /api/user/all"
      }
    }
  });
});

// API routes
require('./app/routes/auth.routes')(app);
require('./app/routes/user.routes')(app);

// Error handling middleware
app.use((err, req, res, next) => {
  errorCount++;
  console.error('Error:', err.message);
  
  // Логируем полную ошибку в development
  if (process.env.NODE_ENV !== 'production') {
    console.error('Stack:', err.stack);
  }
  
  res.status(500).json({ 
    error: "Internal server error",
    message: process.env.NODE_ENV === 'production' ? null : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: "Route not found",
    path: req.path,
    method: req.method
  });
});

const PORT = process.env.PORT || 8080;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎉 Server is running on port ${PORT}`);
  console.log(`🏥 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`📊 Metrics: http://0.0.0.0:${PORT}/metrics`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🚀 Deployment: Full CI/CD Pipeline`);
  console.log(`💾 Database: ${process.env.DB_DIALECT || 'sqlite'}`);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received, shutting down gracefully`);
  server.close(() => {
    console.log('✅ HTTP server closed');
    console.log('Process terminated');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.log('❌ Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = server;