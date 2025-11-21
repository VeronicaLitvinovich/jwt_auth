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

  const initDatabase = async () => {
    try {
      await db.sequelize.authenticate();
      console.log('✅ Database connection established successfully.');
      
      await db.sequelize.sync(syncOptions);
      console.log('✅ Database synchronized successfully');
      
      if (syncOptions.force) {
        const Role = db.role;
        await Role.findOrCreate({ where: { id: 1 }, defaults: { name: "user" } });
        await Role.findOrCreate({ where: { id: 2 }, defaults: { name: "admin" } });
        console.log('✅ Default roles initialized');
      }
    } catch (error) {
      console.error('❌ Database initialization failed:', error.message);
      errorCount++;
    }
  };

  setTimeout(initDatabase, 2000);
}

// Enhanced health check with metrics
app.get("/health", (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  res.status(200).json({ 
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
    }
  });
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
    endpoints: {
      health: "GET /health",
      metrics: "GET /metrics",
      auth: {
        signup: "POST /api/auth/signup",
        signin: "POST /api/auth/signin", 
        refresh: "POST /api/auth/refresh",
        logout: "POST /api/auth/logout"
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
  res.status(500).json({ 
    error: "Internal server error",
    message: process.env.NODE_ENV === 'production' ? null : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: "Route not found",
    path: req.path
  });
});

const PORT = process.env.PORT || 8080;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎉 Server is running on port ${PORT}`);
  console.log(`🏥 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`📊 Metrics: http://0.0.0.0:${PORT}/metrics`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🚀 Deployment: Full CI/CD Pipeline`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = server;