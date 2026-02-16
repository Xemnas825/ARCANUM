import { Router } from 'express';
import * as characterController from '../controllers/characterController.js';
import * as dndController from '../controllers/dndController.js';

const router = Router();

// ===== RUTAS DE RAZAS =====
router.get('/races', dndController.getAllRaces);
router.get('/races/:id', dndController.getRaceById);
router.get('/races/:raceId/subraces/:subraceId', dndController.getSubraceById);

// ===== RUTAS DE CLASES =====
router.get('/classes', dndController.getAllClasses);
router.get('/classes/:id', dndController.getClassById);
router.get('/classes/:classId/subclasses/:subclassId', dndController.getSubclassById);

// ===== RUTAS DE HECHIZOS =====
router.get('/spells', dndController.getAllSpells);
router.get('/spells/:id', dndController.getSpellById);

// ===== RUTAS DE ARMAS =====
router.get('/weapons', dndController.getAllWeapons);
router.get('/weapons/:id', dndController.getWeaponById);

// ===== RUTAS DE ARMADURA =====
router.get('/armor', dndController.getAllArmor);
router.get('/armor/:id', dndController.getArmorById);

// ===== RUTAS DE TRASFONDOS =====
router.get('/backgrounds', dndController.getAllBackgrounds);
router.get('/backgrounds/:id', dndController.getBackgroundById);

// ===== RUTAS DE TALENTOS =====
router.get('/feats', dndController.getAllFeats);
router.get('/feats/:id', dndController.getFeatById);

// ===== RUTAS DE MONSTRUOS =====
router.get('/monsters', dndController.getAllMonsters);
router.get('/monsters/:id', dndController.getMonsterById);

// ===== RUTAS DE CONDICIONES =====
router.get('/conditions', dndController.getAllConditions);
router.get('/conditions/:id', dndController.getConditionById);

// ===== RUTAS DE ALINEAMIENTOS =====
router.get('/alignments', dndController.getAllAlignments);
router.get('/alignments/:id', dndController.getAlignmentById);

// ===== RUTAS DE ITEMS MÁGICOS =====
router.get('/magic-items', dndController.getAllMagicItems);
router.get('/magic-items/:id', dndController.getMagicItemById);

// ===== RUTAS DE PERSONAJES =====
router.post('/characters', characterController.createCharacter);
router.get('/characters/:id', characterController.getCharacter);
router.get('/users/:userId/characters', characterController.getUserCharacters);
router.patch('/characters/:characterId/stats', characterController.updateGameStats);
router.delete('/characters/:id', characterController.deleteCharacter);

export default router;
