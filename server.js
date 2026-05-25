const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "db.json");
const PUBLIC_DIR = path.join(__dirname, "public");
const SECRET = process.env.JWT_SECRET || "focustask-local-secret";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function ensureDatabase() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [], tasks: [] }, null, 2));
  }
}

function readDb() {
  ensureDatabase();
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeDb(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Payload demasiado grande"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("JSON invalido"));
      }
    });
  });
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
  const [salt, expectedHash] = storedPassword.split(":");
  const actualHash = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(expectedHash, "hex"), actualHash);
}

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function signToken(user) {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    sub: user.id,
    name: user.name,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8
  }));
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

function verifyToken(token) {
  if (!token) return null;
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) return null;
  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (data.exp < Math.floor(Date.now() / 1000)) return null;
  return data;
}

function getAuthUser(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return verifyToken(token);
}

function cleanUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

function requireFields(payload, fields) {
  const missing = fields.filter(field => !String(payload[field] || "").trim());
  return missing.length ? `Faltan campos: ${missing.join(", ")}` : null;
}

async function handleApi(req, res) {
  try {
    if (req.url === "/api/register" && req.method === "POST") {
      const body = await parseBody(req);
      const missing = requireFields(body, ["name", "email", "password"]);
      if (missing) return sendJson(res, 400, { message: missing });

      const db = readDb();
      const email = body.email.trim().toLowerCase();
      if (db.users.some(user => user.email === email)) {
        return sendJson(res, 409, { message: "El correo ya esta registrado" });
      }

      const user = {
        id: crypto.randomUUID(),
        name: body.name.trim(),
        email,
        password: hashPassword(body.password)
      };
      db.users.push(user);
      writeDb(db);
      return sendJson(res, 201, { token: signToken(user), user: cleanUser(user) });
    }

    if (req.url === "/api/login" && req.method === "POST") {
      const body = await parseBody(req);
      const missing = requireFields(body, ["email", "password"]);
      if (missing) return sendJson(res, 400, { message: missing });

      const db = readDb();
      const user = db.users.find(item => item.email === body.email.trim().toLowerCase());
      if (!user || !verifyPassword(body.password, user.password)) {
        return sendJson(res, 401, { message: "Credenciales incorrectas" });
      }

      return sendJson(res, 200, { token: signToken(user), user: cleanUser(user) });
    }

    if (req.url === "/api/me" && req.method === "GET") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { message: "Token invalido o vencido" });
      const db = readDb();
      const user = db.users.find(item => item.id === auth.sub);
      if (!user) return sendJson(res, 404, { message: "Usuario no encontrado" });
      return sendJson(res, 200, { user: cleanUser(user) });
    }

    if (req.url === "/api/tasks" && req.method === "GET") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { message: "Token invalido o vencido" });
      const db = readDb();
      const tasks = db.tasks
        .filter(task => task.userId === auth.sub)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return sendJson(res, 200, { tasks });
    }

    if (req.url === "/api/tasks" && req.method === "POST") {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { message: "Token invalido o vencido" });
      const body = await parseBody(req);
      const missing = requireFields(body, ["title"]);
      if (missing) return sendJson(res, 400, { message: missing });

      const db = readDb();
      const task = {
        id: crypto.randomUUID(),
        userId: auth.sub,
        title: body.title.trim(),
        description: String(body.description || "").trim(),
        priority: body.priority || "Media",
        dueDate: body.dueDate || "",
        completed: false,
        createdAt: new Date().toISOString()
      };
      db.tasks.push(task);
      writeDb(db);
      return sendJson(res, 201, { task });
    }

    const taskMatch = req.url.match(/^\/api\/tasks\/([a-f0-9-]+)$/i);
    if (taskMatch && ["PUT", "DELETE"].includes(req.method)) {
      const auth = getAuthUser(req);
      if (!auth) return sendJson(res, 401, { message: "Token invalido o vencido" });
      const db = readDb();
      const index = db.tasks.findIndex(task => task.id === taskMatch[1] && task.userId === auth.sub);
      if (index === -1) return sendJson(res, 404, { message: "Tarea no encontrada" });

      if (req.method === "DELETE") {
        const [task] = db.tasks.splice(index, 1);
        writeDb(db);
        return sendJson(res, 200, { task });
      }

      const body = await parseBody(req);
      db.tasks[index] = {
        ...db.tasks[index],
        title: body.title !== undefined ? String(body.title).trim() : db.tasks[index].title,
        description: body.description !== undefined ? String(body.description).trim() : db.tasks[index].description,
        priority: body.priority || db.tasks[index].priority,
        dueDate: body.dueDate !== undefined ? body.dueDate : db.tasks[index].dueDate,
        completed: body.completed !== undefined ? Boolean(body.completed) : db.tasks[index].completed
      };
      writeDb(db);
      return sendJson(res, 200, { task: db.tasks[index] });
    }

    return sendJson(res, 404, { message: "Ruta no encontrada" });
  } catch (error) {
    return sendJson(res, 500, { message: error.message || "Error interno" });
  }
}

function serveStatic(req, res) {
  const requestPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      fs.readFile(path.join(PUBLIC_DIR, "index.html"), (fallbackError, fallback) => {
        if (fallbackError) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(200, { "Content-Type": MIME_TYPES[".html"] });
        res.end(fallback);
      });
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(content);
  });
}

ensureDatabase();

http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    handleApi(req, res);
    return;
  }
  serveStatic(req, res);
}).listen(PORT, () => {
  console.log(`FocusTask funcionando en http://localhost:${PORT}`);
});
