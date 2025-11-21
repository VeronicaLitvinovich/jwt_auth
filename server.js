const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

const corsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:8081",
  credentials: true
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  const db = require("./app/models");
  const Role = db.role;

  const syncOptions = process.env.NODE_ENV === 'production' 
    ? { force: false } 
    : { force: true };  

  const connectWithRetry = () => {
    db.sequelize.sync(syncOptions)
      .then(() => {
        console.log('✅ Database connected successfully');
        if (syncOptions.force) {
          initial();
        }
      })
      .catch(err => {
        console.error('❌ Database connection failed:', err.message);
        console.log('🔄 Retrying in 5 seconds...');
        setTimeout(connectWithRetry, 5000);
      });
  };

  connectWithRetry();

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
    message: "Test lab 4! Hybrid Auth - Railway Deployment",
    environment: process.env.NODE_ENV || 'development',
    database: process.env.DATABASE_URL ? "Connected" : "Not configured"
  });
});

require('./app/routes/auth.routes')(app);
require('./app/routes/user.routes')(app);

const PORT = process.env.PORT || 8080;

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
  module.exports = server;
} else {
  module.exports = app;
}