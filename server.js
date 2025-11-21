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

  console.log('🔧 Environment:', process.env.NODE_ENV);
  console.log('🔧 Database URL:', process.env.DATABASE_URL ? 'Present' : 'Not present');
  console.log('🔧 DB Host from config:', process.env.DB_HOST);


  const syncOptions = process.env.NODE_ENV === 'production' 
    ? { force: false }  
    : { force: true };  

  const connectWithRetry = () => {
    console.log('🔄 Attempting to connect to database...');
    
    db.sequelize.authenticate()
      .then(() => {
        console.log('✅ Database connection established successfully.');
        
        return db.sequelize.sync(syncOptions);
      })
      .then(() => {
        console.log('✅ Database synchronized successfully');
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

  setTimeout(() => {
    connectWithRetry();
  }, 2000); 

  function initial() {
    Role.findOrCreate({
      where: { id: 1 },
      defaults: { name: "user" }
    }).then(([role, created]) => {
      if (created) console.log('✅ Created user role');
    });
    
    Role.findOrCreate({
      where: { id: 2 },
      defaults: { name: "admin" }
    }).then(([role, created]) => {
      if (created) console.log('✅ Created admin role');
    });
  }
}

app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    message: "Service is running"
  });
});

app.get("/", (req, res) => {
  res.json({ 
    message: "Test lab 4! Hybrid Auth - Railway Deployment",
    environment: process.env.NODE_ENV || 'development',
    status: "Running successfully"
  });
});

require('./app/routes/auth.routes')(app);
require('./app/routes/user.routes')(app);

const PORT = process.env.PORT || 8080;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`📍 Health check available at: http://0.0.0.0:${PORT}/health`);
});

module.exports = server;