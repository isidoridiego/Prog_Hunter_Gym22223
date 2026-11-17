import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { RowDataPacket } from 'mysql2/promise';
import { pool, query } from './db';
import { requireAuth } from './middleware/requireAuth';
import { login, logout, me, register } from './controllers/authController';
import { apiError, serverError } from './utils/responses';
import questRoutes from './routes/questRoutes';
import friendRoutes from './routes/friendRoutes';
import battleRoutes from './routes/battleRoutes';
import profileRoutes from './routes/profileRoutes';
import adminRoutes from './routes/adminRoutes';

const app = express();

app.use(helmet());
// credentials: true serve perché il browser deve poter inviare il cookie di sessione.
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());

// Rotte pubbliche: non richiedono la sessione.
app.get('/api/health', async (_req, res) => {
  try {
    await query<RowDataPacket>(pool, 'SELECT 1');
    res.json({ success: true, data: { status: 'ok' } });
  } catch (error) {
    console.error('Health check DB fallito:', error);
    apiError(res, 500, 'DATABASE_UNAVAILABLE', 'Servizio non disponibile');
  }
});
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.post('/api/auth/logout', logout);

// Da qui in poi tutte le rotte richiedono una sessione valida.
app.use('/api', requireAuth);
app.get('/api/auth/me', me);
app.use('/api', questRoutes);
app.use('/api', friendRoutes);
app.use('/api', battleRoutes);
app.use('/api', profileRoutes);
app.use('/api', adminRoutes);

app.use((_req, res) => apiError(res, 404, 'NOT_FOUND', 'Risorsa non trovata'));
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  serverError(res, 'Errore non gestito', error);
});

export default app;
