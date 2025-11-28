const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const os = require("os");

const db = require("./app/models");

const app = express();

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:8080",
      process.env.CLIENT_URL
    ].filter(Boolean);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'test') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token']
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Metrics collection
let requestCount = 0;
let errorCount = 0;

app.use((req, res, next) => {
  requestCount++;
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Roles initialization
const initializeRoles = async () => {
  try {
    const Role = db.role;
    const rolesToCreate = [
      { id: 1, name: "user" },
      { id: 2, name: "admin" }
    ];
    for (const roleData of rolesToCreate) {
      const [role, created] = await Role.findOrCreate({
        where: { id: roleData.id },
        defaults: roleData
      });
      if (created) console.log(`✅ Created role: ${roleData.name}`);
      else if (role.name !== roleData.name) {
        await role.update({ name: roleData.name });
        console.log(`✅ Updated role: ${roleData.name}`);
      }
    }
    console.log('✅ Role initialization completed');
  } catch (error) {
    console.error('❌ Role initialization failed:', error.message);
    throw error;
  }
};

// Database initialization
const initDatabase = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connection established');
    await db.sequelize.sync({ force: process.env.NODE_ENV !== 'production' });
    await initializeRoles();
    console.log('🎉 Database initialization completed');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️ Continuing in production mode despite DB issues');
    }
  }
};

// Run DB init with small delay
if (process.env.NODE_ENV !== 'test') {
  setTimeout(initDatabase, 2000);
}

// Health endpoint
app.get("/health", async (req, res) => {
  let dbStatus = "Unknown";
  try {
    await db.sequelize.authenticate();
    const tables = await db.sequelize.getQueryInterface().showAllTables();
    dbStatus = `Connected (${tables.length} tables)`;
  } catch (err) {
    dbStatus = `Error: ${err.message}`;
  }
  res.json({
    status: "OK",
    service: "JWT Auth API",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      dialect: process.env.DB_DIALECT || "sqlite",
      storage: process.env.DB_STORAGE
    }
  });
});

// Metrics endpoint
app.get("/metrics", (req, res) => {
  const uptime = process.uptime();
  const memory = process.memoryUsage();
  res.json({
    requests: { total: requestCount, errors: errorCount },
    performance: { uptime, memory },
    deployment: { environment: process.env.NODE_ENV, port: process.env.PORT, nodeVersion: process.version }
  });
});

// Main endpoint
app.get("/", (req, res) => {
  res.json({ message: "🚀 JWT Authentication API", environment: process.env.NODE_ENV });
});

// Routes
require('./app/routes/auth.routes')(app);
require('./app/routes/user.routes')(app);

// Error handling
app.use((err, req, res, next) => {
  errorCount++;
  console.error('Error:', err.message);
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);
  res.status(500).json({ error: "Internal server error", message: err.message });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Route not found", path: req.path, method: req.method });
});

const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎉 Server running on port ${PORT}`);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received, shutting down`);
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (err) => { console.error(err); process.exit(1); });
process.on('unhandledRejection', (reason) => { console.error(reason); process.exit(1); });

// Export app for testing
module.exports = app;
