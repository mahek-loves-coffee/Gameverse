export function isPrivateLanHost(hostname) {
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local")) return true;
  const octets = hostname.split(".").map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return octets[0] === 10 || (octets[0] === 192 && octets[1] === 168) || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31);
}

export function isAllowedDevelopmentOrigin(origin, nodeEnv = process.env.NODE_ENV) {
  if (nodeEnv === "production") return false;
  try {
    const url = new URL(origin);
    return url.protocol === "http:" && url.port === "5173" && isPrivateLanHost(url.hostname);
  } catch { return false; }
}
