import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../database/pool.js';
import * as contentService from '../services/contentService.js';
import type { AuthRequest } from '../middleware/auth.js';

type EncounterRow = {
  id: string;
  campaign_id: string;
  name: string;
  status: 'active' | 'paused' | 'finished';
  round: number;
  active_index: number;
  created_by: number;
  created_at: string;
  updated_at: string;
};

type ActionType = 'attack' | 'damage' | 'heal' | 'save' | 'condition' | 'concentration' | 'note';
type TemplateItem = {
  kind: 'character' | 'monster' | 'custom';
  refId?: string | null;
  name?: string;
  initiative?: number;
  hpCurrent?: number;
  hpMax?: number;
  ac?: number | null;
  isHidden?: boolean;
  concentratingOn?: string | null;
};

async function ensureEncounterInCampaign(encounterId: string, campaignId: string) {
  const result = await pool.query<EncounterRow>(
    `SELECT * FROM encounters WHERE id = $1 AND campaign_id = $2`,
    [encounterId, campaignId]
  );
  return result.rows[0] ?? null;
}

async function ensureCombatantInEncounter(encounterId: string, combatantId: string, client: { query: typeof pool.query }) {
  const result = await client.query(
    `SELECT id, name, hp_current, hp_max, concentrating_on
     FROM encounter_combatants
     WHERE id = $1 AND encounter_id = $2`,
    [combatantId, encounterId]
  );
  return result.rows[0] as
    | { id: string; name: string; hp_current: number; hp_max: number; concentrating_on?: string | null }
    | undefined;
}

async function getOrderedCombatantIds(encounterId: string, client: { query: typeof pool.query }) {
  const result = await client.query(
    `SELECT id
     FROM encounter_combatants
     WHERE encounter_id = $1
     ORDER BY initiative DESC, created_at ASC`,
    [encounterId]
  );
  return result.rows.map((r) => r.id as string);
}

async function resolveCombatantInput(
  body: TemplateItem,
  campaignId: string,
  userId: number,
  client: { query: typeof pool.query }
) {
  const kind = body.kind ?? 'custom';
  let name = body.name?.trim() || '';
  let hpMax = Math.max(1, Math.floor(Number(body.hpMax) || 1));
  let hpCurrent = Math.max(0, Math.floor(Number(body.hpCurrent ?? hpMax)));
  let ac = body.ac != null ? Math.max(1, Math.floor(Number(body.ac))) : null;
  const initiative = Math.floor(Number(body.initiative) || 0);
  const concentratingOn = body.concentratingOn ? String(body.concentratingOn).trim() : null;
  const refId = body.refId ?? null;

  if (kind === 'character' && refId) {
    const charResult = await client.query(
      `SELECT ch.name_es, ch.name_en, gs.current_health, gs.maximum_health
       FROM characters ch
       LEFT JOIN game_stats gs ON gs.character_id = ch.id
       WHERE ch.id = $1 AND ch.campaign_id = $2`,
      [refId, campaignId]
    );
    if (charResult.rows.length > 0) {
      const row = charResult.rows[0] as {
        name_es?: string;
        name_en?: string;
        current_health?: number;
        maximum_health?: number;
      };
      name = row.name_es || row.name_en || name || 'Personaje';
      hpMax = Math.max(1, Number(row.maximum_health) || hpMax);
      hpCurrent = Math.max(0, Number(row.current_health) || hpCurrent);
    } else if (!name) {
      name = 'Personaje';
    }
  } else if (kind === 'monster' && refId) {
    const monster = await contentService.findMonsterById(refId, campaignId, userId);
    if (monster) {
      name = monster.nameEs || monster.nameEn;
      hpMax = Math.max(1, Number(monster.hp) || hpMax);
      hpCurrent = Math.min(hpMax, Math.max(0, Number(body.hpCurrent ?? hpMax)));
      ac = monster.ac ?? ac;
    } else if (!name) {
      name = 'Monstruo';
    }
  } else if (!name) {
    name = 'Combatiente';
  }

  hpCurrent = Math.max(0, Math.min(hpMax, hpCurrent));
  return {
    kind,
    refId,
    name,
    initiative,
    hpCurrent,
    hpMax,
    ac,
    isHidden: Boolean(body.isHidden),
    concentratingOn,
  };
}

export async function listEncounters(req: AuthRequest, res: Response) {
  try {
    const { id: campaignId } = req.params;
    const result = await pool.query(
      `SELECT id, campaign_id, name, status, round, active_index, created_by, created_at, updated_at
       FROM encounters
       WHERE campaign_id = $1
       ORDER BY updated_at DESC`,
      [campaignId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error listando encounters:', err);
    res.status(500).json({ error: 'Error al listar encuentros' });
  }
}

export async function createEncounter(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    const { id: campaignId } = req.params;
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const { name } = (req.body as { name?: string }) ?? {};
    const encounterId = uuidv4();
    const safeName = name?.trim() || 'Encuentro sin nombre';
    await pool.query(
      `INSERT INTO encounters (id, campaign_id, name, created_by) VALUES ($1, $2, $3, $4)`,
      [encounterId, campaignId, safeName, userId]
    );
    const created = await ensureEncounterInCampaign(encounterId, campaignId);
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creando encounter:', err);
    res.status(500).json({ error: 'Error al crear encuentro' });
  }
}

export async function getEncounter(req: AuthRequest, res: Response) {
  try {
    const { id: campaignId, encounterId } = req.params;
    const campaignRole = (req as AuthRequest & { campaignRole?: string }).campaignRole;
    const encounter = await ensureEncounterInCampaign(encounterId, campaignId);
    if (!encounter) {
      res.status(404).json({ error: 'Encuentro no encontrado' });
      return;
    }
    const combatantsResult = await pool.query(
      `SELECT id, encounter_id, kind, ref_id, name, initiative, hp_current, hp_max, ac, concentrating_on, is_hidden, created_at, updated_at
       FROM encounter_combatants
       WHERE encounter_id = $1
       ORDER BY initiative DESC, created_at ASC`,
      [encounterId]
    );
    const conditionsResult = await pool.query(
      `SELECT id, encounter_id, combatant_id, condition_name, rounds_remaining, created_at, updated_at
       FROM encounter_combatant_conditions
       WHERE encounter_id = $1
       ORDER BY created_at ASC`,
      [encounterId]
    );
    const conditionsByCombatant = new Map<string, Array<{
      id: string;
      encounter_id: string;
      combatant_id: string;
      condition_name: string;
      rounds_remaining: number;
      created_at: string;
      updated_at: string;
    }>>();
    for (const row of conditionsResult.rows) {
      const key = String(row.combatant_id);
      const list = conditionsByCombatant.get(key) ?? [];
      list.push(row);
      conditionsByCombatant.set(key, list);
    }
    const isMaster = campaignRole === 'master';
    const combatants = combatantsResult.rows.map((row) => {
      const rowWithConditions = {
        ...row,
        conditions: conditionsByCombatant.get(String(row.id)) ?? [],
      };
      if (isMaster || !row.is_hidden) return rowWithConditions;
      return {
        ...rowWithConditions,
        name: 'Enemigo oculto',
        concentrating_on: null,
        conditions: [],
      };
    });
    res.json({ ...encounter, combatants });
  } catch (err) {
    console.error('Error obteniendo encounter:', err);
    res.status(500).json({ error: 'Error al obtener encuentro' });
  }
}

export async function addCombatant(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    const { id: campaignId, encounterId } = req.params;
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const encounter = await ensureEncounterInCampaign(encounterId, campaignId);
    if (!encounter) {
      res.status(404).json({ error: 'Encuentro no encontrado' });
      return;
    }

    const body = (req.body as TemplateItem) ?? {};
    const resolved = await resolveCombatantInput(body, campaignId, userId, pool);
    if (!resolved.name) {
      res.status(400).json({ error: 'Debes indicar un nombre válido' });
      return;
    }
    const id = uuidv4();

    await pool.query(
      `INSERT INTO encounter_combatants
       (id, encounter_id, kind, ref_id, name, initiative, hp_current, hp_max, ac, concentrating_on, is_hidden)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        encounterId,
        resolved.kind,
        resolved.refId,
        resolved.name,
        resolved.initiative,
        resolved.hpCurrent,
        resolved.hpMax,
        resolved.ac,
        resolved.concentratingOn,
        resolved.isHidden,
      ]
    );

    const created = await pool.query(
      `SELECT id, encounter_id, kind, ref_id, name, initiative, hp_current, hp_max, ac, concentrating_on, is_hidden, created_at, updated_at
       FROM encounter_combatants WHERE id = $1`,
      [id]
    );
    res.status(201).json(created.rows[0]);
  } catch (err) {
    console.error('Error añadiendo combatiente:', err);
    res.status(500).json({ error: 'Error al añadir combatiente' });
  }
}

export async function updateCombatant(req: AuthRequest, res: Response) {
  try {
    const { id: campaignId, encounterId, combatantId } = req.params;
    const encounter = await ensureEncounterInCampaign(encounterId, campaignId);
    if (!encounter) {
      res.status(404).json({ error: 'Encuentro no encontrado' });
      return;
    }

    const body = (req.body as {
      name?: string;
      initiative?: number;
      hpCurrent?: number;
      hpMax?: number;
      ac?: number | null;
      concentratingOn?: string | null;
      isHidden?: boolean;
    }) ?? {};

    const currentResult = await pool.query(
      `SELECT hp_current, hp_max FROM encounter_combatants WHERE id = $1 AND encounter_id = $2`,
      [combatantId, encounterId]
    );
    if (currentResult.rows.length === 0) {
      res.status(404).json({ error: 'Combatiente no encontrado' });
      return;
    }
    const current = currentResult.rows[0] as { hp_current: number; hp_max: number };

    const updates: string[] = [];
    const values: unknown[] = [];
    let p = 1;

    if (body.name !== undefined) {
      updates.push(`name = $${p++}`);
      values.push(String(body.name).trim());
    }
    if (body.initiative !== undefined) {
      updates.push(`initiative = $${p++}`);
      values.push(Math.floor(Number(body.initiative)));
    }
    let nextHpMax = current.hp_max;
    if (body.hpMax !== undefined) {
      nextHpMax = Math.max(1, Math.floor(Number(body.hpMax)));
      updates.push(`hp_max = $${p++}`);
      values.push(nextHpMax);
    }
    if (body.hpCurrent !== undefined) {
      const nextCurrent = Math.max(0, Math.min(nextHpMax, Math.floor(Number(body.hpCurrent))));
      updates.push(`hp_current = $${p++}`);
      values.push(nextCurrent);
    }
    if (body.ac !== undefined) {
      updates.push(`ac = $${p++}`);
      values.push(body.ac == null ? null : Math.max(1, Math.floor(Number(body.ac))));
    }
    if (body.concentratingOn !== undefined) {
      updates.push(`concentrating_on = $${p++}`);
      values.push(body.concentratingOn ? String(body.concentratingOn).trim() : null);
    }
    if (body.isHidden !== undefined) {
      updates.push(`is_hidden = $${p++}`);
      values.push(Boolean(body.isHidden));
    }
    if (updates.length === 0) {
      res.status(400).json({ error: 'Nada que actualizar' });
      return;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(combatantId, encounterId);
    const updated = await pool.query(
      `UPDATE encounter_combatants
       SET ${updates.join(', ')}
       WHERE id = $${p} AND encounter_id = $${p + 1}
       RETURNING id, encounter_id, kind, ref_id, name, initiative, hp_current, hp_max, ac, concentrating_on, is_hidden, created_at, updated_at`,
      values
    );
    res.json(updated.rows[0]);
  } catch (err) {
    console.error('Error actualizando combatiente:', err);
    res.status(500).json({ error: 'Error al actualizar combatiente' });
  }
}

export async function removeCombatant(req: AuthRequest, res: Response) {
  try {
    const { id: campaignId, encounterId, combatantId } = req.params;
    const encounter = await ensureEncounterInCampaign(encounterId, campaignId);
    if (!encounter) {
      res.status(404).json({ error: 'Encuentro no encontrado' });
      return;
    }
    await pool.query(
      `DELETE FROM encounter_combatants WHERE id = $1 AND encounter_id = $2`,
      [combatantId, encounterId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Error eliminando combatiente:', err);
    res.status(500).json({ error: 'Error al eliminar combatiente' });
  }
}

export async function nextTurn(req: AuthRequest, res: Response) {
  try {
    const { id: campaignId, encounterId } = req.params;
    const encounter = await ensureEncounterInCampaign(encounterId, campaignId);
    if (!encounter) {
      res.status(404).json({ error: 'Encuentro no encontrado' });
      return;
    }
    if (encounter.status !== 'active') {
      res.status(400).json({ error: 'El encuentro no está activo' });
      return;
    }
    const client = await pool.connect();
    let updated: EncounterRow | null = null;
    try {
      await client.query('BEGIN');
      const orderedIds = await getOrderedCombatantIds(encounterId, client);
      const total = orderedIds.length;
      if (total <= 0) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'No hay combatientes en el encuentro' });
        return;
      }
      const currentActorId = orderedIds[Math.max(0, Math.min(encounter.active_index, total - 1))];
      if (currentActorId) {
        const condsResult = await client.query(
          `SELECT id, condition_name, rounds_remaining
           FROM encounter_combatant_conditions
           WHERE encounter_id = $1 AND combatant_id = $2`,
          [encounterId, currentActorId]
        );
        for (const cond of condsResult.rows as Array<{ id: string; condition_name: string; rounds_remaining: number }>) {
          const nextRounds = Number(cond.rounds_remaining) - 1;
          if (nextRounds <= 0) {
            await client.query(`DELETE FROM encounter_combatant_conditions WHERE id = $1`, [cond.id]);
            const eventId = uuidv4();
            await client.query(
              `INSERT INTO encounter_events
               (id, encounter_id, actor_combatant_id, target_combatant_id, action_type, payload, created_by)
               VALUES ($1, $2, $3, $4, 'condition', $5::jsonb, $6)`,
              [
                eventId,
                encounterId,
                currentActorId,
                currentActorId,
                JSON.stringify({ condition: cond.condition_name, expired: true }),
                req.userId,
              ]
            );
          } else {
            await client.query(
              `UPDATE encounter_combatant_conditions
               SET rounds_remaining = $1, updated_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [nextRounds, cond.id]
            );
          }
        }
      }
      let nextIndex = encounter.active_index + 1;
      let nextRound = encounter.round;
      if (nextIndex >= total) {
        nextIndex = 0;
        nextRound += 1;
      }
      const updatedResult = await client.query(
        `UPDATE encounters
         SET active_index = $1, round = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING id, campaign_id, name, status, round, active_index, created_by, created_at, updated_at`,
        [nextIndex, nextRound, encounterId]
      );
      updated = updatedResult.rows[0];
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    if (!updated) {
      res.status(500).json({ error: 'No se pudo actualizar el encuentro' });
      return;
    }
    res.json(updated);
  } catch (err) {
    console.error('Error avanzando turno:', err);
    res.status(500).json({ error: 'Error al avanzar turno' });
  }
}

export async function updateEncounter(req: AuthRequest, res: Response) {
  try {
    const { id: campaignId, encounterId } = req.params;
    const encounter = await ensureEncounterInCampaign(encounterId, campaignId);
    if (!encounter) {
      res.status(404).json({ error: 'Encuentro no encontrado' });
      return;
    }

    const body = (req.body as { name?: string; status?: 'active' | 'paused' | 'finished' }) ?? {};
    const updates: string[] = [];
    const values: unknown[] = [];
    let p = 1;

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        res.status(400).json({ error: 'El nombre no puede estar vacío' });
        return;
      }
      updates.push(`name = $${p++}`);
      values.push(name);
    }
    if (body.status !== undefined) {
      if (!['active', 'paused', 'finished'].includes(body.status)) {
        res.status(400).json({ error: 'Estado inválido' });
        return;
      }
      updates.push(`status = $${p++}`);
      values.push(body.status);
    }
    if (updates.length === 0) {
      res.status(400).json({ error: 'Nada que actualizar' });
      return;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(encounterId, campaignId);
    const result = await pool.query(
      `UPDATE encounters
       SET ${updates.join(', ')}
       WHERE id = $${p} AND campaign_id = $${p + 1}
       RETURNING id, campaign_id, name, status, round, active_index, created_by, created_at, updated_at`,
      values
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error actualizando encuentro:', err);
    res.status(500).json({ error: 'Error al actualizar encuentro' });
  }
}

export async function resetEncounterProgress(req: AuthRequest, res: Response) {
  try {
    const { id: campaignId, encounterId } = req.params;
    const encounter = await ensureEncounterInCampaign(encounterId, campaignId);
    if (!encounter) {
      res.status(404).json({ error: 'Encuentro no encontrado' });
      return;
    }
    const updated = await pool.query(
      `UPDATE encounters
       SET round = 1, active_index = 0, status = 'active', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND campaign_id = $2
       RETURNING id, campaign_id, name, status, round, active_index, created_by, created_at, updated_at`,
      [encounterId, campaignId]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    console.error('Error reiniciando encuentro:', err);
    res.status(500).json({ error: 'Error al reiniciar encuentro' });
  }
}

export async function listEncounterEvents(req: AuthRequest, res: Response) {
  try {
    const { id: campaignId, encounterId } = req.params;
    const encounter = await ensureEncounterInCampaign(encounterId, campaignId);
    if (!encounter) {
      res.status(404).json({ error: 'Encuentro no encontrado' });
      return;
    }
    const result = await pool.query(
      `SELECT ev.id, ev.encounter_id, ev.actor_combatant_id, ev.target_combatant_id, ev.action_type, ev.payload, ev.created_by, ev.created_at,
              actor.name AS actor_name, target.name AS target_name
       FROM encounter_events ev
       LEFT JOIN encounter_combatants actor ON actor.id = ev.actor_combatant_id
       LEFT JOIN encounter_combatants target ON target.id = ev.target_combatant_id
       WHERE ev.encounter_id = $1
       ORDER BY ev.created_at DESC
       LIMIT 200`,
      [encounterId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error listando eventos de encounter:', err);
    res.status(500).json({ error: 'Error al listar acciones de combate' });
  }
}

export async function createEncounterAction(req: AuthRequest, res: Response) {
  const userId = req.userId;
  if (userId == null) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }
  const { id: campaignId, encounterId } = req.params;
  const encounter = await ensureEncounterInCampaign(encounterId, campaignId);
  if (!encounter) {
    res.status(404).json({ error: 'Encuentro no encontrado' });
    return;
  }

  const body = (req.body as {
    actorCombatantId?: string | null;
    targetCombatantId?: string | null;
    actionType?: ActionType;
    amount?: number;
    dc?: number;
    success?: boolean;
    condition?: string;
    durationRounds?: number;
    concentratingOn?: string;
    note?: string;
  }) ?? {};
  const actionType = body.actionType;
  if (!actionType || !['attack', 'damage', 'heal', 'save', 'condition', 'concentration', 'note'].includes(actionType)) {
    res.status(400).json({ error: 'actionType inválido' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const actor = body.actorCombatantId
      ? await ensureCombatantInEncounter(encounterId, body.actorCombatantId, client)
      : undefined;
    const target = body.targetCombatantId
      ? await ensureCombatantInEncounter(encounterId, body.targetCombatantId, client)
      : undefined;
    if (body.actorCombatantId && !actor) {
      res.status(404).json({ error: 'Actor no encontrado en el encuentro' });
      await client.query('ROLLBACK');
      return;
    }
    if (body.targetCombatantId && !target) {
      res.status(404).json({ error: 'Objetivo no encontrado en el encuentro' });
      await client.query('ROLLBACK');
      return;
    }

    const payload: Record<string, unknown> = {};
    if (body.note) payload.note = String(body.note).trim();
    if (body.dc != null) payload.dc = Math.max(1, Math.floor(Number(body.dc)));
    if (body.success != null) payload.success = Boolean(body.success);
    if (body.condition) payload.condition = String(body.condition).trim();

    if (actionType === 'damage' || actionType === 'heal') {
      const rawAmount = Math.floor(Number(body.amount) || 0);
      const amount = Math.max(1, rawAmount);
      if (!target) {
        res.status(400).json({ error: 'Las acciones de daño/curación requieren objetivo' });
        await client.query('ROLLBACK');
        return;
      }
      const nextHp =
        actionType === 'damage'
          ? Math.max(0, target.hp_current - amount)
          : Math.min(target.hp_max, target.hp_current + amount);
      await client.query(
        `UPDATE encounter_combatants
         SET hp_current = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND encounter_id = $3`,
        [nextHp, target.id, encounterId]
      );
      payload.amount = amount;
      payload.hpBefore = target.hp_current;
      payload.hpAfter = nextHp;
      if (actionType === 'damage' && target.concentrating_on) {
        const dc = Math.max(10, Math.floor(amount / 2));
        payload.concentrationCheck = {
          required: true,
          dc,
          spell: target.concentrating_on,
        };
      }
    } else if (actionType === 'condition') {
      if (!target) {
        res.status(400).json({ error: 'La condición requiere objetivo' });
        await client.query('ROLLBACK');
        return;
      }
      const conditionName = String(body.condition ?? '').trim();
      if (!conditionName) {
        res.status(400).json({ error: 'Debes indicar el nombre de la condición' });
        await client.query('ROLLBACK');
        return;
      }
      const durationRounds = Math.max(1, Math.floor(Number(body.durationRounds) || 1));
      payload.condition = conditionName;
      payload.durationRounds = durationRounds;
      const existing = await client.query(
        `SELECT id FROM encounter_combatant_conditions
         WHERE encounter_id = $1 AND combatant_id = $2 AND lower(condition_name) = lower($3)
         LIMIT 1`,
        [encounterId, target.id, conditionName]
      );
      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE encounter_combatant_conditions
           SET rounds_remaining = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [durationRounds, existing.rows[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO encounter_combatant_conditions
           (id, encounter_id, combatant_id, condition_name, rounds_remaining)
           VALUES ($1, $2, $3, $4, $5)`,
          [uuidv4(), encounterId, target.id, conditionName, durationRounds]
        );
      }
    } else if (actionType === 'concentration') {
      if (!target) {
        res.status(400).json({ error: 'La acción de concentración requiere objetivo' });
        await client.query('ROLLBACK');
        return;
      }
      if (body.success === false) {
        await client.query(
          `UPDATE encounter_combatants
           SET concentrating_on = NULL, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND encounter_id = $2`,
          [target.id, encounterId]
        );
        payload.cleared = true;
      } else if (body.concentratingOn && body.concentratingOn.trim()) {
        await client.query(
          `UPDATE encounter_combatants
           SET concentrating_on = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND encounter_id = $3`,
          [body.concentratingOn.trim(), target.id, encounterId]
        );
        payload.spell = body.concentratingOn.trim();
      }
    } else if (body.amount != null) {
      payload.amount = Math.max(1, Math.floor(Number(body.amount)));
    }

    const eventId = uuidv4();
    await client.query(
      `INSERT INTO encounter_events
       (id, encounter_id, actor_combatant_id, target_combatant_id, action_type, payload, created_by)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
      [
        eventId,
        encounterId,
        actor?.id ?? null,
        target?.id ?? null,
        actionType,
        JSON.stringify(payload),
        userId,
      ]
    );

    const eventResult = await client.query(
      `SELECT ev.id, ev.encounter_id, ev.actor_combatant_id, ev.target_combatant_id, ev.action_type, ev.payload, ev.created_by, ev.created_at,
              actor.name AS actor_name, target.name AS target_name
       FROM encounter_events ev
       LEFT JOIN encounter_combatants actor ON actor.id = ev.actor_combatant_id
       LEFT JOIN encounter_combatants target ON target.id = ev.target_combatant_id
       WHERE ev.id = $1`,
      [eventId]
    );

    await client.query('COMMIT');
    res.status(201).json(eventResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creando acción de encounter:', err);
    res.status(500).json({ error: 'Error al registrar acción de combate' });
  } finally {
    client.release();
  }
}

export async function removeCombatantCondition(req: AuthRequest, res: Response) {
  try {
    const { id: campaignId, encounterId, combatantId, conditionId } = req.params;
    const encounter = await ensureEncounterInCampaign(encounterId, campaignId);
    if (!encounter) {
      res.status(404).json({ error: 'Encuentro no encontrado' });
      return;
    }
    await pool.query(
      `DELETE FROM encounter_combatant_conditions
       WHERE id = $1 AND encounter_id = $2 AND combatant_id = $3`,
      [conditionId, encounterId, combatantId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Error eliminando condición de combatiente:', err);
    res.status(500).json({ error: 'Error al eliminar condición' });
  }
}

export async function listEncounterTemplates(req: AuthRequest, res: Response) {
  try {
    const { id: campaignId } = req.params;
    const result = await pool.query(
      `SELECT id, campaign_id, name, items, created_by, created_at, updated_at
       FROM encounter_templates
       WHERE campaign_id = $1
       ORDER BY updated_at DESC`,
      [campaignId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error listando plantillas de encounter:', err);
    res.status(500).json({ error: 'Error al listar plantillas' });
  }
}

export async function createEncounterTemplate(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    const { id: campaignId } = req.params;
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const body = (req.body as { name?: string; sourceEncounterId?: string; items?: TemplateItem[] }) ?? {};
    const name = String(body.name ?? '').trim();
    if (!name) {
      res.status(400).json({ error: 'El nombre de la plantilla es obligatorio' });
      return;
    }
    let items: TemplateItem[] = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0 && body.sourceEncounterId) {
      const source = await ensureEncounterInCampaign(body.sourceEncounterId, campaignId);
      if (!source) {
        res.status(404).json({ error: 'Encounter origen no encontrado' });
        return;
      }
      const sourceRows = await pool.query(
        `SELECT kind, ref_id, name, initiative, hp_current, hp_max, ac, is_hidden, concentrating_on
         FROM encounter_combatants
         WHERE encounter_id = $1
         ORDER BY initiative DESC, created_at ASC`,
        [body.sourceEncounterId]
      );
      items = sourceRows.rows.map((r) => ({
        kind: r.kind,
        refId: r.ref_id,
        name: r.name,
        initiative: r.initiative,
        hpCurrent: r.hp_current,
        hpMax: r.hp_max,
        ac: r.ac,
        isHidden: r.is_hidden,
        concentratingOn: r.concentrating_on,
      }));
    }
    if (items.length === 0) {
      res.status(400).json({ error: 'La plantilla debe contener al menos 1 combatiente' });
      return;
    }
    const templateId = uuidv4();
    await pool.query(
      `INSERT INTO encounter_templates (id, campaign_id, name, items, created_by)
       VALUES ($1, $2, $3, $4::jsonb, $5)`,
      [templateId, campaignId, name, JSON.stringify(items), userId]
    );
    const result = await pool.query(
      `SELECT id, campaign_id, name, items, created_by, created_at, updated_at
       FROM encounter_templates
       WHERE id = $1`,
      [templateId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creando plantilla de encounter:', err);
    res.status(500).json({ error: 'Error al crear plantilla' });
  }
}

export async function deleteEncounterTemplate(req: AuthRequest, res: Response) {
  try {
    const { id: campaignId, templateId } = req.params;
    await pool.query(
      `DELETE FROM encounter_templates WHERE id = $1 AND campaign_id = $2`,
      [templateId, campaignId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Error eliminando plantilla de encounter:', err);
    res.status(500).json({ error: 'Error al eliminar plantilla' });
  }
}

export async function applyEncounterTemplate(req: AuthRequest, res: Response) {
  const userId = req.userId;
  if (userId == null) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }
  const { id: campaignId, templateId, encounterId } = req.params;
  const encounter = await ensureEncounterInCampaign(encounterId, campaignId);
  if (!encounter) {
    res.status(404).json({ error: 'Encuentro no encontrado' });
    return;
  }
  const templateResult = await pool.query(
    `SELECT id, items FROM encounter_templates WHERE id = $1 AND campaign_id = $2`,
    [templateId, campaignId]
  );
  if (templateResult.rows.length === 0) {
    res.status(404).json({ error: 'Plantilla no encontrada' });
    return;
  }
  const rawItems = templateResult.rows[0]?.items;
  const items = Array.isArray(rawItems) ? (rawItems as TemplateItem[]) : [];
  if (items.length === 0) {
    res.status(400).json({ error: 'La plantilla está vacía' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of items) {
      const resolved = await resolveCombatantInput(item, campaignId, userId, client);
      await client.query(
        `INSERT INTO encounter_combatants
         (id, encounter_id, kind, ref_id, name, initiative, hp_current, hp_max, ac, concentrating_on, is_hidden)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          uuidv4(),
          encounterId,
          resolved.kind,
          resolved.refId,
          resolved.name,
          resolved.initiative,
          resolved.hpCurrent,
          resolved.hpMax,
          resolved.ac,
          resolved.concentratingOn,
          resolved.isHidden,
        ]
      );
    }
    await client.query(
      `UPDATE encounters SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [encounterId]
    );
    await client.query('COMMIT');
    res.json({ ok: true, added: items.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error aplicando plantilla de encounter:', err);
    res.status(500).json({ error: 'Error al aplicar plantilla' });
  } finally {
    client.release();
  }
}

async function buildEncounterSnapshotPayload(encounterId: string) {
  const [encounterResult, combatantsResult, conditionsResult, eventsResult] = await Promise.all([
    pool.query(
      `SELECT id, campaign_id, name, status, round, active_index, created_by, created_at, updated_at
       FROM encounters
       WHERE id = $1`,
      [encounterId]
    ),
    pool.query(
      `SELECT id, encounter_id, kind, ref_id, name, initiative, hp_current, hp_max, ac, concentrating_on, is_hidden, created_at, updated_at
       FROM encounter_combatants
       WHERE encounter_id = $1
       ORDER BY initiative DESC, created_at ASC`,
      [encounterId]
    ),
    pool.query(
      `SELECT id, encounter_id, combatant_id, condition_name, rounds_remaining, created_at, updated_at
       FROM encounter_combatant_conditions
       WHERE encounter_id = $1
       ORDER BY created_at ASC`,
      [encounterId]
    ),
    pool.query(
      `SELECT ev.id, ev.encounter_id, ev.actor_combatant_id, ev.target_combatant_id, ev.action_type, ev.payload, ev.created_by, ev.created_at,
              actor.name AS actor_name, target.name AS target_name
       FROM encounter_events ev
       LEFT JOIN encounter_combatants actor ON actor.id = ev.actor_combatant_id
       LEFT JOIN encounter_combatants target ON target.id = ev.target_combatant_id
       WHERE ev.encounter_id = $1
       ORDER BY ev.created_at DESC
       LIMIT 200`,
      [encounterId]
    ),
  ]);
  const encounter = encounterResult.rows[0];
  const combatants = combatantsResult.rows;
  const conditions = conditionsResult.rows;
  const events = eventsResult.rows;

  const conditionsByCombatant = new Map<string, typeof conditions>();
  for (const cond of conditions) {
    const key = String(cond.combatant_id);
    const current = conditionsByCombatant.get(key) ?? [];
    current.push(cond);
    conditionsByCombatant.set(key, current);
  }
  const combatantsWithConditions = combatants.map((c) => ({
    ...c,
    conditions: conditionsByCombatant.get(String(c.id)) ?? [],
  }));

  const aliveCount = combatantsWithConditions.filter((c) => Number(c.hp_current) > 0).length;
  const downCount = combatantsWithConditions.length - aliveCount;
  const summary = {
    round: Number(encounter?.round ?? 1),
    status: String(encounter?.status ?? 'active'),
    combatantsTotal: combatantsWithConditions.length,
    aliveCount,
    downCount,
    eventsCount: events.length,
  };
  const payload = {
    encounter,
    combatants: combatantsWithConditions,
    events,
  };
  return { encounter, summary, payload };
}

export async function listEncounterSnapshots(req: AuthRequest, res: Response) {
  try {
    const { id: campaignId, encounterId } = req.params;
    const encounter = await ensureEncounterInCampaign(encounterId, campaignId);
    if (!encounter) {
      res.status(404).json({ error: 'Encuentro no encontrado' });
      return;
    }
    const result = await pool.query(
      `SELECT id, encounter_id, campaign_id, title, note, summary, created_by, created_at
       FROM encounter_snapshots
       WHERE encounter_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [encounterId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error listando snapshots:', err);
    res.status(500).json({ error: 'Error al listar snapshots' });
  }
}

export async function createEncounterSnapshot(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    const { id: campaignId, encounterId } = req.params;
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const encounter = await ensureEncounterInCampaign(encounterId, campaignId);
    if (!encounter) {
      res.status(404).json({ error: 'Encuentro no encontrado' });
      return;
    }
    const body = (req.body as { title?: string; note?: string }) ?? {};
    const fallbackTitle = `Sesion R${encounter.round}`;
    const title = String(body.title ?? fallbackTitle).trim() || fallbackTitle;
    const note = body.note ? String(body.note).trim() : null;
    const { summary, payload } = await buildEncounterSnapshotPayload(encounterId);
    const snapshotId = uuidv4();
    await pool.query(
      `INSERT INTO encounter_snapshots
       (id, encounter_id, campaign_id, title, note, summary, payload, created_by)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)`,
      [snapshotId, encounterId, campaignId, title, note, JSON.stringify(summary), JSON.stringify(payload), userId]
    );
    const result = await pool.query(
      `SELECT id, encounter_id, campaign_id, title, note, summary, created_by, created_at
       FROM encounter_snapshots
       WHERE id = $1`,
      [snapshotId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creando snapshot:', err);
    res.status(500).json({ error: 'Error al crear snapshot' });
  }
}

export async function getEncounterSnapshot(req: AuthRequest, res: Response) {
  try {
    const { id: campaignId, encounterId, snapshotId } = req.params;
    const encounter = await ensureEncounterInCampaign(encounterId, campaignId);
    if (!encounter) {
      res.status(404).json({ error: 'Encuentro no encontrado' });
      return;
    }
    const result = await pool.query(
      `SELECT id, encounter_id, campaign_id, title, note, summary, payload, created_by, created_at
       FROM encounter_snapshots
       WHERE id = $1 AND encounter_id = $2`,
      [snapshotId, encounterId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Snapshot no encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error obteniendo snapshot:', err);
    res.status(500).json({ error: 'Error al obtener snapshot' });
  }
}
