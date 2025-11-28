const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const db = require("./app/models");

const app = express();

// Упрощенная CORS конфигурация
app.use(cors({
  origin: true, // Разрешаем все origins в development
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Метрики
let requestCount = 0;
let errorCount = 0;

app.use((req, res, next) => {
  requestCount++;
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Инициализация ролей
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
    }
    console.log('✅ Role initialization completed');
  } catch (error) {
    console.error('❌ Role initialization failed:', error.message);
  }
};

// Инициализация базы данных
const initDatabase = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Синхронизация без force в production
    await db.sequelize.sync({ 
      force: process.env.NODE_ENV === 'test' // Только в тестах сбрасываем БД
    });
    
    await initializeRoles();
    console.log('🎉 Database initialization completed');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.error('Full error:', error);
  }
};

// Инициализация БД с задержкой
setTimeout(initDatabase, 3000);

// Health endpoint
app.get("/health", async (req, res) => {
  try {
    await db.sequelize.authenticate();
    res.json({
      status: "OK",
      service: "JWT Auth API",
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      database: "Connected"
    });
  } catch (err) {
    res.status(503).json({
      status: "ERROR",
      database: `Error: ${err.message}`
    });
  }
});

// Основные маршруты
app.get("/", (req, res) => {
  res.json({ 
    message: "🚀 JWT Authentication API", 
    environment: process.env.NODE_ENV,
    status: "running"
  });
});

// Подключаем маршруты
require('./app/routes/auth.routes')(app);
require('./app/routes/user.routes')(app);

// Обработка 404
app.use((req, res) => {
  res.status(404).json({ 
    error: "Route not found", 
    path: req.path, 
    method: req.method 
  });
});

// Обработка ошибок
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
});

module.exports = app;