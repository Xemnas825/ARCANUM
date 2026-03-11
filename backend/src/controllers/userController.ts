import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../database/pool.js';

const SALT_ROUNDS = 10;

/** GET /api/users/me */
export async function getMe(req: Request, res: Response) {
  try {
    const userId = (req as Request & { userId?: number }).userId;
    const result = await pool.query(
      `SELECT id, username, email, role, created_at FROM users WHERE id = $1`,
      [userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error en getMe:', err);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
}

/** PATCH /api/users/me */
export async function updateMe(req: Request, res: Response) {
  try {
    const userId = (req as Request & { userId?: number }).userId;
    const { username, email, password, role } = req.body as {
      username?: string;
      email?: string;
      password?: string;
      role?: string;
    };

    const current = await pool.query(
      `SELECT id, username, email, role FROM users WHERE id = $1`,
      [userId]
    );
    if (current.rows.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    const cur = current.rows[0];

    const newUsername = username?.trim() || cur.username;
    const newEmail    = email?.trim().toLowerCase() || cur.email;
    const newRole     = role === 'dm' || role === 'player' ? role : cur.role;

    if (password) {
      if (password.length < 6) {
        res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        return;
      }
      const hashed = await bcrypt.hash(password, SALT_ROUNDS);
      const updated = await pool.query(
        `UPDATE users SET username=$1, email=$2, role=$3, password=$4, updated_at=NOW()
         WHERE id=$5 RETURNING id, username, email, role`,
        [newUsername, newEmail, newRole, hashed, userId]
      );
      res.json(updated.rows[0]);
      return;
    }

    const updated = await pool.query(
      `UPDATE users SET username=$1, email=$2, role=$3, updated_at=NOW()
       WHERE id=$4 RETURNING id, username, email, role`,
      [newUsername, newEmail, newRole, userId]
    );
    res.json(updated.rows[0]);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === '23505') {
      res.status(409).json({ error: 'Ese nombre de usuario o email ya está en uso' });
      return;
    }
    console.error('Error en updateMe:', err);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
}

/** GET /api/campaigns/:id/party  — fichas resumidas de todos los personajes de la campaña */
export async function getCampaignParty(req: Request, res: Response) {
  try {
    const { id: campaignId } = req.params;
    const userId = (req as Request & { userId?: number }).userId;

    // Solo miembros de la campaña
    const membership = await pool.query(
      `SELECT role FROM campaign_members WHERE campaign_id=$1 AND user_id=$2`,
      [campaignId, userId]
    );
    if (membership.rows.length === 0) {
      res.status(403).json({ error: 'No perteneces a esta campaña' });
      return;
    }

    const result = await pool.query(
      `SELECT
         c.id, c.name_es, c.name_en, c.race_id, c.class_id, c.subclass_id,
         c.level, c.experience, c.background_id, c.alignment_id,
         c.personality_ideals, c.personality_bonds, c.personality_flaws,
         c.user_id,
         u.username AS owner_username,
         gs.current_health, gs.maximum_health, gs.current_gold, gs.inspiration_points,
         gs.concentrating_on,
         a.strength, a.dexterity, a.constitution, a.intelligence, a.wisdom, a.charisma,
         COALESCE(
           (SELECT json_agg(condition_key) FROM character_conditions WHERE character_id = c.id),
           '[]'::json
         ) AS conditions
       FROM characters c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN game_stats gs ON gs.character_id = c.id
       LEFT JOIN abilities a ON a.character_id = c.id
       WHERE c.campaign_id = $1
       ORDER BY u.username, c.name_es`,
      [campaignId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error en getCampaignParty:', err);
    res.status(500).json({ error: 'Error al obtener el grupo' });
  }
}
