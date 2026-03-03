import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../database/pool.js';
import type { AuthRequest } from '../middleware/auth.js';

// ===== LISTAR CAMPAÑAS DEL USUARIO =====
export async function listCampaigns(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const result = await pool.query(
      `SELECT c.id, c.name, c.description, c.image_url, c.master_user_id, c.created_at, c.updated_at,
              cm.role
       FROM campaigns c
       INNER JOIN campaign_members cm ON cm.campaign_id = c.id AND cm.user_id = $1
       ORDER BY c.updated_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error listando campañas:', err);
    res.status(500).json({ error: 'Error al listar campañas' });
  }
}

// ===== OBTENER UNA CAMPAÑA =====
export async function getCampaign(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    const { id } = req.params;
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const campaignResult = await pool.query(
      `SELECT c.id, c.name, c.description, c.image_url, c.master_user_id, c.created_at, c.updated_at, cm.role
       FROM campaigns c
       INNER JOIN campaign_members cm ON cm.campaign_id = c.id AND cm.user_id = $1
       WHERE c.id = $2`,
      [userId, id]
    );
    if (campaignResult.rows.length === 0) {
      res.status(404).json({ error: 'Campaña no encontrada' });
      return;
    }
    const campaign = campaignResult.rows[0];
    const membersResult = await pool.query(
      `SELECT cm.user_id, cm.role, cm.joined_at, u.username
       FROM campaign_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.campaign_id = $1
       ORDER BY CASE WHEN cm.role = 'master' THEN 0 ELSE 1 END, cm.joined_at`,
      [id]
    );
    res.json({
      ...campaign,
      members: membersResult.rows,
    });
  } catch (err) {
    console.error('Error obteniendo campaña:', err);
    res.status(500).json({ error: 'Error al obtener campaña' });
  }
}

// ===== CREAR CAMPAÑA =====
export async function createCampaign(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const { name, description, image_url: imageUrl } = req.body as {
      name?: string;
      description?: string;
      image_url?: string;
    };
    if (!name?.trim()) {
      res.status(400).json({ error: 'El nombre de la campaña es obligatorio' });
      return;
    }
    const id = uuidv4();
    await pool.query(
      `INSERT INTO campaigns (id, name, description, image_url, master_user_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, name.trim(), description?.trim() || null, imageUrl?.trim() || null, userId]
    );
    await pool.query(
      `INSERT INTO campaign_members (campaign_id, user_id, role) VALUES ($1, $2, 'master')`,
      [id, userId]
    );
    const created = await pool.query(
      `SELECT id, name, description, image_url, master_user_id, created_at, updated_at FROM campaigns WHERE id = $1`,
      [id]
    );
    res.status(201).json({ ...created.rows[0], role: 'master' });
  } catch (err) {
    console.error('Error creando campaña:', err);
    res.status(500).json({ error: 'Error al crear campaña' });
  }
}

// ===== ACTUALIZAR CAMPAÑA =====
export async function updateCampaign(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { name, description, image_url: imageUrl } = req.body as {
      name?: string;
      description?: string;
      image_url?: string;
    };
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const memberCheck = await pool.query(
      `SELECT role FROM campaign_members WHERE campaign_id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (memberCheck.rows.length === 0 || memberCheck.rows[0].role !== 'master') {
      res.status(403).json({ error: 'Solo el Master puede editar la campaña' });
      return;
    }
    const updates: string[] = [];
    const values: unknown[] = [];
    let p = 1;
    if (name !== undefined) {
      if (!name.trim()) {
        res.status(400).json({ error: 'El nombre no puede estar vacío' });
        return;
      }
      updates.push(`name = $${p++}`);
      values.push(name.trim());
    }
    if (description !== undefined) {
      updates.push(`description = $${p++}`);
      values.push(description.trim() || null);
    }
    if (imageUrl !== undefined) {
      updates.push(`image_url = $${p++}`);
      values.push(imageUrl.trim() || null);
    }
    if (updates.length === 0) {
      res.status(400).json({ error: 'Nada que actualizar' });
      return;
    }
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    await pool.query(
      `UPDATE campaigns SET ${updates.join(', ')} WHERE id = $${p}`,
      values
    );
    const updated = await pool.query(
      `SELECT id, name, description, image_url, master_user_id, created_at, updated_at FROM campaigns WHERE id = $1`,
      [id]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    console.error('Error actualizando campaña:', err);
    res.status(500).json({ error: 'Error al actualizar campaña' });
  }
}

// ===== ELIMINAR CAMPAÑA =====
export async function deleteCampaign(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    const { id } = req.params;
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const memberCheck = await pool.query(
      `SELECT role FROM campaign_members WHERE campaign_id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (memberCheck.rows.length === 0 || memberCheck.rows[0].role !== 'master') {
      res.status(403).json({ error: 'Solo el Master puede eliminar la campaña' });
      return;
    }
    await pool.query(`DELETE FROM campaigns WHERE id = $1`, [id]);
    res.json({ message: 'Campaña eliminada' });
  } catch (err) {
    console.error('Error eliminando campaña:', err);
    res.status(500).json({ error: 'Error al eliminar campaña' });
  }
}

// ===== LISTAR MIEMBROS =====
export async function getMembers(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    const { id } = req.params;
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const memberCheck = await pool.query(
      `SELECT 1 FROM campaign_members WHERE campaign_id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (memberCheck.rows.length === 0) {
      res.status(403).json({ error: 'No tienes acceso a esta campaña' });
      return;
    }
    const result = await pool.query(
      `SELECT cm.user_id, cm.role, cm.joined_at, u.username, u.email
       FROM campaign_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.campaign_id = $1
       ORDER BY CASE WHEN cm.role = 'master' THEN 0 ELSE 1 END, cm.joined_at`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error listando miembros:', err);
    res.status(500).json({ error: 'Error al listar miembros' });
  }
}

// ===== AÑADIR JUGADOR (por user_id; el master invita) =====
export async function addMember(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { user_id: targetUserId } = req.body as { user_id?: number };
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const masterCheck = await pool.query(
      `SELECT 1 FROM campaign_members WHERE campaign_id = $1 AND user_id = $2 AND role = 'master'`,
      [id, userId]
    );
    if (masterCheck.rows.length === 0) {
      res.status(403).json({ error: 'Solo el Master puede invitar jugadores' });
      return;
    }
    if (targetUserId == null) {
      res.status(400).json({ error: 'user_id es obligatorio' });
      return;
    }
    await pool.query(
      `INSERT INTO campaign_members (campaign_id, user_id, role) VALUES ($1, $2, 'player')
       ON CONFLICT (campaign_id, user_id) DO NOTHING`,
      [id, targetUserId]
    );
    const member = await pool.query(
      `SELECT cm.user_id, cm.role, cm.joined_at, u.username
       FROM campaign_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.campaign_id = $1 AND cm.user_id = $2`,
      [id, targetUserId]
    );
    res.status(201).json(member.rows[0] ?? { user_id: targetUserId, role: 'player' });
  } catch (err) {
    console.error('Error añadiendo miembro:', err);
    res.status(500).json({ error: 'Error al añadir miembro' });
  }
}

// ===== LISTAR PERSONAJES DE LA CAMPAÑA =====
export async function getCampaignCharacters(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    const { id } = req.params;
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const memberCheck = await pool.query(
      `SELECT role FROM campaign_members WHERE campaign_id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (memberCheck.rows.length === 0) {
      res.status(403).json({ error: 'No tienes acceso a esta campaña' });
      return;
    }
    const role = memberCheck.rows[0].role as string;
    let query: string;
    const params: unknown[] = [id];
    if (role === 'master') {
      query = `SELECT ch.id, ch.name_es, ch.name_en, ch.race_id, ch.class_id, ch.level, ch.user_id, u.username
               FROM characters ch
               JOIN users u ON u.id = ch.user_id
               WHERE ch.campaign_id = $1
               ORDER BY u.username, ch.name_es`;
    } else {
      query = `SELECT id, name_es, name_en, race_id, class_id, level
               FROM characters
               WHERE campaign_id = $1 AND user_id = $2
               ORDER BY name_es`;
      params.push(userId);
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error listando personajes de campaña:', err);
    res.status(500).json({ error: 'Error al listar personajes' });
  }
}

// ===== CREAR ENLACE DE INVITACIÓN (solo master) =====
export async function createInviteLink(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { expiresInDays } = (req.body as { expiresInDays?: number }) ?? {};
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }

    const masterCheck = await pool.query(
      `SELECT 1 FROM campaign_members WHERE campaign_id = $1 AND user_id = $2 AND role = 'master'`,
      [id, userId]
    );
    if (masterCheck.rows.length === 0) {
      res.status(403).json({ error: 'Solo el Master puede generar invitaciones' });
      return;
    }

    const days = Math.min(30, Math.max(1, Number(expiresInDays) || 7));
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const token = uuidv4();

    await pool.query(
      `INSERT INTO campaign_invites (token, campaign_id, created_by, expires_at) VALUES ($1, $2, $3, $4)`,
      [token, id, userId, expiresAt]
    );

    const frontendBase = (process.env.FRONTEND_URL || '').trim();
    const fallbackBase = `${req.protocol}://${req.get('host')}`;
    const base = frontendBase || fallbackBase;
    const inviteUrl = `${base.replace(/\/$/, '')}/invitacion/${token}`;

    res.status(201).json({
      token,
      campaignId: id,
      expiresAt: expiresAt.toISOString(),
      inviteUrl,
    });
  } catch (err) {
    console.error('Error creando invitación:', err);
    res.status(500).json({ error: 'Error al crear enlace de invitación' });
  }
}

// ===== UNIRSE POR TOKEN DE INVITACIÓN =====
export async function joinCampaignByInvite(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    const { token } = req.params;
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }

    const inviteResult = await pool.query(
      `SELECT ci.campaign_id, c.name, c.master_user_id
       FROM campaign_invites ci
       JOIN campaigns c ON c.id = ci.campaign_id
       WHERE ci.token = $1 AND ci.revoked = FALSE AND ci.expires_at > CURRENT_TIMESTAMP`,
      [token]
    );
    if (inviteResult.rows.length === 0) {
      res.status(404).json({ error: 'Invitación inválida o expirada' });
      return;
    }

    const invite = inviteResult.rows[0] as {
      campaign_id: string;
      name: string;
      master_user_id: number;
    };

    const inserted = await pool.query(
      `INSERT INTO campaign_members (campaign_id, user_id, role)
       VALUES ($1, $2, 'player')
       ON CONFLICT (campaign_id, user_id) DO NOTHING
       RETURNING campaign_id`,
      [invite.campaign_id, userId]
    );

    const joinedNow = inserted.rows.length > 0;
    if (joinedNow) {
      const whoResult = await pool.query(`SELECT username FROM users WHERE id = $1`, [userId]);
      const username = (whoResult.rows[0]?.username as string | undefined) ?? 'Un jugador';

      await pool.query(
        `INSERT INTO notifications (id, user_id, type, title, message, data)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [
          uuidv4(),
          invite.master_user_id,
          'campaign_member_joined',
          'Nuevo jugador en campaña',
          `${username} se ha unido a "${invite.name}".`,
          JSON.stringify({ campaignId: invite.campaign_id, joinedUserId: userId }),
        ]
      );

      await pool.query(
        `INSERT INTO notifications (id, user_id, type, title, message, data)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [
          uuidv4(),
          userId,
          'campaign_joined',
          'Te has unido a una campaña',
          `Ya formas parte de "${invite.name}".`,
          JSON.stringify({ campaignId: invite.campaign_id }),
        ]
      );
    }

    res.json({
      joined: joinedNow,
      campaignId: invite.campaign_id,
      campaignName: invite.name,
      alreadyMember: !joinedNow,
    });
  } catch (err) {
    console.error('Error uniéndose por invitación:', err);
    res.status(500).json({ error: 'Error al unirse a la campaña' });
  }
}

// ===== LISTAR INVITACIONES ACTIVAS (solo master) =====
export async function listInviteLinks(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    const { id } = req.params;
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const masterCheck = await pool.query(
      `SELECT 1 FROM campaign_members WHERE campaign_id = $1 AND user_id = $2 AND role = 'master'`,
      [id, userId]
    );
    if (masterCheck.rows.length === 0) {
      res.status(403).json({ error: 'Solo el Master puede ver invitaciones' });
      return;
    }

    const invitesResult = await pool.query(
      `SELECT token, expires_at, revoked, created_at
       FROM campaign_invites
       WHERE campaign_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    const frontendBase = (process.env.FRONTEND_URL || '').trim();
    const fallbackBase = `${req.protocol}://${req.get('host')}`;
    const base = (frontendBase || fallbackBase).replace(/\/$/, '');

    res.json(
      invitesResult.rows.map((row) => ({
        token: row.token,
        expiresAt: row.expires_at,
        revoked: row.revoked,
        createdAt: row.created_at,
        inviteUrl: `${base}/invitacion/${row.token}`,
      }))
    );
  } catch (err) {
    console.error('Error listando invitaciones:', err);
    res.status(500).json({ error: 'Error al listar invitaciones' });
  }
}

// ===== REVOCAR INVITACIÓN (solo master) =====
export async function revokeInviteLink(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    const { id, token } = req.params;
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const masterCheck = await pool.query(
      `SELECT 1 FROM campaign_members WHERE campaign_id = $1 AND user_id = $2 AND role = 'master'`,
      [id, userId]
    );
    if (masterCheck.rows.length === 0) {
      res.status(403).json({ error: 'Solo el Master puede revocar invitaciones' });
      return;
    }

    const result = await pool.query(
      `UPDATE campaign_invites
       SET revoked = TRUE
       WHERE campaign_id = $1 AND token = $2
       RETURNING token`,
      [id, token]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Invitación no encontrada' });
      return;
    }
    res.json({ ok: true, token });
  } catch (err) {
    console.error('Error revocando invitación:', err);
    res.status(500).json({ error: 'Error al revocar invitación' });
  }
}
