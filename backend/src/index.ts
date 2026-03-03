import express, { Express, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';
import routes from './routes/index.js';
import { initializeDatabase } from './database/init.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app: Express = express();
const PORT = process.env.PORT || 3001;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());

// ===== RUTAS API =====
app.use('/api', routes);

// ===== HEALTH CHECK =====
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Arcanum Backend está funcionando' });
});

// ===== FRONTEND ESTÁTICO (solo si existe public/, p. ej. en Docker) =====
const publicDir = path.join(__dirname, '..', 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

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
