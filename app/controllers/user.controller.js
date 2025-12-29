exports.allAccess = (req, res) => {
  res.status(200).send("update version");
};

exports.userBoard = (req, res) => {
  res.status(200).send("Test User lab4.");
};

exports.adminBoard = (req, res) => {
  res.status(200).send("Test Admin lab4.");
};

