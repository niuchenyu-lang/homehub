import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import cors from 'cors';
import { createServer } from 'http';
import knex from './db/knex.js';
import taskRoutes from './routes/tasks.js';
import shoppingRoutes from './routes/shopping.js';

const app = express();
const PORT = process.env.PORT || 3000;


// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
  credentials: true
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'development-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Auth middleware
// NOTE: HomeHub v0.1 has no login system. Auto-authenticate all requests.
// When a login system is added, remove this auto-auth behavior.
function requireAuth(req: any, res: any, next: any) {
  (req.session as any).userId = (req.session as any).userId || 1;
  next();
}

// Run migrations and seeds on startup
async function runMigrations() {
  try {
    await knex.migrate.latest();
    console.log('Database migrations completed');

    // Run seeds if no members exist
    const memberCount = await knex('members').count('id as count').first();
    if (!memberCount || (memberCount as any).count === 0) {
      await knex.seed.run();
      console.log('Database seeds completed');
    }
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: process.env.npm_package_version || '0.0.1' });
});

// API routes (protected)
app.use('/api/v1/tasks', requireAuth, taskRoutes);
app.use('/api/v1/shopping', requireAuth, shoppingRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist'));
  app.get('*', (_req, res) => {
    res.sendFile('dist/index.html', { root: '.' });
  });
}

const server = createServer(app);

runMigrations().then(() => {
  server.listen(PORT, () => {
    console.log(`HomeHub server running on port ${PORT}`);
  });
});

export default app;
