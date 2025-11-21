const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database setup with error handling
if (process.env.NODE_ENV !== 'test') {
  const db = require("./app/models");
  
  console.log('🚀 Starting application in', process.env.NODE_ENV, 'mode');
  
  const syncOptions = process.env.NODE_ENV === 'production' 
    ? { force: false }
    : { force: true };

  // Connect to database
  const initDatabase = async () => {
    try {
      await db.sequelize.authenticate();
      console.log('✅ Database connection established successfully.');
      
      await db.sequelize.sync(syncOptions);
      console.log('✅ Database synchronized successfully');
      
      // Initialize roles if needed
      if (syncOptions.force) {
        const Role = db.role;
        await Role.findOrCreate({ where: { id: 1 }, defaults: { name: "user" } });
        await Role.findOrCreate({ where: { id: 2 }, defaults: { name: "admin" } });
        console.log('✅ Default roles initialized');
      }
    } catch (error) {
      console.error('❌ Database initialization failed:', error.message);
      console.log('⚠️  Continuing without database...');
    }
  };

  // Start database connection after a short delay
  setTimeout(initDatabase, 3000);
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK",
    service: "JWT Auth API",
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    deployment: "GitHub Runner",
    message: "Service is healthy and running"
  });
});

// Main endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "🎉 JWT Authentication API - Successfully Deployed on GitHub Runner",
    version: "1.0.0",
    environment: process.env.NODE_ENV || 'development',
    status: "Operational",
    deployment: {
      platform: "GitHub Actions Runner",
      status: "Running",
      timestamp: new Date().toISOString()
    },
    endpoints: {
      health: "GET /health",
      auth: {
        signup: "POST /api/auth/signup",
        signin: "POST /api/auth/signin", 
        refresh: "POST /api/auth/refresh",
        logout: "POST /api/auth/logout"
      },
      protected: {
        user: "GET /api/test/user",
        admin: "GET /api/test/admin"
      }
    }
  });
});

// API routes
require('./app/routes/auth.routes')(app);
require('./app/routes/user.routes')(app);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: "Route not found",
    path: req.path,
    suggestion: "Check / for available endpoints"
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ 
    error: "Internal server error",
    message: process.env.NODE_ENV === 'production' ? null : err.message
  });
});

const PORT = process.env.PORT || 8080;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎉 Server is running on port ${PORT}`);
  console.log(`🏥 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`📚 API documentation: http://0.0.0.0:${PORT}/`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🚀 Deployment: GitHub Runner`);
});

module.exports = server;