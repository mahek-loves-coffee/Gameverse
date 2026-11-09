export function toPostgres(sql) {
  let text = sql
    .replace(/username\s*=\s*\?\s+COLLATE\s+NOCASE/gi, "LOWER(username) = LOWER(?)")
    .replace(/username\s+LIKE\s+\?\s+COLLATE\s+NOCASE/gi, "username ILIKE ?")
    .replace(/ORDER BY\s+u\.username\s+COLLATE\s+NOCASE/gi, "ORDER BY LOWER(u.username)")
    .replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, "INSERT INTO");
  let index = 0;
  text = text.replace(/\?/g, () => `$${++index}`);
  if (/INSERT OR IGNORE/i.test(sql)) text = `${text.trim().replace(/;$/, "")} ON CONFLICT DO NOTHING`;
  return text;
}
