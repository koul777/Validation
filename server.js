const http = require("http");
const fs = require("fs");
const path = require("path");

const rootDir = __dirname;
const host = "127.0.0.1";
const port = Number(process.env.PORT || 8080);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      writeJson(res, 204, {});
      return;
    }

    const requestUrl = new URL(req.url, `http://${req.headers.host || `${host}:${port}`}`);
    if (req.method === "POST" && requestUrl.pathname === "/api/openai-response") {
      await handleOpenAiProxy(req, res);
      return;
    }

    if (req.method !== "GET") {
      writeJson(res, 405, { error: "Method not allowed" });
      return;
    }

    serveStaticFile(requestUrl.pathname, res);
  } catch (error) {
    writeJson(res, 500, { error: error.message || String(error) });
  }
});

async function handleOpenAiProxy(req, res) {
  const body = JSON.parse(await readRequestBody(req));
  const apiKey = String(body.apiKey || "").trim();
  const model = String(body.model || "gpt-5.2").trim();
  const instructions = String(body.instructions || "").trim();
  const input = String(body.input || "").trim();
  const maxOutputTokens = clamp(Number(body.maxOutputTokens || 3500), 500, 12000);

  if (!apiKey) {
    writeJson(res, 400, { error: "OpenAI API key is required." });
    return;
  }

  if (!input) {
    writeJson(res, 400, { error: "Input prompt is required." });
    return;
  }

  const upstream = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      instructions,
      input,
      max_output_tokens: maxOutputTokens,
      store: false,
    }),
  });

  const responseText = await upstream.text();
  res.writeHead(upstream.status, {
    "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(responseText);
}

function serveStaticFile(pathname, res) {
  const decodedPath = decodeURIComponent(pathname === "/" ? "/index.html" : pathname);
  const filePath = path.normalize(path.join(rootDir, decodedPath));
  const relative = path.relative(rootDir, filePath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    writeJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      writeJson(res, 404, { error: "Not found" });
      return;
    }

    const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    });
    res.end(content);
  });
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 2 * 1024 * 1024) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data || "{}"));
    req.on("error", reject);
  });
}

function writeJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  if (statusCode === 204) {
    res.end();
    return;
  }
  res.end(JSON.stringify(payload));
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

server.listen(port, host, () => {
  console.log(`CSV AI validation app: http://${host}:${port}`);
});
