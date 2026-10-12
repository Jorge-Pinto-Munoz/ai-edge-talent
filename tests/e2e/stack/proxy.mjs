// Mini "Kong": /rest/v1 → PostgREST, /auth/v1 → GoTrue (solo para pruebas locales).
import http from "node:http";
const routes = [["/rest/v1", 3001], ["/auth/v1", 9999], ["/storage/v1", 5000]];
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-upsert, cache-control", "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS" };
http.createServer((req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }
  const r = routes.find(([p]) => req.url.startsWith(p));
  if (!r) { res.writeHead(404); return res.end(); }
  const headers = { ...req.headers, host: "127.0.0.1" };
  const up = http.request({ host: "127.0.0.1", port: r[1], path: req.url.slice(r[0].length) || "/", method: req.method, headers }, (u) => { res.writeHead(u.statusCode, { ...u.headers, ...CORS }); u.pipe(res); });
  up.on("error", (e) => { res.writeHead(502); res.end(String(e)); });
  req.pipe(up);
}).listen(54321, "127.0.0.1", () => console.log("proxy :54321"));
