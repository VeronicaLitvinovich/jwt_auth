const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

const corsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  const db = require("./app/models");
  const Role = db.role;

  console.log('🚀 Starting application in', process.env.NODE_ENV, 'mode');
  console.log('🔧 Database config:', {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME
  });

  const syncOptions = process.env.NODE_ENV === 'production' 
    ? { force: false }
    : { force: true };

  const connectWithRetry = () => {
    db.sequelize.authenticate()
      .then(() => {
        console.log('✅ Database connection established successfully.');
        return db.sequelize.sync(syncOptions);
      })
      .then(() => {
        console.log('✅ Database synchronized successfully');
        if (syncOptions.force) {
          initializeRoles();
        }
      })
      .catch(err => {
        console.error('❌ Database connection failed:', err.message);
        console.log('🔄 Retrying in 3 seconds...');
        setTimeout(connectWithRetry, 3000);
      });
  };

  setTimeout(() => {
    connectWithRetry();
  }, 2000);

  function initializeRoles() {
    Role.findOrCreate({
      where: { id: 1 },
      defaults: { name: "user" }
    });
    Role.findOrCreate({
      where: { id: 2 },
      defaults: { name: "admin" }
    });
    console.log('✅ Default roles initialized');
  }
}

app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK",
    service: "JWT Auth API",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    github_runner: true
  });
});

app.get("/", (req, res) => {
  res.json({ 
    message: "🚀 JWT Authentication API - Deployed on GitHub Runner",
    version: "1.0.0",
    environment: process.env.NODE_ENV,
    status: "Operational",
    endpoints: {
      health: "/health",
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

require('./app/routes/auth.routes')(app);
require('./app/routes/user.routes')(app);

app.use((req, res) => {
  res.status(404).json({ 
    error: "Route not found",
    path: req.path
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message 
  });
});

const PORT = process.env.PORT || 8080;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎉 Server is running on port ${PORT}`);
  console.log(`🏥 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`📚 API documentation: http://0.0.0.0:${PORT}/`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});

module.exports = server;