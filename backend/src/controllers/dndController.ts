import { Request, Response } from 'express';
import {
  races,
  classes,
  spells,
  weapons,
  armor,
  backgrounds,
  feats,
  monsters,
  conditions,
  alignments,
  magicItems,
} from '../data/dnd-data.js';

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

// ===== OBTENER SUBRAZA POR ID =====
export function getSubraceById(req: Request, res: Response) {
  const { raceId, subraceId } = req.params;
  const race = races.find((r) => r.id === raceId);
  
  if (!race || !race.subraces) {
    res.status(404).json({ error: 'Raza o subraza no encontrada' });
    return;
  }
  
  const subrace = race.subraces.find((sr) => sr.id === subraceId);
  
  if (!subrace) {
    res.status(404).json({ error: 'Subraza no encontrada' });
    return;
  }
  
  res.json(subrace);
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

// ===== OBTENER SUBCLASE POR ID =====
export function getSubclassById(req: Request, res: Response) {
  const { classId, subclassId } = req.params;
  const charClass = classes.find((c) => c.id === classId);
  
  if (!charClass) {
    res.status(404).json({ error: 'Clase no encontrada' });
    return;
  }
  
  const subclass = charClass.subclasses.find((sc) => sc.id === subclassId);
  
  if (!subclass) {
    res.status(404).json({ error: 'Subclase no encontrada' });
    return;
  }
  
  res.json(subclass);
}

// ===== OBTENER TODOS LOS HECHIZOS =====
export function getAllSpells(req: Request, res: Response) {
  res.json(spells);
}

// ===== OBTENER HECHIZO POR ID =====
export function getSpellById(req: Request, res: Response) {
  const { id } = req.params;
  const spell = spells.find((s) => s.id === id);
  
  if (!spell) {
    res.status(404).json({ error: 'Hechizo no encontrado' });
    return;
  }
  
  res.json(spell);
}

// ===== OBTENER TODAS LAS ARMAS =====
export function getAllWeapons(req: Request, res: Response) {
  res.json(weapons);
}

// ===== OBTENER ARMA POR ID =====
export function getWeaponById(req: Request, res: Response) {
  const { id } = req.params;
  const weapon = weapons.find((w) => w.id === id);
  
  if (!weapon) {
    res.status(404).json({ error: 'Arma no encontrada' });
    return;
  }
  
  res.json(weapon);
}

// ===== OBTENER TODA LA ARMADURA =====
export function getAllArmor(req: Request, res: Response) {
  res.json(armor);
}

// ===== OBTENER ARMADURA POR ID =====
export function getArmorById(req: Request, res: Response) {
  const { id } = req.params;
  const armorPiece = armor.find((a) => a.id === id);
  
  if (!armorPiece) {
    res.status(404).json({ error: 'Armadura no encontrada' });
    return;
  }
  
  res.json(armorPiece);
}

// ===== OBTENER TODOS LOS TRASFONDOS =====
export function getAllBackgrounds(req: Request, res: Response) {
  res.json(backgrounds);
}

// ===== OBTENER TRASFONDO POR ID =====
export function getBackgroundById(req: Request, res: Response) {
  const { id } = req.params;
  const background = backgrounds.find((b) => b.id === id);
  
  if (!background) {
    res.status(404).json({ error: 'Trasfondo no encontrado' });
    return;
  }
  
  res.json(background);
}

// ===== OBTENER TODOS LOS TALENTOS =====
export function getAllFeats(req: Request, res: Response) {
  res.json(feats);
}

// ===== OBTENER TALENTO POR ID =====
export function getFeatById(req: Request, res: Response) {
  const { id } = req.params;
  const feat = feats.find((f) => f.id === id);
  
  if (!feat) {
    res.status(404).json({ error: 'Talento no encontrado' });
    return;
  }
  
  res.json(feat);
}

// ===== OBTENER TODOS LOS MONSTRUOS =====
export function getAllMonsters(req: Request, res: Response) {
  res.json(monsters);
}

// ===== OBTENER MONSTRUO POR ID =====
export function getMonsterById(req: Request, res: Response) {
  const { id } = req.params;
  const monster = monsters.find((m) => m.id === id);
  
  if (!monster) {
    res.status(404).json({ error: 'Monstruo no encontrado' });
    return;
  }
  
  res.json(monster);
}

// ===== OBTENER TODAS LAS CONDICIONES =====
export function getAllConditions(req: Request, res: Response) {
  res.json(conditions);
}

// ===== OBTENER CONDICIÓN POR ID =====
export function getConditionById(req: Request, res: Response) {
  const { id } = req.params;
  const condition = conditions.find((c) => c.id === id);
  
  if (!condition) {
    res.status(404).json({ error: 'Condición no encontrada' });
    return;
  }
  
  res.json(condition);
}

// ===== OBTENER TODOS LOS ALINEAMIENTOS =====
export function getAllAlignments(req: Request, res: Response) {
  res.json(alignments);
}

// ===== OBTENER ALINEAMIENTO POR ID =====
export function getAlignmentById(req: Request, res: Response) {
  const { id } = req.params;
  const alignment = alignments.find((a) => a.id === id);
  
  if (!alignment) {
    res.status(404).json({ error: 'Alineamiento no encontrado' });
    return;
  }
  
  res.json(alignment);
}

// ===== OBTENER TODOS LOS ITEMS MÁGICOS =====
export function getAllMagicItems(req: Request, res: Response) {
  res.json(magicItems);
}

// ===== OBTENER ITEM MÁGICO POR ID =====
export function getMagicItemById(req: Request, res: Response) {
  const { id } = req.params;
  const item = magicItems.find((i) => i.id === id);
  
  if (!item) {
    res.status(404).json({ error: 'Item mágico no encontrado' });
    return;
  }
  
  res.json(item);
}
