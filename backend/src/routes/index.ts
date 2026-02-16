import { Router } from 'express';
import * as characterController from '../controllers/characterController.js';
import * as dndController from '../controllers/dndController.js';

const router = Router();

// ===== RUTAS DE RAZAS =====
router.get('/races', dndController.getAllRaces);
router.get('/races/:id', dndController.getRaceById);

// ===== RUTAS DE CLASES =====
router.get('/classes', dndController.getAllClasses);
router.get('/classes/:id', dndController.getClassById);

// ===== RUTAS DE PERSONAJES =====
router.post('/characters', characterController.createCharacter);
router.get('/characters/:id', characterController.getCharacter);
router.get('/users/:userId/characters', characterController.getUserCharacters);
router.patch('/characters/:characterId/stats', characterController.updateGameStats);
router.delete('/characters/:id', characterController.deleteCharacter);

export default router;
