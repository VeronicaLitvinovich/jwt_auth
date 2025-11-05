module.exports = (sequelize, Sequelize) => {
  const User = sequelize.define("users", {
    username: {
      type: Sequelize.STRING
    },
    email: {
      type: Sequelize.STRING
    },
    password: {
      type: Sequelize.STRING
    },
    refreshToken: {
      type: Sequelize.STRING
    },
    sessionId: {
      type: Sequelize.STRING
    },
    sessionExpires: {
      type: Sequelize.DATE
    }
  });

  return User;
};