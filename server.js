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

  db.sequelize.sync(syncOptions).then(() => {
    console.log(`Database synced with options:`, syncOptions);
    if (syncOptions.force) {
      initial();
    }
  });

  function initial() {
    Role.create({
      id: 1,
      name: "user"
    });
    Role.create({
      id: 2,
      name: "admin"
    });
  }
}

app.get("/", (req, res) => {
  res.json({ 
    message: "Test lab 4! Hybrid Auth",
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

require('./app/routes/auth.routes')(app);
require('./app/routes/user.routes')(app);

const PORT = process.env.PORT || 8080;

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
  module.exports = server;
} else {
  module.exports = app;
}