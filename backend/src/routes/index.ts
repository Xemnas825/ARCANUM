import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import * as characterController from '../controllers/characterController.js';
import * as dndController from '../controllers/dndController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ===== AUTENTICACIÓN =====
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// ===== OPCIONES DE CREACIÓN DE PERSONAJE (público para que el formulario cargue sin estar logueado si se quiere) =====
router.get('/character-creation-options', dndController.getCharacterCreationOptions);

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

// ===== RUTAS DE PERSONAJES (protegidas con JWT) =====
router.post('/characters', requireAuth, characterController.createCharacter);
router.get('/characters/:id', requireAuth, characterController.getCharacter);
router.get('/users/:userId/characters', requireAuth, characterController.getUserCharacters);
router.patch('/characters/:characterId/stats', requireAuth, characterController.updateGameStats);
router.put('/characters/:id/conditions', requireAuth, characterController.setCharacterConditions);
router.post('/characters/:id/inventory', requireAuth, characterController.addInventoryItem);
router.patch('/characters/:id/inventory/:itemId', requireAuth, characterController.updateInventoryItem);
router.delete('/characters/:id/inventory/:itemId', requireAuth, characterController.deleteInventoryItem);
router.delete('/characters/:id', requireAuth, characterController.deleteCharacter);

export default router;
