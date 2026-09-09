function setCookie(res, name, value, options = {}) {
  let cookie = `${name}=${encodeURIComponent(value)}`;

  if (options.httpOnly) cookie += "; HttpOnly";
  if (options.secure) cookie += "; Secure";
  if (options.path) cookie += `; Path=${options.path}`;
  if (options.maxAge !== undefined) {
    cookie += `; Max-Age=${options.maxAge}`;
  }
  if (options.sameSite) {
    cookie += `; SameSite=${options.sameSite}`;
  }

  const existingCookies = res.getHeader("Set-Cookie");

  const cookies = existingCookies
    ? Array.isArray(existingCookies)
      ? existingCookies
      : [existingCookies]
    : [];

  res.setHeader("Set-Cookie", [...cookies, cookie]);
}

function clearCookie(res, name) {
  const existing = res.getHeader("Set-Cookie");

  const cookies = existing
    ? Array.isArray(existing)
      ? existing
      : [existing]
    : [];

  let expiredCookie = `${name}=; Max-Age=0; HttpOnly; Path=/; SameSite=Strict`;

  if (process.env.NODE_ENV === "production") {
    expiredCookie += "; Secure";
  }

  res.setHeader("Set-Cookie", [...cookies, expiredCookie]);
}


module.exports = { setCookie, clearCookie };