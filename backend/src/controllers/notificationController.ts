import { Response } from 'express';
import pool from '../database/pool.js';
import type { AuthRequest } from '../middleware/auth.js';

// ===== LISTAR NOTIFICACIONES DEL USUARIO =====
export async function listNotifications(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const result = await pool.query(
      `SELECT id, type, title, message, data, read_at, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error listando notificaciones:', err);
    res.status(500).json({ error: 'Error al listar notificaciones' });
  }
}

// ===== MARCAR UNA NOTIFICACIÓN COMO LEÍDA =====
export async function markNotificationRead(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    const { id } = req.params;
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const result = await pool.query(
      `UPDATE notifications
       SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE id = $1 AND user_id = $2
       RETURNING id, read_at`,
      [id, userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Notificación no encontrada' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error marcando notificación:', err);
    res.status(500).json({ error: 'Error al marcar notificación' });
  }
}

// ===== MARCAR TODAS COMO LEÍDAS =====
export async function markAllNotificationsRead(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (userId == null) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    await pool.query(
      `UPDATE notifications
       SET read_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND read_at IS NULL`,
      [userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Error marcando todas como leídas:', err);
    res.status(500).json({ error: 'Error al marcar todas como leídas' });
  }
}
