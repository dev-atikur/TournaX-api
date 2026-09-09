const routes = async (req, res) => {
  const path = req.url.split("?")[0];
  console.log(path);
};


module.exports = routes;