import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { initializeDatabase } from './database/init.js';

const app: Express = express();
const PORT = process.env.PORT || 3001;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());

// ===== RUTAS =====
app.use('/api', routes);

// ===== HEALTH CHECK =====
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Arcanum Backend está funcionando' });
});

// ===== INICIAR SERVIDOR =====
async function startServer() {
  try {
    // Inicializar base de datos
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`✓ Servidor ejecutándose en http://localhost:${PORT}`);
      console.log(`✓ API disponible en http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

startServer();
