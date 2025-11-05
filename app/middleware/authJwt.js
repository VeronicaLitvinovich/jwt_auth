const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");
const db = require("../models");
const User = db.user;
const Op = db.Sequelize.Op; 

verifyHybridToken = async (req, res, next) => {
  let token = req.headers["x-access-token"];
  const sessionId = req.cookies ? req.cookies.sessionId : null;

  console.log("Session ID from cookie:", sessionId); 
  console.log("JWT Token from header:", token ? "Present" : "Not present"); 

  if (sessionId) {
    try {
      const user = await User.findOne({
        where: {
          sessionId: sessionId,
          sessionExpires: {
            [Op.gt]: new Date()
          }
        }
      });

      if (user) {
        console.log("User found by session:", user.id); 
        req.userId = user.id;
        return next();
      } else {
        console.log("Session not found or expired"); 
        res.clearCookie('sessionId');
      }
    } catch (error) {
      console.error("Session verification error:", error);
    }
  }

  if (token) {
    jwt.verify(token,
      config.secret,
      (err, decoded) => {
        if (err) {
          return res.status(401).send({
            message: "Unauthorized!",
          });
        }
        req.userId = decoded.id;
        next();
      });
  } else {
    return res.status(403).send({
      message: "No authentication provided!"
    });
  }
};

verifyToken = (req, res, next) => {
  let token = req.headers["x-access-token"];

  if (!token) {
    return res.status(403).send({
      message: "No token provided!"
    });
  }

  jwt.verify(token,
    config.secret,
    (err, decoded) => {
      if (err) {
        return res.status(401).send({
          message: "Unauthorized!",
        });
      }
      req.userId = decoded.id;
      next();
    });
};

verifySession = async (req, res, next) => {
  const sessionId = req.cookies ? req.cookies.sessionId : null;

  if (!sessionId) {
    return res.status(401).send({
      message: "No active session!"
    });
  }

  try {
    const user = await User.findOne({
      where: {
        sessionId: sessionId,
        sessionExpires: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      res.clearCookie('sessionId');
      return res.status(401).send({
        message: "Session expired!"
      });
    }

    req.userId = user.id;
    next();
  } catch (error) {
    res.status(500).send({
      message: "Session verification error!"
    });
  }
};

isAdmin = (req, res, next) => {
  User.findByPk(req.userId).then(user => {
    user.getRoles().then(roles => {
      for (let i = 0; i < roles.length; i++) {
        if (roles[i].name === "admin") {
          next();
          return;
        }
      }

      res.status(403).send({
        message: "Require Admin Role!"
      });
      return;
    });
  });
};

const authJwt = {
  verifyToken: verifyToken,
  verifySession: verifySession,
  verifyHybridToken: verifyHybridToken,
  isAdmin: isAdmin,
};
module.exports = authJwt;