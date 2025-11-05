const { authJwt } = require("../middleware");
const controller = require("../controllers/user.controller");

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

  app.get("/api/test/all", controller.allAccess);

  app.get(
    "/api/test/user",
    [authJwt.verifySession],
    controller.userBoard
  );

  app.get(
    "/api/test/user-session",
    [authJwt.verifySession],
    controller.userBoard
  );

  app.get(
    "/api/test/user-token",
    [authJwt.verifyToken],
    controller.userBoard
  );

  app.get(
    "/api/test/admin",
    [authJwt.verifyHybridToken, authJwt.isAdmin], 
    controller.adminBoard
  );

  app.get(
    "/api/test/admin-token",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.adminBoard
  );
};