import { Request, Response } from 'express';
import { races, classes } from '../data/dnd-data.js';

// ===== OBTENER TODAS LAS RAZAS =====
export function getAllRaces(req: Request, res: Response) {
  res.json(races);
}

// ===== OBTENER RAZA POR ID =====
export function getRaceById(req: Request, res: Response) {
  const { id } = req.params;
  const race = races.find((r) => r.id === id);
  
  if (!race) {
    res.status(404).json({ error: 'Raza no encontrada' });
    return;
  }
  
  res.json(race);
}

// ===== OBTENER TODAS LAS CLASES =====
export function getAllClasses(req: Request, res: Response) {
  res.json(classes);
}

// ===== OBTENER CLASE POR ID =====
export function getClassById(req: Request, res: Response) {
  const { id } = req.params;
  const charClass = classes.find((c) => c.id === id);
  
  if (!charClass) {
    res.status(404).json({ error: 'Clase no encontrada' });
    return;
  }
  
  res.json(charClass);
}
