import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

const app = express();
app.use(helmet({ contentSecurityPolicy: false })); // allow inline scripts in this student project
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

// --- SQLite DB ---
const db = new Database(path.join(__dirname, "rewear.sqlite"));
db.pragma("journal_mode = WAL");

// schema (idempotent)
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  location TEXT,
  contact TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price REAL DEFAULT 0,
  tradeType TEXT NOT NULL CHECK(tradeType IN ('sale','exchange','free')),
  size TEXT,
  condition TEXT,
  categoryId INTEGER,
  location TEXT,
  imageUrl TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(userId) REFERENCES users(id),
  FOREIGN KEY(categoryId) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS favorites (
  userId INTEGER NOT NULL,
  postId INTEGER NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (userId, postId),
  FOREIGN KEY(userId) REFERENCES users(id),
  FOREIGN KEY(postId) REFERENCES posts(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fromUserId INTEGER NOT NULL,
  toUserId INTEGER NOT NULL,
  postId INTEGER,
  content TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(fromUserId) REFERENCES users(id),
  FOREIGN KEY(toUserId) REFERENCES users(id),
  FOREIGN KEY(postId) REFERENCES posts(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  isRead INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(userId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raterId INTEGER NOT NULL,
  rateeId INTEGER NOT NULL,
  stars INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),
  comment TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(raterId) REFERENCES users(id),
  FOREIGN KEY(rateeId) REFERENCES users(id)
);
`);

// --- DB migrations (safe, idempotent) ---
// IMPORTANT: run migrations AFTER schema creation, otherwise ALTER TABLE will fail on first run.
function ensureColumn(table, column, typeSql) {
  // If table doesn't exist yet, PRAGMA table_info returns empty; in that case do nothing.
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (cols.length === 0) return;
  if (!cols.includes(column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeSql}`).run();
  }
}
ensureColumn("users", "ratingAvg", "REAL NOT NULL DEFAULT 0");
ensureColumn("users", "ratingCount", "INTEGER NOT NULL DEFAULT 0");

const seedCategories = ["Men", "Women", "Kids", "Jackets", "Shoes", "Bags", "Accessories", "Jeans", "Dresses"];
const insCat = db.prepare("INSERT OR IGNORE INTO categories(name) VALUES(?)");
db.transaction(() => seedCategories.forEach(n => insCat.run(n)))();

// --- helpers ---
function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
}

function auth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// --- API ---
app.get("/api/health", (req,res)=>res.json({ok:true}));


// --- Image proxy (helps with hotlink-blocked images) ---
app.get("/api/image-proxy", async (req, res) => {
  try {
    const url = String(req.query.url || "");
    if (!url) return res.status(400).send("missing url");
    let parsed;
    try { parsed = new URL(url); } catch { return res.status(400).send("invalid url"); }
    if (!["http:", "https:"].includes(parsed.protocol)) return res.status(400).send("invalid protocol");

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);

    const r = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        // Some hosts block empty UA
        "User-Agent": "ReWear/1.0 (+image-proxy)"
      }
    });
    clearTimeout(t);

    if (!r.ok) return res.status(502).send("failed to fetch");
    const ct = r.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "public, max-age=86400");

    // Stream with a simple size limit (5MB)
    const MAX = 5 * 1024 * 1024;
    let total = 0;
    for await (const chunk of r.body) {
      total += chunk.length;
      if (total > MAX) {
        res.status(413).end();
        return;
      }
      res.write(chunk);
    }
    res.end();
  } catch (e) {
    return res.status(500).send("proxy error");
  }
});

// --- Rate a user (seller) ---
app.post("/api/users/:id/rate", auth, (req, res) => {
  const rateeId = Number(req.params.id);
  const stars = Number(req.body?.stars);
  const comment = req.body?.comment ? String(req.body.comment).slice(0, 300) : null;
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
    return res.status(400).json({ error: "stars must be 1..5" });
  }
  if (rateeId === req.user.id) return res.status(400).json({ error: "cannot rate yourself" });

  // Insert rating
  db.prepare(`INSERT INTO ratings (raterId, rateeId, stars, comment) VALUES (?, ?, ?, ?)`)
    .run(req.user.id, rateeId, Math.round(stars), comment);

  // Update denormalized fields for speed (optional)
  const agg = db.prepare(`SELECT AVG(stars) as avg, COUNT(*) as cnt FROM ratings WHERE rateeId=?`).get(rateeId);
  db.prepare(`UPDATE users SET ratingAvg=?, ratingCount=? WHERE id=?`).run(Number(agg.avg||0), Number(agg.cnt||0), rateeId);

  res.json({ ok: true, ratingAvg: Number(agg.avg||0), ratingCount: Number(agg.cnt||0) });
});

app.post("/api/auth/signup", (req,res) => {
  const { name, email, password, location, contact } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: "name/email/password required" });

// password reset (demo)
app.post("/api/auth/reset-password", async (req,res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const newPassword = String(req.body?.newPassword || "");
  if (!email || !newPassword) return res.status(400).json({ error: "Missing fields" });
  if (newPassword.length < 6) return res.status(400).json({ error: "Password too short" });

  const user = db.prepare("SELECT id FROM users WHERE email=?").get(email);
  if (!user) return res.status(404).json({ error: "No account found for this email" });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  db.prepare("UPDATE users SET passwordHash=? WHERE id=?").run(passwordHash, user.id);
  res.json({ ok: true });
});


  // Phone number (required) must start with +962 and contain digits only
  const phone = String(contact || "").trim();
  const phoneRe = /^\+962[0-9]{9}$/;
  if (!phone) return res.status(400).json({ error: "phone number required" });
  if (!phoneRe.test(phone)) return res.status(400).json({ error: "invalid phone number" });
  const passwordHash = bcrypt.hashSync(String(password), 10);

  try {
    const stmt = db.prepare("INSERT INTO users(name,email,passwordHash,location,contact) VALUES(?,?,?,?,?)");
    const info = stmt.run(name.trim(), email.trim().toLowerCase(), passwordHash, location || null, phone);
    const user = db.prepare("SELECT id,name,email,location,contact,role FROM users WHERE id=?").get(info.lastInsertRowid);
    const token = signToken(user);
    res.json({ token, user });
  } catch (e) {
    if (String(e).includes("UNIQUE")) return res.status(409).json({ error: "Email already exists" });
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/login", (req,res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email/password required" });

  const user = db.prepare("SELECT * FROM users WHERE email=?").get(String(email).trim().toLowerCase());
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = bcrypt.compareSync(String(password), user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const safeUser = { id:user.id, name:user.name, email:user.email, location:user.location, contact:user.contact, role:user.role };
  const token = signToken(safeUser);
  res.json({ token, user: safeUser });
});

app.get("/api/me", auth, (req,res) => {
  const user = db.prepare("SELECT id,name,email,location,contact,role FROM users WHERE id=?").get(req.user.sub);
  res.json({ user });
});


app.put("/api/me", auth, (req,res) => {
  const name = (req.body?.name || "").trim();
  if (!name) return res.status(400).json({ error: "Name required" });

// update email
app.put("/api/me/email", auth, (req,res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ error: "Email required" });
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) return res.status(400).json({ error: "Invalid email" });
  try{
    db.prepare("UPDATE users SET email=? WHERE id=?").run(email, req.user.sub);
    res.json({ ok: true });
  }catch(e){
    // unique constraint
    return res.status(400).json({ error: "Email already in use" });
  }
});

// update contact (Jordan +962)
app.put("/api/me/contact", auth, (req,res) => {
  const contact = String(req.body?.contact || "").trim();
  if (!contact) return res.status(400).json({ error: "Phone required" });
  const phoneRe = /^\+962[0-9]{9}$/;
  if (!phoneRe.test(contact)) return res.status(400).json({ error: "Phone number must start with +962 and contain 9 digits after it" });
  db.prepare("UPDATE users SET contact=? WHERE id=?").run(contact, req.user.sub);
  res.json({ ok: true });
});

  db.prepare("UPDATE users SET name=? WHERE id=?").run(name, req.user.sub);
  res.json({ ok: true });
});

app.put("/api/me/password", auth, async (req,res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) return res.status(400).json({ error: "Missing fields" });
  if (String(newPassword).length < 6) return res.status(400).json({ error: "Password too short" });

  const user = db.prepare("SELECT id, passwordHash FROM users WHERE id=?").get(req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found" });

  const ok = await bcrypt.compare(String(oldPassword), user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Old password incorrect" });

  const passwordHash = await bcrypt.hash(String(newPassword), 10);
  db.prepare("UPDATE users SET passwordHash=? WHERE id=?").run(passwordHash, req.user.sub);
  res.json({ ok: true });
});


app.get("/api/categories", (req,res) => {
  const rows = db.prepare(`SELECT id,name FROM categories
    ORDER BY CASE name
      WHEN 'Men' THEN 1
      WHEN 'Women' THEN 2
      WHEN 'Kids' THEN 3
      WHEN 'Jackets' THEN 4
      WHEN 'Shoes' THEN 5
      WHEN 'Bags' THEN 6
      WHEN 'Accessories' THEN 7
      WHEN 'Jeans' THEN 8
      WHEN 'Dresses' THEN 9
      ELSE 99 END, name`).all();
  res.json({ categories: rows });
});

// posts browse + filters
app.get("/api/posts", (req,res) => {
  const { q, categoryId, size, location, tradeType, userId } = req.query;
  const where = [];
  const params = {};

  if (q) { where.push("(p.title LIKE @q OR p.description LIKE @q)"); params.q = `%${q}%`; }
  if (categoryId) { where.push("p.categoryId = @categoryId"); params.categoryId = Number(categoryId); }
  if (size) { where.push("p.size = @size"); params.size = String(size); }
  if (location) { where.push("p.location LIKE @location"); params.location = `%${location}%`; }
  if (tradeType) { where.push("p.tradeType = @tradeType"); params.tradeType = String(tradeType); }
  if (userId) { where.push("p.userId = @userId"); params.userId = Number(userId); }

  const sql = `
    SELECT p.*,
           u.name as sellerName,
           u.location as sellerLocation,
           (SELECT ROUND(AVG(stars),1) FROM ratings r WHERE r.rateeId=u.id) as sellerRating,
           c.name as categoryName
    FROM posts p
    JOIN users u ON u.id = p.userId
    LEFT JOIN categories c ON c.id = p.categoryId
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY p.createdAt DESC
    LIMIT 200
  `;
  const rows = db.prepare(sql).all(params);
  res.json({ posts: rows });
});

app.get("/api/posts/:id", (req,res) => {
  const id = Number(req.params.id);
  const row = db.prepare(`
    SELECT p.*,
           u.name as sellerName,
           u.location as sellerLocation,
           (SELECT ROUND(AVG(stars),1) FROM ratings r WHERE r.rateeId=u.id) as sellerRating,
           c.name as categoryName
    FROM posts p
    JOIN users u ON u.id = p.userId
    LEFT JOIN categories c ON c.id = p.categoryId
    WHERE p.id = ?
  `).get(id);

  if (!row) return res.status(404).json({ error: "not found" });
  res.json({ post: row });
});


app.post("/api/posts", auth, (req,res) => {
  const { title, description, price, tradeType, size, condition, categoryId, location, imageUrl } = req.body || {};
  if (!title || !tradeType) return res.status(400).json({ error: "title and tradeType required" });

  const stmt = db.prepare(`
    INSERT INTO posts(userId,title,description,price,tradeType,size,condition,categoryId,location,imageUrl)
    VALUES(?,?,?,?,?,?,?,?,?,?)
  `);
  const info = stmt.run(
    req.user.sub,
    String(title).trim(),
    description || null,
    Number(price || 0),
    tradeType,
    size || null,
    condition || null,
    categoryId ? Number(categoryId) : null,
    location || null,
    imageUrl || null
  );

  // notify (simple)
  db.prepare("INSERT INTO notifications(userId,type,message) VALUES(?,?,?)")
    .run(req.user.sub, "post", "Your post was created successfully.");

  const post = db.prepare("SELECT * FROM posts WHERE id=?").get(info.lastInsertRowid);
  res.json({ post });
});

app.post("/api/favorites/:postId", auth, (req,res) => {
  const postId = Number(req.params.postId);
  const exists = db.prepare("SELECT 1 FROM favorites WHERE userId=? AND postId=?").get(req.user.sub, postId);
  if (exists) {
    db.prepare("DELETE FROM favorites WHERE userId=? AND postId=?").run(req.user.sub, postId);
    return res.json({ favorited:false });
  }
  db.prepare("INSERT OR IGNORE INTO favorites(userId,postId) VALUES(?,?)").run(req.user.sub, postId);
  res.json({ favorited:true });
});

app.get("/api/favorites", auth, (req,res) => {
  const rows = db.prepare(`
    SELECT p.*,
           u.name as sellerName,
           (SELECT ROUND(AVG(stars),1) FROM ratings r WHERE r.rateeId=u.id) as sellerRating,
           c.name as categoryName
    FROM favorites f
    JOIN posts p ON p.id = f.postId
    JOIN users u ON u.id = p.userId
    LEFT JOIN categories c ON c.id = p.categoryId
    WHERE f.userId = ?
    ORDER BY f.createdAt DESC
  `).all(req.user.sub);
  res.json({ posts: rows });
});

// messaging
app.get("/api/messages/threads", auth, (req,res) => {
  // list distinct people user chatted with, last message
  const rows = db.prepare(`
    WITH t AS (
      SELECT
        CASE WHEN fromUserId = @me THEN toUserId ELSE fromUserId END AS otherUserId,
        MAX(createdAt) AS lastAt
      FROM messages
      WHERE fromUserId=@me OR toUserId=@me
      GROUP BY otherUserId
    )
    SELECT t.otherUserId, u.name as otherName, t.lastAt,
      (SELECT content FROM messages m
        WHERE ((m.fromUserId=@me AND m.toUserId=t.otherUserId) OR (m.fromUserId=t.otherUserId AND m.toUserId=@me))
        ORDER BY m.createdAt DESC LIMIT 1) as lastMessage
    FROM t
    JOIN users u ON u.id = t.otherUserId
    ORDER BY t.lastAt DESC
  `).all({ me: req.user.sub });
  res.json({ threads: rows });
});

app.get("/api/messages", auth, (req,res) => {
  const otherUserId = Number(req.query.withUserId);
  if (!otherUserId) return res.status(400).json({ error: "withUserId required" });

  const rows = db.prepare(`
    SELECT m.*, fu.name as fromName, tu.name as toName
    FROM messages m
    JOIN users fu ON fu.id=m.fromUserId
    JOIN users tu ON tu.id=m.toUserId
    WHERE (m.fromUserId=@me AND m.toUserId=@other) OR (m.fromUserId=@other AND m.toUserId=@me)
    ORDER BY m.createdAt ASC
    LIMIT 500
  `).all({ me: req.user.sub, other: otherUserId });

  res.json({ messages: rows });
});

app.post("/api/messages", auth, (req,res) => {
  const { toUserId, content, postId } = req.body || {};
  if (!toUserId || !content) return res.status(400).json({ error: "toUserId/content required" });

  const stmt = db.prepare("INSERT INTO messages(fromUserId,toUserId,postId,content) VALUES(?,?,?,?)");
  const info = stmt.run(req.user.sub, Number(toUserId), postId ? Number(postId) : null, String(content));

  // notification for receiver
  const sender = db.prepare("SELECT name FROM users WHERE id=?").get(req.user.sub);
  db.prepare("INSERT INTO notifications(userId,type,message) VALUES(?,?,?)")
    .run(Number(toUserId), "message", `New message from ${sender?.name || "someone"}.`);

  res.json({ id: info.lastInsertRowid });
});

app.get("/api/notifications", auth, (req,res) => {
  const rows = db.prepare("SELECT * FROM notifications WHERE userId=? ORDER BY createdAt DESC LIMIT 100").all(req.user.sub);
  res.json({ notifications: rows });
});

app.post("/api/notifications/:id/read", auth, (req,res) => {
  db.prepare("UPDATE notifications SET isRead=1 WHERE id=? AND userId=?").run(Number(req.params.id), req.user.sub);
  res.json({ ok:true });
});

// rate user
app.post("/api/ratings", auth, (req,res) => {
  const { rateeId, stars, comment } = req.body || {};
  if (!rateeId || !stars) return res.status(400).json({ error: "rateeId/stars required" });
  db.prepare("INSERT INTO ratings(raterId,rateeId,stars,comment) VALUES(?,?,?,?)")
    .run(req.user.sub, Number(rateeId), Number(stars), comment || null);
  res.json({ ok:true });
});

// Fallback to index
app.get("*", (req,res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`ReWear running on http://localhost:${PORT}`));

// --- demo seed (for first run / showcase) ---
function seedDemo() {
  const postsCount = db.prepare("SELECT COUNT(1) as c FROM posts").get().c;
  if (postsCount > 0) return;

  // ensure at least 2 demo users
  const usersCount = db.prepare("SELECT COUNT(1) as c FROM users").get().c;
  if (usersCount === 0) {
    const ph = bcrypt.hashSync("123456", 10);
    db.prepare("INSERT INTO users(name,email,passwordHash,location,contact) VALUES (?,?,?,?,?)")
      .run("Baha'a", "bahaa@rewear.demo", ph, "Amman", "0790000000");
    db.prepare("INSERT INTO users(name,email,passwordHash,location,contact) VALUES (?,?,?,?,?)")
      .run("Sara", "sara@rewear.demo", ph, "Irbid", "0780000000");
  }

  const u1 = db.prepare("SELECT id FROM users ORDER BY id ASC LIMIT 1").get().id;
  const u2 = db.prepare("SELECT id FROM users ORDER BY id ASC LIMIT 1 OFFSET 1").get()?.id || u1;

  const catId = (name)=> db.prepare("SELECT id FROM categories WHERE name=?").get(name)?.id || null;

  const demoPosts = [
    { userId:u1, title:"Denim Jacket - Like New", description:"Gently used denim jacket, perfect for winter. Fast exchange/sale.", price:12, tradeType:"sale", size:"M", condition:"Like new", categoryId:catId("Jackets"), location:"Amman", imageUrl:"/assets/items/item1.svg"},
    { userId:u2, title:"Kids Shoes (Size 30)", description:"Clean kids shoes, can be exchanged with kids t-shirts.", price:0, tradeType:"exchange", size:"30", condition:"Good", categoryId:catId("Kids"), location:"Irbid", imageUrl:"/assets/items/item2.svg"},
    { userId:u1, title:"Women Dress - Free", description:"Free dress. Pickup only. Good condition.", price:0, tradeType:"free", size:"S", condition:"Good", categoryId:catId("Dresses"), location:"Amman", imageUrl:"/assets/items/item3.svg"},
    { userId:u2, title:"Leather Bag", description:"Brown leather bag, stylish and spacious.", price:18, tradeType:"sale", size:"One Size", condition:"Very good", categoryId:catId("Bags"), location:"Zarqa", imageUrl:"/assets/items/item1.svg"},
    { userId:u1, title:"Men Jeans 32", description:"Classic jeans, size 32. Exchange possible.", price:10, tradeType:"exchange", size:"32", condition:"Good", categoryId:catId("Jeans"), location:"Amman", imageUrl:"/assets/items/item2.svg"},
    { userId:u2, title:"Accessories bundle", description:"Belt + cap bundle. Cheap sale.", price:5, tradeType:"sale", size:"-", condition:"Good", categoryId:catId("Accessories"), location:"Irbid", imageUrl:"/assets/items/item3.svg"},
  ];

  const ins = db.prepare(`
    INSERT INTO posts(userId,title,description,price,tradeType,size,condition,categoryId,location,imageUrl)
    VALUES (@userId,@title,@description,@price,@tradeType,@size,@condition,@categoryId,@location,@imageUrl)
  `);

  db.transaction(() => demoPosts.forEach(p => ins.run(p)))();
  console.log("Seeded demo data (users/password: 123456).");
}
seedDemo();