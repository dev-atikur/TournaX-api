function getPathname(req) {
  return (req.url || "/").split("?")[0];
}

function getQuery(req) {
  const queryString = (req.url || "").split("?")[1] || "";
  const params = new URLSearchParams(queryString);
  const query = {};
  for (const [key, value] of params.entries()) {
    query[key] = value;
  }
  return query;
}

function matchRoute(pathname, pattern) {
  const pathParts = pathname.split("/").filter(Boolean);
  const patternParts = pattern.split("/").filter(Boolean);
  if (pathParts.length !== patternParts.length) return null;

  const params = {};
  for (let i = 0; i < patternParts.length; i += 1) {
    if (patternParts[i].startsWith(":")) {
      params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}


module.exports = { getPathname, getQuery, matchRoute };