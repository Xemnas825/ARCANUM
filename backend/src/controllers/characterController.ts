import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../database/pool.js';
import { CreateCharacterRequest, UpdateGameStatsRequest } from '../types/index.js';
import { races, classes, backgrounds, alignments } from '../data/dnd-data.js';
import { getSkillKeyFromBackgroundName } from '../constants/skills.js';
import { buildCharacterSheet, type CharacterRow, type AbilitiesRow, type GameStatsRow } from '../services/characterSheetService.js';
import type { AuthRequest } from '../middleware/auth.js';

// ===== CREAR PERSONAJE =====
export async function createCharacter(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const {
      nameEs,
      nameEn,
      raceId,
      subraceId,
      classId,
      subclassId,
      backgroundId,
      alignmentId,
      skillProficiencies = [],
      personality,
      abilities: abilitiesInput,
    } = req.body as CreateCharacterRequest;

    if (!nameEs || !raceId || !classId) {
      res.status(400).json({ error: 'Faltan campos requeridos: nameEs, raceId, classId' });
      return;
    }

    const race = races.find(r => r.id === raceId);
    const charClass = classes.find(c => c.id === classId);
    if (!race || !charClass) {
      res.status(400).json({ error: 'Raza o clase inválida' });
      return;
    }

    if (subraceId && race.subraces && !race.subraces.some(sr => sr.id === subraceId)) {
      res.status(400).json({ error: 'Subraza inválida para esta raza' });
      return;
    }
    if (subclassId && !charClass.subclasses.some(sc => sc.id === subclassId)) {
      res.status(400).json({ error: 'Subclase inválida para esta clase' });
      return;
    }

    const background = backgroundId ? backgrounds.find(b => b.id === backgroundId) ?? null : null;
    const alignment = alignmentId ? alignments.find(a => a.id === alignmentId) ?? null : null;
    if (backgroundId && !background) {
      res.status(400).json({ error: 'Trasfondo inválido' });
      return;
    }
    if (alignmentId && !alignment) {
      res.status(400).json({ error: 'Alineamiento inválido' });
      return;
    }

    const classSkillOptions = charClass.skillOptions || [];
    const maxClassSkills = 2;
    const chosenFromClass = skillProficiencies.filter(k => classSkillOptions.includes(k));
    if (chosenFromClass.length > maxClassSkills) {
      res.status(400).json({ error: `Solo puedes elegir hasta ${maxClassSkills} competencias de la lista de tu clase` });
      return;
    }
    if (chosenFromClass.some(k => !classSkillOptions.includes(k))) {
      res.status(400).json({ error: 'Alguna competencia elegida no pertenece a las opciones de tu clase' });
      return;
    }

    const characterId = uuidv4();
    const abilitiesId = uuidv4();
    const gameStatsId = uuidv4();

    const clamp = (n: number) => Math.max(8, Math.min(20, Math.floor(Number(n)) || 10));
    let baseAbilities = {
      strength: clamp(abilitiesInput?.strength ?? 10),
      dexterity: clamp(abilitiesInput?.dexterity ?? 10),
      constitution: clamp(abilitiesInput?.constitution ?? 10),
      intelligence: clamp(abilitiesInput?.intelligence ?? 10),
      wisdom: clamp(abilitiesInput?.wisdom ?? 10),
      charisma: clamp(abilitiesInput?.charisma ?? 10),
    };
    baseAbilities.strength += race.abilityBonus.strength || 0;
    baseAbilities.dexterity += race.abilityBonus.dexterity || 0;
    baseAbilities.constitution += race.abilityBonus.constitution || 0;
    baseAbilities.intelligence += race.abilityBonus.intelligence || 0;
    baseAbilities.wisdom += race.abilityBonus.wisdom || 0;
    baseAbilities.charisma += race.abilityBonus.charisma || 0;
    if (subraceId && race.subraces) {
      const subrace = race.subraces.find(sr => sr.id === subraceId);
      if (subrace?.abilityBonus) {
        baseAbilities.strength += subrace.abilityBonus.strength || 0;
        baseAbilities.dexterity += subrace.abilityBonus.dexterity || 0;
        baseAbilities.constitution += subrace.abilityBonus.constitution || 0;
        baseAbilities.intelligence += subrace.abilityBonus.intelligence || 0;
        baseAbilities.wisdom += subrace.abilityBonus.wisdom || 0;
        baseAbilities.charisma += subrace.abilityBonus.charisma || 0;
      }
    }

    const constitutionModifier = Math.floor((baseAbilities.constitution - 10) / 2);
    const maxHealth = Math.max(1, charClass.hitDice + constitutionModifier);

    await pool.query(
      `INSERT INTO characters (id, user_id, name_es, name_en, race_id, subrace_id, class_id, subclass_id, level, experience, background_id, alignment_id, personality_ideals, personality_bonds, personality_flaws)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, 0, $9, $10, $11, $12, $13)`,
      [
        characterId,
        userId,
        nameEs,
        nameEn || null,
        raceId,
        subraceId || null,
        classId,
        subclassId || null,
        backgroundId || null,
        alignmentId || null,
        personality?.ideals ?? null,
        personality?.bonds ?? null,
        personality?.flaws ?? null,
      ]
    );

    await pool.query(
      `INSERT INTO abilities (id, character_id, strength, dexterity, constitution, intelligence, wisdom, charisma)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [abilitiesId, characterId, baseAbilities.strength, baseAbilities.dexterity, baseAbilities.constitution, baseAbilities.intelligence, baseAbilities.wisdom, baseAbilities.charisma]
    );

    await pool.query(
      `INSERT INTO game_stats (id, character_id, current_health, maximum_health, current_gold, inspiration_points)
       VALUES ($1, $2, $3, $4, 0, 0)`,
      [gameStatsId, characterId, maxHealth, maxHealth]
    );

    const proficientSkillKeys = new Set<string>(chosenFromClass);
    if (background?.skillProficiencies) {
      background.skillProficiencies.forEach(name => {
        proficientSkillKeys.add(getSkillKeyFromBackgroundName(name));
      });
    }
    for (const skillKey of proficientSkillKeys) {
      await pool.query(
        `INSERT INTO character_skills (character_id, skill_key) VALUES ($1, $2) ON CONFLICT (character_id, skill_key) DO NOTHING`,
        [characterId, skillKey]
      );
    }

    const charResult = await pool.query(
      `SELECT id, user_id, name_es, name_en, race_id, subrace_id, class_id, subclass_id, level, experience, background_id, alignment_id, personality_ideals, personality_bonds, personality_flaws, created_at, updated_at FROM characters WHERE id = $1`,
      [characterId]
    );
    const abilResult = await pool.query(
      `SELECT strength, dexterity, constitution, intelligence, wisdom, charisma FROM abilities WHERE character_id = $1`,
      [characterId]
    );
    const statsResult = await pool.query(
      `SELECT current_health, maximum_health, current_gold, inspiration_points, spell_slots_level_1, spell_slots_level_2, spell_slots_level_3, spell_slots_level_4, spell_slots_level_5, spell_slots_level_6, spell_slots_level_7, spell_slots_level_8, spell_slots_level_9, concentrating_on FROM game_stats WHERE character_id = $1`,
      [characterId]
    );
    const skillsResult = await pool.query(
      `SELECT skill_key FROM character_skills WHERE character_id = $1`,
      [characterId]
    );

    const charRow = charResult.rows[0] as CharacterRow;
    const abilRow = abilResult.rows[0] as AbilitiesRow;
    const statsRow = statsResult.rows[0] as GameStatsRow;
    const proficientKeys = (skillsResult.rows as { skill_key: string }[]).map(r => r.skill_key);

    const sheet = buildCharacterSheet(
      charRow,
      abilRow,
      statsRow,
      proficientKeys,
      race,
      charClass,
      background,
      alignment ?? null,
      [],
      []
    );

    res.status(201).json(sheet);
  } catch (error) {
    console.error('Error creando personaje:', error);
    res.status(500).json({ error: 'Error al crear personaje' });
  }
}

// ===== OBTENER PERSONAJE (FICHA COMPLETA) =====
export async function getCharacter(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const { id } = req.params;

    const charResult = await pool.query(
      `SELECT id, user_id, name_es, name_en, race_id, subrace_id, class_id, subclass_id, level, experience, background_id, alignment_id, personality_ideals, personality_bonds, personality_flaws, created_at, updated_at
       FROM characters WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (charResult.rows.length === 0) {
      res.status(404).json({ error: 'Personaje no encontrado' });
      return;
    }

    const character = charResult.rows[0] as CharacterRow;

    const [abilResult, statsResult, skillsResult, conditionsResult, inventoryResult] = await Promise.all([
      pool.query(
        `SELECT strength, dexterity, constitution, intelligence, wisdom, charisma FROM abilities WHERE character_id = $1`,
        [id]
      ),
      pool.query(
        `SELECT current_health, maximum_health, current_gold, inspiration_points, spell_slots_level_1, spell_slots_level_2, spell_slots_level_3, spell_slots_level_4, spell_slots_level_5, spell_slots_level_6, spell_slots_level_7, spell_slots_level_8, spell_slots_level_9, concentrating_on FROM game_stats WHERE character_id = $1`,
        [id]
      ),
      pool.query(`SELECT skill_key FROM character_skills WHERE character_id = $1`, [id]),
      pool.query(`SELECT condition_id FROM character_conditions WHERE character_id = $1`, [id]),
      pool.query(`SELECT id, name, quantity FROM character_inventory WHERE character_id = $1 ORDER BY name`, [id]),
    ]);

    const abilities = abilResult.rows[0] as AbilitiesRow | undefined;
    const gameStats = statsResult.rows[0] as GameStatsRow | undefined;
    if (!abilities || !gameStats) {
      res.status(500).json({ error: 'Datos del personaje incompletos' });
      return;
    }

    const race = races.find(r => r.id === character.race_id);
    const charClass = classes.find(c => c.id === character.class_id);
    if (!race || !charClass) {
      res.status(500).json({ error: 'Raza o clase del personaje no encontrada en datos' });
      return;
    }

    const background = character.background_id
      ? backgrounds.find(b => b.id === character.background_id) ?? null
      : null;
    const alignment = character.alignment_id
      ? alignments.find(a => a.id === character.alignment_id) ?? null
      : null;

    const proficientKeys = (skillsResult.rows as { skill_key: string }[]).map(r => r.skill_key);
    const activeConditionIds = (conditionsResult.rows as { condition_id: string }[]).map(r => r.condition_id);
    const inventoryRows = (inventoryResult.rows as { id: string; name: string; quantity: number }[]).map(r => ({
      id: r.id,
      name: r.name,
      quantity: r.quantity,
    }));
    const sheet = buildCharacterSheet(
      character,
      abilities,
      gameStats,
      proficientKeys,
      race,
      charClass,
      background,
      alignment,
      activeConditionIds,
      inventoryRows
    );

    res.json(sheet);
  } catch (error) {
    console.error('Error obteniendo personaje:', error);
    res.status(500).json({ error: 'Error al obtener personaje' });
  }
}

// ===== LISTAR PERSONAJES DE UN USUARIO =====
export async function getUserCharacters(req: AuthRequest, res: Response) {
  try {
    const authUserId = req.userId;
    if (authUserId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const { userId } = req.params;
    if (String(authUserId) !== userId) {
      res.status(403).json({ error: 'No puedes listar personajes de otro usuario' });
      return;
    }

    const result = await pool.query(
      `SELECT id, name_es, name_en, race_id, subrace_id, class_id, subclass_id, level, experience, created_at
       FROM characters WHERE user_id = $1 ORDER BY updated_at DESC`,
      [authUserId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error listando personajes:', error);
    res.status(500).json({ error: 'Error al listar personajes' });
  }
}

// ===== ACTUALIZAR ESTADISTICAS DE PARTIDA =====
export async function updateGameStats(req: AuthRequest, res: Response) {
  try {
    const authUserId = req.userId;
    if (authUserId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const { characterId } = req.params;
    const ownerCheck = await pool.query(
      `SELECT id FROM characters WHERE id = $1 AND user_id = $2`,
      [characterId, authUserId]
    );
    if (ownerCheck.rows.length === 0) {
      res.status(404).json({ error: 'Personaje no encontrado' });
      return;
    }

    const { currentHealth, maximumHealth, currentGold, spellSlotsUsed, inspirationPoints, concentratingOn } = req.body as UpdateGameStatsRequest;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (currentHealth !== undefined) {
      updates.push(`current_health = $${paramCount++}`);
      values.push(currentHealth);
    }
    if (maximumHealth !== undefined) {
      updates.push(`maximum_health = $${paramCount++}`);
      values.push(maximumHealth);
    }

    if (currentGold !== undefined) {
      updates.push(`current_gold = $${paramCount++}`);
      values.push(currentGold);
    }

    if (inspirationPoints !== undefined) {
      updates.push(`inspiration_points = $${paramCount++}`);
      values.push(inspirationPoints);
    }
    if (concentratingOn !== undefined) {
      updates.push(`concentrating_on = $${paramCount++}`);
      values.push(concentratingOn === '' ? null : concentratingOn);
    }

    if (spellSlotsUsed) {
      if (spellSlotsUsed.level1 !== undefined) {
        updates.push(`spell_slots_level_1 = $${paramCount++}`);
        values.push(spellSlotsUsed.level1);
      }
      if (spellSlotsUsed.level2 !== undefined) {
        updates.push(`spell_slots_level_2 = $${paramCount++}`);
        values.push(spellSlotsUsed.level2);
      }
      if (spellSlotsUsed.level3 !== undefined) {
        updates.push(`spell_slots_level_3 = $${paramCount++}`);
        values.push(spellSlotsUsed.level3);
      }
      if (spellSlotsUsed.level4 !== undefined) {
        updates.push(`spell_slots_level_4 = $${paramCount++}`);
        values.push(spellSlotsUsed.level4);
      }
      if (spellSlotsUsed.level5 !== undefined) {
        updates.push(`spell_slots_level_5 = $${paramCount++}`);
        values.push(spellSlotsUsed.level5);
      }
      if (spellSlotsUsed.level6 !== undefined) {
        updates.push(`spell_slots_level_6 = $${paramCount++}`);
        values.push(spellSlotsUsed.level6);
      }
      if (spellSlotsUsed.level7 !== undefined) {
        updates.push(`spell_slots_level_7 = $${paramCount++}`);
        values.push(spellSlotsUsed.level7);
      }
      if (spellSlotsUsed.level8 !== undefined) {
        updates.push(`spell_slots_level_8 = $${paramCount++}`);
        values.push(spellSlotsUsed.level8);
      }
      if (spellSlotsUsed.level9 !== undefined) {
        updates.push(`spell_slots_level_9 = $${paramCount++}`);
        values.push(spellSlotsUsed.level9);
      }
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(characterId);

    const query = `UPDATE game_stats SET ${updates.join(', ')} WHERE character_id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Personaje no encontrado' });
      return;
    }

    res.json({
      message: 'Estadísticas actualizadas',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error actualizando estadísticas:', error);
    res.status(500).json({ error: 'Error al actualizar estadísticas' });
  }
}

// ===== ESTABLECER CONDICIONES ACTIVAS =====
export async function setCharacterConditions(req: AuthRequest, res: Response) {
  try {
    const authUserId = req.userId;
    if (authUserId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const { id } = req.params;
    const { conditionIds } = req.body as { conditionIds?: string[] };

    const owner = await pool.query(
      `SELECT id FROM characters WHERE id = $1 AND user_id = $2`,
      [id, authUserId]
    );
    if (owner.rows.length === 0) {
      res.status(404).json({ error: 'Personaje no encontrado' });
      return;
    }

    await pool.query(`DELETE FROM character_conditions WHERE character_id = $1`, [id]);
    const ids = Array.isArray(conditionIds) ? conditionIds : [];
    for (const cid of ids) {
      if (typeof cid === 'string' && cid.trim()) {
        await pool.query(
          `INSERT INTO character_conditions (character_id, condition_id) VALUES ($1, $2) ON CONFLICT (character_id, condition_id) DO NOTHING`,
          [id, cid.trim()]
        );
      }
    }

    res.json({ message: 'Condiciones actualizadas', conditionIds: ids });
  } catch (error) {
    console.error('Error actualizando condiciones:', error);
    res.status(500).json({ error: 'Error al actualizar condiciones' });
  }
}

// ===== AÑADIR OBJETO AL INVENTARIO =====
export async function addInventoryItem(req: AuthRequest, res: Response) {
  try {
    const authUserId = req.userId;
    if (authUserId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const { id } = req.params;
    const { name, quantity = 1 } = req.body as { name?: string; quantity?: number };

    const owner = await pool.query(
      `SELECT id FROM characters WHERE id = $1 AND user_id = $2`,
      [id, authUserId]
    );
    if (owner.rows.length === 0) {
      res.status(404).json({ error: 'Personaje no encontrado' });
      return;
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Nombre del objeto requerido' });
      return;
    }

    const itemId = uuidv4();
    const qty = Math.max(0, Math.floor(Number(quantity) || 1));
    await pool.query(
      `INSERT INTO character_inventory (id, character_id, name, quantity) VALUES ($1, $2, $3, $4)`,
      [itemId, id, name.trim(), qty]
    );

    res.status(201).json({ id: itemId, name: name.trim(), quantity: qty });
  } catch (error) {
    console.error('Error añadiendo objeto:', error);
    res.status(500).json({ error: 'Error al añadir objeto' });
  }
}

// ===== ACTUALIZAR OBJETO DEL INVENTARIO =====
export async function updateInventoryItem(req: AuthRequest, res: Response) {
  try {
    const authUserId = req.userId;
    if (authUserId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const { id, itemId } = req.params;
    const { name, quantity } = req.body as { name?: string; quantity?: number };

    const owner = await pool.query(
      `SELECT id FROM characters WHERE id = $1 AND user_id = $2`,
      [id, authUserId]
    );
    if (owner.rows.length === 0) {
      res.status(404).json({ error: 'Personaje no encontrado' });
      return;
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let p = 1;
    if (name !== undefined && typeof name === 'string') {
      updates.push(`name = $${p++}`);
      values.push(name.trim());
    }
    if (quantity !== undefined) {
      updates.push(`quantity = $${p++}`);
      values.push(Math.max(0, Math.floor(Number(quantity))));
    }
    if (updates.length === 0) {
      res.status(400).json({ error: 'Nada que actualizar' });
      return;
    }
    values.push(itemId, id);
    const result = await pool.query(
      `UPDATE character_inventory SET ${updates.join(', ')} WHERE id = $${p} AND character_id = $${p + 1} RETURNING id, name, quantity`,
      values
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Objeto no encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando objeto:', error);
    res.status(500).json({ error: 'Error al actualizar objeto' });
  }
}

// ===== ELIMINAR OBJETO DEL INVENTARIO =====
export async function deleteInventoryItem(req: AuthRequest, res: Response) {
  try {
    const authUserId = req.userId;
    if (authUserId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const { id, itemId } = req.params;

    const owner = await pool.query(
      `SELECT id FROM characters WHERE id = $1 AND user_id = $2`,
      [id, authUserId]
    );
    if (owner.rows.length === 0) {
      res.status(404).json({ error: 'Personaje no encontrado' });
      return;
    }

    const result = await pool.query(
      `DELETE FROM character_inventory WHERE id = $1 AND character_id = $2 RETURNING id`,
      [itemId, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Objeto no encontrado' });
      return;
    }
    res.json({ message: 'Objeto eliminado' });
  } catch (error) {
    console.error('Error eliminando objeto:', error);
    res.status(500).json({ error: 'Error al eliminar objeto' });
  }
}

// ===== ELIMINAR PERSONAJE =====
export async function deleteCharacter(req: AuthRequest, res: Response) {
  try {
    const authUserId = req.userId;
    if (authUserId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM characters WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, authUserId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Personaje no encontrado' });
      return;
    }

    res.json({ message: 'Personaje eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando personaje:', error);
    res.status(500).json({ error: 'Error al eliminar personaje' });
  }
}
