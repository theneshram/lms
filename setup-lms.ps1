<# 
  setup-lms.ps1
  Creates/updates a working LMS skeleton (backend + frontend + docker) with dark dashboard theme.
  Usage:
    .\setup-lms.ps1 -Root "C:\New folder\lms" -Install -Start
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$Root,
  [switch]$Install,   # runs npm install in api & web
  [switch]$Start      # runs npm run dev in both (non-docker)
)

$ErrorActionPreference = 'Stop'

function Write-Info($m){ Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Write-Ok($m){ Write-Host "[OK]   $m" -ForegroundColor Green }
function Write-Warn($m){ Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Write-Err($m){ Write-Host "[ERR]  $m" -ForegroundColor Red }

function New-Utf8NoBom {
  param([string]$Path,[string]$Content)
  $dir = Split-Path $Path -Parent
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  if (Test-Path $Path) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    Copy-Item $Path "$Path.$stamp.bak" -Force
    Write-Warn "Backed up $Path -> $Path.$stamp.bak"
  }
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $enc)
  Write-Ok "Wrote $Path"
}

# ---------- Paths ----------
$api = Join-Path $Root "apps\api"
$web = Join-Path $Root "apps\web"

# ---------- docker-compose.yml ----------
$compose = @"
version: "3.9"
services:
  db:
    image: mongo:7
    container_name: lms-db
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  api:
    build: ./apps/api
    container_name: lms-backend
    restart: unless-stopped
    depends_on:
      - db
    environment:
      - PORT=8080
      - MONGO_URI=mongodb://db:27017/lms
      - JWT_SECRET=please_change_me
      - CORS_ORIGIN=http://localhost:3000
    ports:
      - "8080:8080"

  web:
    build: ./apps/web
    container_name: lms-frontend
    restart: unless-stopped
    environment:
      - VITE_API_BASE=http://localhost:8080/api
    ports:
      - "3000:3000"
    depends_on:
      - api

volumes:
  mongo_data:
"@
New-Utf8NoBom -Path (Join-Path $Root "docker-compose.yml") -Content $compose

# ---------- Backend: apps/api ----------
New-Item -ItemType Directory -Force -Path "$api\src\models","$api\src\routes","$api\src\middleware","$api\src\scripts" | Out-Null

$apiPkg = @"
{
  "name": "lms-api",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.6.0",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.0"
  }
}
"@
New-Utf8NoBom -Path (Join-Path $api "package.json") -Content $apiPkg

$apiDocker = @"
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 8080
CMD ["node","src/index.js"]
"@
New-Utf8NoBom -Path (Join-Path $api "Dockerfile") -Content $apiDocker

$apiEnv = @"
PORT=8080
MONGO_URI=mongodb://localhost:27017/lms
JWT_SECRET=please_change_me
CORS_ORIGIN=http://localhost:3000
"@
New-Utf8NoBom -Path (Join-Path $api ".env.example") -Content $apiEnv

$apiIndex = @"
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './db.js';
import authRoutes from './routes/auth.js';
import courseRoutes from './routes/courses.js';
import assignmentRoutes from './routes/assignments.js';
import submissionRoutes from './routes/submissions.js';
import userRoutes from './routes/users.js';

dotenv.config();
await connectDB();

const app = express();
app.use(express.json());
app.use(morgan('dev'));
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*', credentials: true }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/users', userRoutes);

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
"@
New-Utf8NoBom -Path (Join-Path $api "src\index.js") -Content $apiIndex

$apiDb = @"
import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not set');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { autoIndex: true });
  console.log('Mongo connected');
}
"@
New-Utf8NoBom -Path (Join-Path $api "src\db.js") -Content $apiDb

$mdlUser = @"
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin','teacher','ta','student'], required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model('User', UserSchema);
"@
New-Utf8NoBom -Path (Join-Path $api "src\models\User.js") -Content $mdlUser

$mdlCourse = @"
import mongoose from 'mongoose';

const CourseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    description: String,
    image: String,
    startDate: Date,
    endDate: Date,
    durationWeeks: Number,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

export default mongoose.model('Course', CourseSchema);
"@
New-Utf8NoBom -Path (Join-Path $api "src\models\Course.js") -Content $mdlCourse

$mdlEnroll = @"
import mongoose from 'mongoose';

const EnrollmentSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['teacher','ta','student'], required: true }
  },
  { timestamps: true }
);
EnrollmentSchema.index({ course: 1, user: 1 }, { unique: true });

export default mongoose.model('Enrollment', EnrollmentSchema);
"@
New-Utf8NoBom -Path (Join-Path $api "src\models\Enrollment.js") -Content $mdlEnroll

$mdlAssignment = @"
import mongoose from 'mongoose';

const AssignmentSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true },
    description: String,
    dueDate: Date,
    maxPoints: { type: Number, default: 100 }
  },
  { timestamps: true }
);

export default mongoose.model('Assignment', AssignmentSchema);
"@
New-Utf8NoBom -Path (Join-Path $api "src\models\Assignment.js") -Content $mdlAssignment

$mdlSubmission = @"
import mongoose from 'mongoose';

const SubmissionSchema = new mongoose.Schema(
  {
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    contentUrl: String,
    textAnswer: String,
    score: Number,
    feedback: String
  },
  { timestamps: true }
);
SubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

export default mongoose.model('Submission', SubmissionSchema);
"@
New-Utf8NoBom -Path (Join-Path $api "src\models\Submission.js") -Content $mdlSubmission

$mwAuth = @"
import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, role, name }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
"@
New-Utf8NoBom -Path (Join-Path $api "src\middleware\auth.js") -Content $mwAuth

$rtAuth = @"
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ error: 'Missing fields' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email already registered' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, role });
    return res.status(201).json({ id: user._id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '12h' });
  return res.json({ token, role: user.role, name: user.name });
});

export default router;
"@
New-Utf8NoBom -Path (Join-Path $api "src\routes\auth.js") -Content $rtAuth

$rtCourses = @"
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  const items = await Course.find().sort({ createdAt: -1 });
  res.json(items);
});

router.post('/', requireAuth, requireRole('admin','teacher'), async (req, res) => {
  const { title, code, description, image, startDate, endDate, durationWeeks } = req.body;
  const course = await Course.create({ title, code, description, image, startDate, endDate, durationWeeks, createdBy: req.user.id });
  res.status(201).json(course);
});

router.post('/:courseId/enroll', requireAuth, requireRole('admin','teacher'), async (req, res) => {
  const { userId, role } = req.body;
  const { courseId } = req.params;
  const enr = await Enrollment.create({ course: courseId, user: userId, role });
  res.status(201).json(enr);
});

router.get('/:courseId/enrollments', requireAuth, async (req, res) => {
  const list = await Enrollment.find({ course: req.params.courseId }).populate('user', 'name email role');
  res.json(list);
});

export default router;
"@
New-Utf8NoBom -Path (Join-Path $api "src\routes\courses.js") -Content $rtCourses

$rtAssignments = @"
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import Assignment from '../models/Assignment.js';

const router = Router({ mergeParams: true });

router.get('/', requireAuth, async (req, res) => {
  const { courseId } = req.query;
  const q = courseId ? { course: courseId } : {};
  const list = await Assignment.find(q).sort({ dueDate: 1 });
  res.json(list);
});

router.post('/', requireAuth, requireRole('admin','teacher','ta'), async (req, res) => {
  const { course, title, description, dueDate, maxPoints } = req.body;
  const a = await Assignment.create({ course, title, description, dueDate, maxPoints });
  res.status(201).json(a);
});

export default router;
"@
New-Utf8NoBom -Path (Join-Path $api "src\routes\assignments.js") -Content $rtAssignments

$rtSubmissions = @"
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import Submission from '../models/Submission.js';

const router = Router();

router.post('/', requireAuth, requireRole('student'), async (req, res) => {
  const { assignment, contentUrl, textAnswer } = req.body;
  const s = await Submission.create({ assignment, student: req.user.id, contentUrl, textAnswer });
  res.status(201).json(s);
});

router.post('/:id/grade', requireAuth, requireRole('teacher','ta','admin'), async (req, res) => {
  const { id } = req.params;
  const { score, feedback } = req.body;
  const updated = await Submission.findByIdAndUpdate(id, { score, feedback }, { new: true });
  res.json(updated);
});

router.get('/', requireAuth, async (req, res) => {
  const { assignment } = req.query;
  const q = assignment ? { assignment } : { student: req.user.id };
  const list = await Submission.find(q).sort({ createdAt: -1 });
  res.json(list);
});

export default router;
"@
New-Utf8NoBom -Path (Join-Path $api "src\routes\submissions.js") -Content $rtSubmissions

$rtUsers = @"
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import User from '../models/User.js';

const router = Router();

router.get('/', requireAuth, requireRole('admin'), async (_req, res) => {
  const users = await User.find().select('-passwordHash');
  res.json(users);
});

export default router;
"@
New-Utf8NoBom -Path (Join-Path $api "src\routes\users.js") -Content $rtUsers

$seedAdmin = @"
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectDB } from '../db.js';
import User from '../models/User.js';

dotenv.config();
await connectDB();

const email = 'admin@example.com';
const password = 'password';
const name = 'Admin';
const role = 'admin';

const existing = await User.findOne({ email });
if (existing) {
  console.log('Admin already exists');
} else {
  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({ name, email, passwordHash, role });
  console.log('Admin created:', email, password);
}
process.exit(0);
"@
New-Utf8NoBom -Path (Join-Path $api "src\scripts\seed-admin.js") -Content $seedAdmin

# ---------- Frontend: apps/web ----------
New-Item -ItemType Directory -Force -Path "$web\src\api","$web\src\context","$web\src\components","$web\src\pages" | Out-Null

$twConfig = @"
module.exports = {
  content: ['./index.html','./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        overlay: 'rgb(var(--overlay) / <alpha-value>)',
        text: 'rgb(var(--text) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        subtle: 'rgb(var(--subtle) / <alpha-value>)',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        'primary-600': 'rgb(var(--primary-600) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-600': 'rgb(var(--accent-600) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)'
      },
      boxShadow: {
        glow: '0 0 0.5rem rgba(138,43,226,0.4), 0 0 2rem rgba(255,106,61,0.25)',
        card: '0 6px 24px rgba(0,0,0,0.35)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.04)'
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(90deg, rgb(var(--primary)) 0%, rgb(var(--accent)) 100%)',
      }
    }
  },
  plugins: []
};
"@
New-Utf8NoBom -Path (Join-Path $web "tailwind.config.cjs") -Content $twConfig

$postcss = @"
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
"@
New-Utf8NoBom -Path (Join-Path $web "postcss.config.cjs") -Content $postcss

$indexCss = @"
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Color Variables */
:root{
  --bg: 14 16 32;
  --surface: 25 27 46;
  --card: 31 32 54;
  --overlay: 41 39 71;

  --text: 230 230 240;
  --muted: 164 167 190;
  --subtle: 130 134 160;

  --primary: 138 43 226;
  --primary-600: 120 36 198;
  --accent: 255 106 61;
  --accent-600: 224 83 43;

  --success: 56 189 148;
  --warning: 245 158 11;
  --danger: 239 68 68;

  --line: 55 58 83;
}

body{
  background:
    radial-gradient(1200px 600px at 20% -10%, rgba(138,43,226,0.15), transparent 60%),
    radial-gradient(900px 500px at 85% 10%, rgba(255,106,61,0.12), transparent 60%),
    linear-gradient(180deg, #0d0f20 0%, #0b0c18 100%);
  background-attachment: fixed;
  color: rgb(var(--text));
  min-height: 100vh;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, 'Apple Color Emoji','Segoe UI Emoji';
}

/* Reusable UI */
.card-base { @apply bg-card/95 border border-line/40 rounded-2xl shadow-card; backdrop-filter: blur(8px); }
.sidebar-base { @apply bg-surface/95 border-r border-line/40; backdrop-filter: blur(10px); }
.btn-primary { @apply bg-primary hover:bg-primary-600 text-white rounded-xl px-4 py-2 font-medium transition; box-shadow: 0 0 .5rem rgba(138,43,226,.35); }
.btn-accent  { @apply bg-accent  hover:bg-accent-600  text-white rounded-xl px-4 py-2 font-medium transition; box-shadow: 0 0 .5rem rgba(255,106,61,.35); }
.input-dark  { @apply bg-overlay/60 border border-line/40 rounded-xl px-3 py-2 text-text placeholder:text-subtle; }
.kpi { @apply text-3xl font-semibold text-white; }
.kpi-label { @apply text-sm text-muted; }
"@
New-Utf8NoBom -Path (Join-Path $web "src\index.css") -Content $indexCss

$apiClient = @"
const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api';

export function authHeader(){
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function api(path, { method='GET', body, headers={} } = {}){
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type':'application/json', ...authHeader(), ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error((await res.json()).error || res.statusText);
  return res.json();
}
"@
New-Utf8NoBom -Path (Join-Path $web "src\api\client.js") -Content $apiClient

$authCtx = @"
import { createContext, useContext, useState } from 'react';
const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }){
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    const role  = localStorage.getItem('role');
    const name  = localStorage.getItem('name');
    return token ? { token, role, name } : null;
  });
  const login = ({ token, role, name }) => { localStorage.setItem('token',token); localStorage.setItem('role',role); localStorage.setItem('name',name); setUser({ token, role, name }); };
  const logout = () => { localStorage.clear(); setUser(null); };
  return <AuthCtx.Provider value={{ user, login, logout }}>{children}</AuthCtx.Provider>;
}
"@
New-Utf8NoBom -Path (Join-Path $web "src\context\AuthContext.jsx") -Content $authCtx

$protected = @"
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ roles, children }){
  const { user } = useAuth();
  if (!user) return <Navigate to='/login' replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to='/' replace />;
  return children;
}
"@
New-Utf8NoBom -Path (Join-Path $web "src\components\ProtectedRoute.jsx") -Content $protected

$login = @"
import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login(){
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('password');
  const [err, setErr] = useState('');

  async function onSubmit(e){
    e.preventDefault();
    try {
      const res = await api('/auth/login', { method:'POST', body:{ email, password } });
      login(res);
    } catch (e){ setErr(e.message); }
  }

  return (
    <div className='min-h-screen grid place-items-center p-4'>
      <form onSubmit={onSubmit} className='card-base max-w-sm w-full p-6 space-y-4'>
        <h1 className='text-2xl font-semibold'>LMS Login</h1>
        {err && <div className='text-red-500 text-sm'>{err}</div>}
        <input className='input-dark w-full' value={email} onChange={e=>setEmail(e.target.value)} placeholder='Email' />
        <input type='password' className='input-dark w-full' value={password} onChange={e=>setPassword(e.target.value)} placeholder='Password' />
        <button className='btn-primary w-full'>Sign in</button>
      </form>
    </div>
  );
}
"@
New-Utf8NoBom -Path (Join-Path $web "src\pages\Login.jsx") -Content $login

$dashboard = @"
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Link } from 'react-router-dom';

export default function Dashboard(){
  const { user } = useAuth();
  const [health, setHealth] = useState(null);
  useEffect(() => { api('/health').then(setHealth).catch(()=>{}); }, []);

  return (
    <div className='p-6 grid grid-cols-1 lg:grid-cols-[260px,1fr,360px] gap-6'>
      <aside className='sidebar-base rounded-2xl p-4 h-fit'>
        <div className='text-white font-semibold text-xl mb-4'>LMS</div>
        <nav className='flex flex-col gap-2'>
          <Link className='btn-primary text-center' to='/courses'>Courses</Link>
        </nav>
      </aside>

      <main className='space-y-6'>
        <div className='card-base p-6'>
          <h1 className='text-2xl font-semibold mb-2'>Dashboard Overview</h1>
          <div>Welcome, <b>{user?.name}</b> ({user?.role})</div>
          <pre className='mt-4 bg-overlay/60 border border-line/40 rounded-xl p-4 overflow-auto'>{JSON.stringify(health,null,2)}</pre>
        </div>

        <div className='card-base p-6'>
          <div className='kpi'>$400</div>
          <div className='kpi-label'>Revenue (Mar)</div>
        </div>
      </main>

      <section className='space-y-6'>
        <div className='card-base p-6'>
          <div className='text-sm text-muted mb-2'>Customer</div>
          <div className='bg-brand-gradient h-2 rounded-full w-1/2 shadow-glow'></div>
        </div>
      </section>
    </div>
  );
}
"@
New-Utf8NoBom -Path (Join-Path $web "src\pages\Dashboard.jsx") -Content $dashboard

$courses = @"
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Link } from 'react-router-dom';

export default function Courses(){
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');
  useEffect(() => { api('/courses').then(setItems).catch(e=>setErr(e.message)); }, []);
  return (
    <div className='p-6 space-y-4'>
      <h1 className='text-2xl font-semibold'>Courses</h1>
      {err && <div className='text-red-500 text-sm'>{err}</div>}
      <ul className='grid md:grid-cols-2 gap-4'>
        {items.map(c => (
          <li key={c._id} className='card-base p-4'>
            <div className='font-medium'>{c.title}</div>
            <div className='text-sm text-muted'>{c.code}</div>
            <p className='text-sm mt-2'>{c.description}</p>
            <Link to={`/course?id=${c._id}`} className='btn-accent inline-block mt-3'>Open</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
"@
New-Utf8NoBom -Path (Join-Path $web "src\pages\Courses.jsx") -Content $courses

$courseView = @"
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';

export default function CourseView(){
  const [sp] = useSearchParams();
  const id = sp.get('id');
  const [assignments, setAssignments] = useState([]);
  useEffect(()=>{ if(id) api(`/assignments?courseId=${id}`).then(setAssignments); }, [id]);

  return (
    <div className='p-6 space-y-4'>
      <h1 className='text-2xl font-semibold'>Course Assignments</h1>
      <ul className='space-y-2'>
        {assignments.map(a => (
          <li key={a._id} className='card-base p-4'>
            <div className='font-medium'>{a.title}</div>
            <div className='text-sm text-muted'>Due: {a.dueDate ? new Date(a.dueDate).toLocaleString() : '—'}</div>
            <p className='text-sm mt-2'>{a.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
"@
New-Utf8NoBom -Path (Join-Path $web "src\pages\CourseView.jsx") -Content $courseView

$app = @"
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Courses from './pages/Courses.jsx';
import CourseView from './pages/CourseView.jsx';
import { useAuth } from './context/AuthContext.jsx';

function Nav(){
  const { user, logout } = useAuth();
  return (
    <nav className='flex items-center justify-between p-3 border-b border-line/40'>
      <div className='flex items-center gap-4'>
        <Link to='/' className='bg-brand-gradient text-white rounded-xl px-3 py-1 shadow-glow'>LMS</Link>
        {user && (<Link to='/courses' className='text-muted hover:text-white'>Courses</Link>)}
      </div>
      <div>
        {user ? (
          <button onClick={logout} className='btn-accent'>Logout</button>
        ) : (
          <Link to='/login' className='btn-primary'>Login</Link>
        )}
      </div>
    </nav>
  );
}

export default function App(){
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path='/login' element={<Login />} />
        <Route path='/' element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path='/courses' element={<ProtectedRoute roles={["admin","teacher","ta","student"]}><Courses /></ProtectedRoute>} />
        <Route path='/course' element={<ProtectedRoute roles={["admin","teacher","ta","student"]}><CourseView /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
"@
New-Utf8NoBom -Path (Join-Path $web "src\App.jsx") -Content $app

$main = @"
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import AuthProvider from './context/AuthContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
"@
New-Utf8NoBom -Path (Join-Path $web "src\main.jsx") -Content $main

# ---------- Optional installs ----------
if ($Install) {
  Write-Info "Installing API deps…"
  Push-Location $api; npm install | Out-Host; Pop-Location

  Write-Info "Ensuring web dev deps…"
  Push-Location $web; npm i -D tailwindcss autoprefixer | Out-Host; npm install | Out-Host; Pop-Location
}

# ---------- Optional start ----------
if ($Start) {
  Write-Info "Starting API dev…"
  Start-Process powershell -ArgumentList "cd `"$api`"; npm run dev" | Out-Null
  Start-Sleep -Seconds 1
  Write-Info "Starting WEB dev…"
  Start-Process powershell -ArgumentList "cd `"$web`"; npm run dev" | Out-Null
  Write-Ok "Dev servers launched (API: 8080, Web: 3000)"
} else {
  Write-Ok "Done. To run locally:"
  Write-Host "  API: cd `"$api`" && npm i && npm run dev" -ForegroundColor Gray
  Write-Host "  WEB: cd `"$web`" && npm i && npm run dev" -ForegroundColor Gray
  Write-Host "Or with Docker: cd `"$Root`" && docker compose up -d --build" -ForegroundColor Gray
}
