const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
});

const corsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:8081",
  credentials: true
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception thrown:', error);
  process.exit(1);
});

if (process.env.NODE_ENV !== 'test') {
  const db = require("./app/models");
  const Role = db.role;

  const syncOptions = process.env.NODE_ENV === 'production' 
    ? { force: false, alter: true }  
    : { force: true };  

  db.sequelize.sync(syncOptions)
    .then(() => {
      console.log(`Database synced in ${process.env.NODE_ENV} mode`);
      if (syncOptions.force) {
        initial();
      }
    })
    .catch(err => {
      console.error('Database sync failed:', err);
    });

  function initial() {
    Role.findOrCreate({
      where: { id: 1 },
      defaults: { name: "user" }
    });
    Role.findOrCreate({
      where: { id: 2 },
      defaults: { name: "admin" }
    });
  }
}

app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get("/", (req, res) => {
  res.json({ 
    message: "Test lab 4! Hybrid Auth - CI/CD Demo",
    environment: process.env.NODE_ENV || 'development',
    version: "1.0.0"
  });
});

require('./app/routes/auth.routes')(app);
require('./app/routes/user.routes')(app);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message 
  });
});

const PORT = process.env.PORT || 8080;

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
  
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
    });
  });

  module.exports = server;
} else {
  module.exports = app;
}