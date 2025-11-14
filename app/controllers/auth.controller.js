const db = require("../models");
const config = require("../config/auth.config");
const User = db.user;
const Role = db.role;

const Op = db.Sequelize.Op;

let jwt = require("jsonwebtoken");
let bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

exports.signup = (req, res) => {
  User.create({
    username: req.body.username,
    email: req.body.email,
    password: bcrypt.hashSync(req.body.password, 8)
  })
    .then(user => {
      if (req.body.roles) {
        Role.findAll({
          where: {
            name: {
              [Op.or]: req.body.roles
            }
          }
        }).then(roles => {
          user.setRoles(roles).then(() => {
            res.send({ message: "User registered successfully!" });
          });
        });
      } else {
        user.setRoles([1]).then(() => {
          res.send({ message: "User registered successfully!" });
        });
      }
    })
    .catch(err => {
      res.status(500).send({ message: err.message });
    });
};

exports.signin = (req, res) => {
  User.findOne({
    where: {
      username: req.body.username
    }
  })
    .then(user => {
      if (!user) {
        return res.status(404).send({ message: "User Not found." });
      }

      var passwordIsValid = bcrypt.compareSync(
        req.body.password,
        user.password
      );

      if (!passwordIsValid) {
        return res.status(401).send({
          accessToken: null,
          message: "Invalid Password!"
        });
      }

      const accessToken = jwt.sign({ id: user.id },
        config.secret,
        {
          algorithm: 'HS256',
          allowInsecureKeySizes: true,
          expiresIn: 900, 
        });

      const refreshToken = jwt.sign({ id: user.id },
        config.secret,
        {
          algorithm: 'HS256',
          allowInsecureKeySizes: true,
          expiresIn: 180, 
        });

      const sessionId = uuidv4();
      const sessionExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); 

      user.update({
        refreshToken: refreshToken,
        sessionId: sessionId,
        sessionExpires: sessionExpires
      }).then(() => {
        var authorities = [];
        user.getRoles().then(roles => {
          for (let i = 0; i < roles.length; i++) {
            authorities.push("ROLE_" + roles[i].name.toUpperCase());
          }
          
          res.cookie('sessionId', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 
          });

          res.status(200).send({
            id: user.id,
            username: user.username,
            email: user.email,
            roles: authorities,
            accessToken: accessToken,
            refreshToken: refreshToken,
            sessionId: sessionId
          });
        });
      });
    })
    .catch(err => {
      res.status(500).send({ message: err.message });
    });
};

exports.refreshToken = (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(403).send({ message: "Refresh Token is required!" });
  }

  jwt.verify(refreshToken, config.secret, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Invalid refresh token!" });
    }

    const userId = decoded.id;

    User.findByPk(userId).then(user => {
      if (!user) {
        return res.status(404).send({ message: "User not found!" });
      }

      if (user.refreshToken !== refreshToken) {
        return res.status(403).send({ message: "Refresh token doesn't match!" });
      }

      const newAccessToken = jwt.sign({ id: user.id },
        config.secret,
        {
          algorithm: 'HS256',
          allowInsecureKeySizes: true,
          expiresIn: 900, 
        });

      const newRefreshToken = jwt.sign({ id: user.id },
        config.secret,
        {
          algorithm: 'HS256',
          allowInsecureKeySizes: true,
          expiresIn: 180, 
        });

      user.update({
        refreshToken: newRefreshToken  
      }).then(() => {
        res.status(200).send({
          accessToken: newAccessToken,   
          refreshToken: newRefreshToken  
        });
      });
    });
  });
};

exports.logout = (req, res) => {
  const userId = req.userId;

  User.findByPk(userId).then(user => {
    if (user) {
      user.update({
        refreshToken: null,
        sessionId: null,
        sessionExpires: null
      }).then(() => {
        res.clearCookie('sessionId');
        res.status(200).send({ message: "Logged out successfully!" });
      });
    } else {
      res.status(404).send({ message: "User not found!" });
    }
  }).catch(err => {
    res.status(500).send({ message: err.message });
  });
};

exports.checkSession = (req, res) => {
  const sessionId = req.cookies.sessionId;

  if (!sessionId) {
    return res.status(401).send({ message: "No active session!" });
  }

  User.findOne({
    where: {
      sessionId: sessionId,
      sessionExpires: {
        [Op.gt]: new Date()
      }
    }
  }).then(user => {
    if (!user) {
      res.clearCookie('sessionId');
      return res.status(401).send({ message: "Session expired or invalid!" });
    }

    var authorities = [];
    user.getRoles().then(roles => {
      for (let i = 0; i < roles.length; i++) {
        authorities.push("ROLE_" + roles[i].name.toUpperCase());
      }
      
      res.status(200).send({
        id: user.id,
        username: user.username,
        email: user.email,
        roles: authorities,
        sessionValid: true
      });
    });
  }).catch(err => {
    res.status(500).send({ message: err.message });
  });
};