/**
 * Controlador de contenido: entrega datos oficiales (barra libre para usuarios logueados)
 * e inyecta homebrew de campaña cuando se pasa campaignId en query.
 */
import { Response } from 'express';
import * as contentService from '../services/contentService.js';
import { alignments } from '../data/dnd-data.js';
import type { AuthRequest } from '../middleware/auth.js';

function getCampaignIdFromQuery(req: AuthRequest): string | null {
  const id = req.query.campaignId;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

/** GET /races?campaignId= (opcional). Usuario logueado recibe oficial + homebrew de la campaña si aplica. */
export async function getRaces(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const campaignId = getCampaignIdFromQuery(req);
    const list = await contentService.getRaces(campaignId, userId);
    res.json(list);
  } catch (err) {
    console.error('Error getRaces:', err);
    res.status(500).json({ error: 'Error al obtener razas' });
  }
}

/** GET /classes?campaignId= (opcional). */
export async function getClasses(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const campaignId = getCampaignIdFromQuery(req);
    const list = await contentService.getClasses(campaignId, userId);
    res.json(list);
  } catch (err) {
    console.error('Error getClasses:', err);
    res.status(500).json({ error: 'Error al obtener clases' });
  }
}

/** GET /spells?campaignId= (opcional). */
export async function getSpells(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const campaignId = getCampaignIdFromQuery(req);
    const list = await contentService.getSpells(campaignId, userId);
    res.json(list);
  } catch (err) {
    console.error('Error getSpells:', err);
    res.status(500).json({ error: 'Error al obtener hechizos' });
  }
}

/** GET /monsters?campaignId= (opcional). */
export async function getMonsters(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const campaignId = getCampaignIdFromQuery(req);
    const list = await contentService.getMonsters(campaignId, userId);
    res.json(list);
  } catch (err) {
    console.error('Error getMonsters:', err);
    res.status(500).json({ error: 'Error al obtener monstruos' });
  }
}

/** GET /character-creation-options?campaignId= (opcional). Una sola respuesta: razas, clases, trasfondos y alineamientos (oficial + homebrew según campaña). */
export async function getCharacterCreationOptions(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const campaignId = getCampaignIdFromQuery(req);
    const [races, classes, backgrounds] = await Promise.all([
      contentService.getRaces(campaignId, userId),
      contentService.getClasses(campaignId, userId),
      contentService.getBackgrounds(campaignId, userId),
    ]);
    res.json({
      races,
      classes,
      backgrounds,
      alignments,
    });
  } catch (err) {
    console.error('Error getCharacterCreationOptions:', err);
    res.status(500).json({ error: 'Error al obtener opciones de creación' });
  }
}

/** GET /races/:id?campaignId= (opcional). Una raza por id (oficial o homebrew de la campaña). */
export async function getRaceById(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const { id } = req.params;
    const campaignId = getCampaignIdFromQuery(req);
    const race = await contentService.findRaceById(id, campaignId, userId);
    if (!race) {
      res.status(404).json({ error: 'Raza no encontrada' });
      return;
    }
    res.json(race);
  } catch (err) {
    console.error('Error getRaceById:', err);
    res.status(500).json({ error: 'Error al obtener raza' });
  }
}

/** GET /classes/:id?campaignId= (opcional). */
export async function getClassById(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const { id } = req.params;
    const campaignId = getCampaignIdFromQuery(req);
    const charClass = await contentService.findClassById(id, campaignId, userId);
    if (!charClass) {
      res.status(404).json({ error: 'Clase no encontrada' });
      return;
    }
    res.json(charClass);
  } catch (err) {
    console.error('Error getClassById:', err);
    res.status(500).json({ error: 'Error al obtener clase' });
  }
}

/** GET /spells/:id?campaignId= (opcional). */
export async function getSpellById(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const { id } = req.params;
    const campaignId = getCampaignIdFromQuery(req);
    const spell = await contentService.findSpellById(id, campaignId, userId);
    if (!spell) {
      res.status(404).json({ error: 'Hechizo no encontrado' });
      return;
    }
    res.json(spell);
  } catch (err) {
    console.error('Error getSpellById:', err);
    res.status(500).json({ error: 'Error al obtener hechizo' });
  }
}

/** GET /monsters/:id?campaignId= (opcional). */
export async function getMonsterById(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const { id } = req.params;
    const campaignId = getCampaignIdFromQuery(req);
    const monster = await contentService.findMonsterById(id, campaignId, userId);
    if (!monster) {
      res.status(404).json({ error: 'Monstruo no encontrado' });
      return;
    }
    res.json(monster);
  } catch (err) {
    console.error('Error getMonsterById:', err);
    res.status(500).json({ error: 'Error al obtener monstruo' });
  }
}
