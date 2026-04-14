const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const rootDir = __dirname;
const dataDir = path.join(rootDir, 'data');
const adminEmail = (process.env.ADMIN_EMAIL || 'admin@placementpath.local').trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'placement-portal.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    reg_no TEXT NOT NULL UNIQUE,
    cgpa REAL NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const protectedStudentPages = new Set(['/companies.html', '/resources.html', '/roadmaps.html']);
const protectedAdminPages = new Set(['/admin.html']);

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'placement-path-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.use((req, res, next) => {
  if (protectedStudentPages.has(req.path) && !req.session.user) {
    return res.redirect('/login.html');
  }

  if (protectedAdminPages.has(req.path) && req.session.user?.role !== 'admin') {
    return res.redirect('/admin-login.html');
  }

  next();
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, regNo, cgpa, password } = req.body ?? {};

  if (!name || !email || !regNo || !cgpa || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedRegNo = String(regNo).trim().toUpperCase();
  const parsedCgpa = Number(cgpa);

  if (!Number.isFinite(parsedCgpa) || parsedCgpa < 0 || parsedCgpa > 10) {
    return res.status(400).json({ message: 'CGPA must be between 0 and 10.' });
  }

  const existingUser = db
    .prepare('SELECT id FROM users WHERE email = ? OR reg_no = ?')
    .get(normalizedEmail, normalizedRegNo);

  if (existingUser) {
    return res.status(409).json({ message: 'An account with that email or registration number already exists.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const insert = db.prepare(`
    INSERT INTO users (name, email, reg_no, cgpa, password_hash)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = insert.run(String(name).trim(), normalizedEmail, normalizedRegNo, parsedCgpa, passwordHash);

  req.session.user = {
    id: result.lastInsertRowid,
    name: String(name).trim(),
    email: normalizedEmail,
    role: 'student'
  };

  return res.status(201).json({ message: 'Account created successfully.' });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = db
    .prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?')
    .get(normalizedEmail);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  req.session.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: 'student'
  };

  return res.json({ message: 'Login successful.' });
});

app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body ?? {};
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return res.status(400).json({ message: 'Admin email and password are required.' });
  }

  if (normalizedEmail !== adminEmail || password !== adminPassword) {
    return res.status(401).json({ message: 'Invalid admin credentials.' });
  }

  req.session.user = {
    id: 'admin',
    name: 'Administrator',
    email: adminEmail,
    role: 'admin'
  };

  return res.json({ message: 'Admin login successful.' });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully.' });
  });
});

app.get('/api/auth/session', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ authenticated: false });
  }

  return res.json({
    authenticated: true,
    user: req.session.user
  });
});

app.get('/api/admin/students', (req, res) => {
  if (req.session.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }

  const students = db
    .prepare(`
      SELECT id, name, email, reg_no AS regNo, cgpa, created_at AS createdAt
      FROM users
      ORDER BY datetime(created_at) DESC
    `)
    .all();

  return res.json({ students });
});

app.use(express.static(rootDir));

app.get('/', (_req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`PlacementPath server running at http://localhost:${PORT}`);
});
