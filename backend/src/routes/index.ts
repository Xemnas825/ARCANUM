import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import * as characterController from '../controllers/characterController.js';
import * as campaignController from '../controllers/campaignController.js';
import * as notificationController from '../controllers/notificationController.js';
import * as encounterController from '../controllers/encounterController.js';
import * as userController from '../controllers/userController.js';
import * as dndController from '../controllers/dndController.js';
import * as contentController from '../controllers/contentController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCampaignMember, requireCampaignMaster } from '../middleware/campaignAuth.js';

const router = Router();

// ===== AUTENTICACIÓN =====
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// ===== PERFIL DE USUARIO =====
router.get('/users/me', requireAuth, userController.getMe);
router.patch('/users/me', requireAuth, userController.updateMe);

// ===== OPCIONES DE CREACIÓN Y CONTENIDO (barra libre para logueados; ?campaignId= inyecta homebrew) =====
router.get('/character-creation-options', requireAuth, contentController.getCharacterCreationOptions);

// ===== RUTAS DE RAZAS (requireAuth; ?campaignId= opcional para homebrew) =====
router.get('/races', requireAuth, contentController.getRaces);
router.get('/races/:id', requireAuth, contentController.getRaceById);
router.get('/races/:raceId/subraces/:subraceId', requireAuth, dndController.getSubraceById);

// ===== RUTAS DE CLASES =====
router.get('/classes', requireAuth, contentController.getClasses);
router.get('/classes/:id', requireAuth, contentController.getClassById);
router.get('/classes/:classId/subclasses/:subclassId', requireAuth, dndController.getSubclassById);

// ===== RUTAS DE HECHIZOS =====
router.get('/spells', requireAuth, contentController.getSpells);
router.get('/spells/:id', requireAuth, contentController.getSpellById);

// ===== RUTAS DE ARMAS (barra libre logueados) =====
router.get('/weapons', requireAuth, dndController.getAllWeapons);
router.get('/weapons/:id', requireAuth, dndController.getWeaponById);

// ===== RUTAS DE ARMADURA =====
router.get('/armor', requireAuth, dndController.getAllArmor);
router.get('/armor/:id', requireAuth, dndController.getArmorById);

// ===== RUTAS DE TRASFONDOS =====
router.get('/backgrounds', requireAuth, dndController.getAllBackgrounds);
router.get('/backgrounds/:id', requireAuth, dndController.getBackgroundById);

// ===== RUTAS DE TALENTOS =====
router.get('/feats', requireAuth, dndController.getAllFeats);
router.get('/feats/:id', requireAuth, dndController.getFeatById);

// ===== RUTAS DE MONSTRUOS =====
router.get('/monsters', requireAuth, contentController.getMonsters);
router.get('/monsters/:id', requireAuth, contentController.getMonsterById);

// ===== RUTAS DE CONDICIONES =====
router.get('/conditions', requireAuth, dndController.getAllConditions);
router.get('/conditions/:id', requireAuth, dndController.getConditionById);

// ===== RUTAS DE ALINEAMIENTOS =====
router.get('/alignments', requireAuth, dndController.getAllAlignments);
router.get('/alignments/:id', requireAuth, dndController.getAlignmentById);

// ===== RUTAS DE ITEMS MÁGICOS =====
router.get('/magic-items', requireAuth, dndController.getAllMagicItems);
router.get('/magic-items/:id', requireAuth, dndController.getMagicItemById);

// ===== RUTAS DE CAMPAÑAS =====
router.get('/campaigns', requireAuth, campaignController.listCampaigns);
router.post('/campaigns/join/:token', requireAuth, campaignController.joinCampaignByInvite);
router.get('/campaigns/:id', requireAuth, requireCampaignMember, campaignController.getCampaign);
router.post('/campaigns', requireAuth, campaignController.createCampaign);
router.patch('/campaigns/:id', requireAuth, requireCampaignMaster, campaignController.updateCampaign);
router.delete('/campaigns/:id', requireAuth, requireCampaignMaster, campaignController.deleteCampaign);
router.post('/campaigns/:id/invite-link', requireAuth, requireCampaignMaster, campaignController.createInviteLink);
router.get('/campaigns/:id/invite-links', requireAuth, requireCampaignMaster, campaignController.listInviteLinks);
router.post('/campaigns/:id/invite-links/:token/revoke', requireAuth, requireCampaignMaster, campaignController.revokeInviteLink);
router.get('/campaigns/:id/members', requireAuth, requireCampaignMember, campaignController.getMembers);
router.post('/campaigns/:id/members', requireAuth, requireCampaignMaster, campaignController.addMember);
router.get('/campaigns/:id/characters', requireAuth, requireCampaignMember, campaignController.getCampaignCharacters);
router.get('/campaigns/:id/party', requireAuth, requireCampaignMember, userController.getCampaignParty);

// ===== COMBAT TRACKER (ENCOUNTERS) =====
router.get('/campaigns/:id/encounters', requireAuth, requireCampaignMember, encounterController.listEncounters);
router.post('/campaigns/:id/encounters', requireAuth, requireCampaignMaster, encounterController.createEncounter);
router.get('/campaigns/:id/encounter-templates', requireAuth, requireCampaignMaster, encounterController.listEncounterTemplates);
router.post('/campaigns/:id/encounter-templates', requireAuth, requireCampaignMaster, encounterController.createEncounterTemplate);
router.delete('/campaigns/:id/encounter-templates/:templateId', requireAuth, requireCampaignMaster, encounterController.deleteEncounterTemplate);
router.post('/campaigns/:id/encounter-templates/:templateId/apply/:encounterId', requireAuth, requireCampaignMaster, encounterController.applyEncounterTemplate);
router.get('/campaigns/:id/encounters/:encounterId', requireAuth, requireCampaignMember, encounterController.getEncounter);
router.post('/campaigns/:id/encounters/:encounterId/combatants', requireAuth, requireCampaignMaster, encounterController.addCombatant);
router.patch('/campaigns/:id/encounters/:encounterId/combatants/:combatantId', requireAuth, requireCampaignMaster, encounterController.updateCombatant);
router.delete('/campaigns/:id/encounters/:encounterId/combatants/:combatantId', requireAuth, requireCampaignMaster, encounterController.removeCombatant);
router.delete('/campaigns/:id/encounters/:encounterId/combatants/:combatantId/conditions/:conditionId', requireAuth, requireCampaignMaster, encounterController.removeCombatantCondition);
router.post('/campaigns/:id/encounters/:encounterId/next-turn', requireAuth, requireCampaignMaster, encounterController.nextTurn);
router.patch('/campaigns/:id/encounters/:encounterId', requireAuth, requireCampaignMaster, encounterController.updateEncounter);
router.post('/campaigns/:id/encounters/:encounterId/reset', requireAuth, requireCampaignMaster, encounterController.resetEncounterProgress);
router.get('/campaigns/:id/encounters/:encounterId/events', requireAuth, requireCampaignMember, encounterController.listEncounterEvents);
router.post('/campaigns/:id/encounters/:encounterId/actions', requireAuth, requireCampaignMaster, encounterController.createEncounterAction);
router.get('/campaigns/:id/encounters/:encounterId/snapshots', requireAuth, requireCampaignMember, encounterController.listEncounterSnapshots);
router.post('/campaigns/:id/encounters/:encounterId/snapshots', requireAuth, requireCampaignMaster, encounterController.createEncounterSnapshot);
router.get('/campaigns/:id/encounters/:encounterId/snapshots/:snapshotId', requireAuth, requireCampaignMember, encounterController.getEncounterSnapshot);

// ===== NOTIFICACIONES IN-APP =====
router.get('/notifications', requireAuth, notificationController.listNotifications);
router.post('/notifications/read-all', requireAuth, notificationController.markAllNotificationsRead);
router.post('/notifications/:id/read', requireAuth, notificationController.markNotificationRead);

// ===== RUTAS DE PERSONAJES (protegidas con JWT) =====
router.post('/characters', requireAuth, characterController.createCharacter);
router.get('/characters/:id', requireAuth, characterController.getCharacter);
router.get('/users/:userId/characters', requireAuth, characterController.getUserCharacters);
router.patch('/characters/:characterId/stats', requireAuth, characterController.updateGameStats);
router.patch('/characters/:id', requireAuth, characterController.updateCharacter);
router.put('/characters/:id/conditions', requireAuth, characterController.setCharacterConditions);
router.post('/characters/:id/inventory', requireAuth, characterController.addInventoryItem);
router.patch('/characters/:id/inventory/:itemId', requireAuth, characterController.updateInventoryItem);
router.delete('/characters/:id/inventory/:itemId', requireAuth, characterController.deleteInventoryItem);
router.delete('/characters/:id', requireAuth, characterController.deleteCharacter);

export default router;
