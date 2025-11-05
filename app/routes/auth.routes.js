const authJwt = require("../middleware/authJwt");
const verifySignUp = require("../middleware/verifySignUp");
const controller = require("../controllers/auth.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    res.header(
      "Access-Control-Allow-Credentials",
      "true"
    );
    next();
  });

  app.post(
    "/api/auth/signup",
    [
      verifySignUp.checkDuplicateUsernameOrEmail,
      verifySignUp.checkRolesExisted
    ],
    controller.signup
  );

  app.post("/api/auth/signin", controller.signin);

  app.post("/api/auth/refresh", controller.refreshToken);

  app.post("/api/auth/logout", [authJwt.verifyHybridToken], controller.logout);

  app.get("/api/auth/session", controller.checkSession);
};