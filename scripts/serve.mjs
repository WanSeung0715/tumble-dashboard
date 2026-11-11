import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const publicDir = path.resolve(import.meta.dirname, "../public");
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png"
};

function send(res, status, type, body) {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}

function sendNotFound(res) {
  send(res, 404, "text/html; charset=utf-8", fs.readFileSync(path.join(publicDir, "404.html")));
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(req.url.split("?")[0]);
  } catch {
    sendNotFound(res);
    return;
  }

  if (pathname.startsWith("/api/")) {
    send(res, 404, "application/json; charset=utf-8", JSON.stringify({ error: "이 서버는 화면 파일만 보냅니다. 화면은 public/config.js의 apiBaseUrl로 API 서버를 직접 부릅니다." }));
    return;
  }

  const filePath = path.resolve(publicDir, "." + (pathname === "/" ? "/index.html" : pathname));
  if (!filePath.startsWith(publicDir + path.sep)) {
    sendNotFound(res);
    return;
  }

  fs.readFile(filePath, (error, body) => {
    if (error) {
      sendNotFound(res);
      return;
    }
    send(res, 200, types[path.extname(filePath)] || "text/plain; charset=utf-8", body);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log("http://127.0.0.1:" + server.address().port);
});