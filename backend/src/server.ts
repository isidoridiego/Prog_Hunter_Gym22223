import dotenv from 'dotenv';
dotenv.config();
import app from './app';
import { pool } from './db';

const port = Number(process.env.PORT ?? 3000);

// Ascoltare su tutte le interfacce permette ai dispositivi della rete locale di raggiungere l'API.
const server = app.listen(port, '0.0.0.0', () =>
  console.log(`Hunter Gym API in ascolto sulla porta ${port}`),
);

// Chiusura ordinata quando Docker ferma il container.
process.on('SIGTERM', () => {
  server.close(() => {
    void pool.end();
  });
});
