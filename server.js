const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

let corsOptions = {
  origin: "http://localhost:8081",
  credentials: true
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  const db = require("./app/models");
  const Role = db.role;

  db.sequelize.sync({force: true}).then(() => {
    console.log('Drop and Resync Database with { force: true }');
    initial();
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
  res.json({ message: "Test lab 4! Hybrid Auth" });
});

require('./app/routes/auth.routes')(app);
require('./app/routes/user.routes')(app);

const PORT = process.env.PORT || 8080;

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
  });
  module.exports = server;
} else {
  module.exports = app; 
}