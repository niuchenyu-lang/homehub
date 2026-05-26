import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import cors from 'cors';
import { createServer } from 'http';

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

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: process.env.npm_package_version || '0.0.1' });
});

// TODO: Add API routes
// app.use('/api/v1/families', familyRoutes);
// app.use('/api/v1/members', memberRoutes);
// app.use('/api/v1/tasks', taskRoutes);
// app.use('/api/v1/shopping', shoppingRoutes);
// app.use('/api/v1/meals', mealRoutes);
// app.use('/api/v1/budget', budgetRoutes);
// app.use('/api/v1/calendar', calendarRoutes);
// app.use('/api/v1/ai', aiRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist'));
  app.get('*', (_req, res) => {
    res.sendFile('dist/index.html', { root: '.' });
  });
}

const server = createServer(app);

server.listen(PORT, () => {
  console.log(`HomeHub server running on port ${PORT}`);
});

export default app;
