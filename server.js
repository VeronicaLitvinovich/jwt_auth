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
const initializeRoles = async () => {
  try {
    const Role = db.role;
    
    if (!Role) {
      console.error('❌ Role model is not available');
      return;
    }

    const rolesToCreate = [
      { id: 1, name: "user" },
      { id: 2, name: "admin" }
    ];
    
    for (const roleData of rolesToCreate) {
      try {
        const [role, created] = await Role.findOrCreate({
          where: { id: roleData.id },
          defaults: roleData
        });
        if (created) {
          console.log(`✅ Created role: ${roleData.name}`);
        } else {
          console.log(`ℹ️ Role already exists: ${roleData.name}`);
        }
      } catch (error) {
        console.error(`❌ Error creating role ${roleData.name}:`, error.message);
      }
    }
    console.log('✅ Role initialization completed');
  } catch (error) {
    console.error('❌ Role initialization failed:', error.message);
  }
};

// Database initialization
const initDatabase = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Sync with force only in test environment
    const forceSync = process.env.FORCE_DB_SYNC === 'true' || process.env.NODE_ENV === 'test';
    await db.sequelize.sync({ force: forceSync });
    
    await initializeRoles();
    console.log('🎉 Database initialization completed');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
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