import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../database/pool.js';
import { Character, CreateCharacterRequest, UpdateGameStatsRequest } from '../types/index.js';

// ===== CREAR PERSONAJE =====
export async function createCharacter(req: Request, res: Response) {
  try {
    const { nameEs, nameEn, raceId, classId, userId } = req.body as CreateCharacterRequest & { nameEn?: string; userId: string };

    if (!nameEs || !raceId || !classId || !userId) {
      res.status(400).json({ error: 'Faltan campos requeridos' });
      return;
    }

    const characterId = uuidv4();
    const abilitiesId = uuidv4();
    const gameStatsId = uuidv4();

    // Inicializar habilidades estándar
    const baseAbilities = {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    };

    // Calcular HP inicial (simplificado: 8 + modificador de constitución)
    const constitutionModifier = Math.floor((baseAbilities.constitution - 10) / 2);
    const maxHealth = 8 + constitutionModifier;

    await pool.query(
      `INSERT INTO characters (id, user_id, name_es, name_en, race_id, class_id, level, experience)
       VALUES ($1, $2, $3, $4, $5, $6, 1, 0)`,
      [characterId, userId, nameEs, nameEn || null, raceId, classId]
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

    res.status(201).json({
      id: characterId,
      nameEs,
      nameEn: nameEn || null,
      raceId,
      classId,
      level: 1,
      experience: 0,
      health: { current: maxHealth, maximum: maxHealth },
      gold: 0,
      inspiration: 0,
    });
  } catch (error) {
    console.error('Error creando personaje:', error);
    res.status(500).json({ error: 'Error al crear personaje' });
  }
}

// ===== OBTENER PERSONAJE =====
export async function getCharacter(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const charResult = await pool.query(
      `SELECT id, user_id, name_es, name_en, race_id, class_id, level, experience, created_at, updated_at
       FROM characters WHERE id = $1`,
      [id]
    );

    if (charResult.rows.length === 0) {
      res.status(404).json({ error: 'Personaje no encontrado' });
      return;
    }

    const character = charResult.rows[0];

    const abilResult = await pool.query(
      `SELECT strength, dexterity, constitution, intelligence, wisdom, charisma
       FROM abilities WHERE character_id = $1`,
      [id]
    );

    const statsResult = await pool.query(
      `SELECT current_health, maximum_health, current_gold, inspiration_points, spell_slots_level_1, spell_slots_level_2, spell_slots_level_3, spell_slots_level_4, spell_slots_level_5, spell_slots_level_6, spell_slots_level_7, spell_slots_level_8, spell_slots_level_9
       FROM game_stats WHERE character_id = $1`,
      [id]
    );

    const abilities = abilResult.rows[0] || {};
    const stats = statsResult.rows[0] || {};

    res.json({
      id: character.id,
      userId: character.user_id,
      nameEs: character.name_es,
      nameEn: character.name_en,
      raceId: character.race_id,
      classId: character.class_id,
      level: character.level,
      experience: character.experience,
      abilities,
      health: {
        current: stats.current_health,
        maximum: stats.maximum_health,
      },
      gold: stats.current_gold,
      inspiration: stats.inspiration_points,
      spellSlots: {
        level1: stats.spell_slots_level_1,
        level2: stats.spell_slots_level_2,
        level3: stats.spell_slots_level_3,
        level4: stats.spell_slots_level_4,
        level5: stats.spell_slots_level_5,
        level6: stats.spell_slots_level_6,
        level7: stats.spell_slots_level_7,
        level8: stats.spell_slots_level_8,
        level9: stats.spell_slots_level_9,
      },
      createdAt: character.created_at,
      updatedAt: character.updated_at,
    });
  } catch (error) {
    console.error('Error obteniendo personaje:', error);
    res.status(500).json({ error: 'Error al obtener personaje' });
  }
}

// ===== LISTAR PERSONAJES DE UN USUARIO =====
export async function getUserCharacters(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT id, name_es, name_en, race_id, class_id, level, experience, created_at
       FROM characters WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error listando personajes:', error);
    res.status(500).json({ error: 'Error al listar personajes' });
  }
}

// ===== ACTUALIZAR ESTADISTICAS DE PARTIDA =====
export async function updateGameStats(req: Request, res: Response) {
  try {
    const { characterId } = req.params;
    const { currentHealth, currentGold, spellSlotsUsed, inspirationPoints } = req.body as UpdateGameStatsRequest;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (currentHealth !== undefined) {
      updates.push(`current_health = $${paramCount++}`);
      values.push(currentHealth);
    }

    if (currentGold !== undefined) {
      updates.push(`current_gold = $${paramCount++}`);
      values.push(currentGold);
    }

    if (inspirationPoints !== undefined) {
      updates.push(`inspiration_points = $${paramCount++}`);
      values.push(inspirationPoints);
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

// ===== ELIMINAR PERSONAJE =====
export async function deleteCharacter(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM characters WHERE id = $1 RETURNING id`,
      [id]
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
