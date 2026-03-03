import { Response, NextFunction } from 'express';
import pool from '../database/pool.js';
import type { AuthRequest } from './auth.js';

/**
 * Requiere que el usuario autenticado sea miembro de la campaña (master o player).
 * El campaignId se toma de req.params.id (ruta /campaigns/:id/...).
 */
export async function requireCampaignMember(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.userId;
  const campaignId = req.params.id;
  if (userId == null || !campaignId) {
    res.status(401).json({ error: 'No autenticado o campaña no especificada' });
    return;
  }
  try {
    const result = await pool.query(
      `SELECT role FROM campaign_members WHERE campaign_id = $1 AND user_id = $2`,
      [campaignId, userId]
    );
    if (result.rows.length === 0) {
      res.status(403).json({ error: 'No tienes acceso a esta campaña' });
      return;
    }
    (req as AuthRequest & { campaignRole?: string }).campaignRole = result.rows[0].role;
    next();
  } catch (err) {
    console.error('Error en requireCampaignMember:', err);
    res.status(500).json({ error: 'Error al verificar acceso a la campaña' });
  }
}

/**
 * Requiere que el usuario autenticado sea master (DM) de la campaña.
 * Debe usarse después de requireAuth. Asume que requireCampaignMember ya estableció campaignRole.
 */
export async function requireCampaignMaster(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.userId;
  const campaignId = req.params.id;
  if (userId == null || !campaignId) {
    res.status(401).json({ error: 'No autenticado o campaña no especificada' });
    return;
  }
  try {
    const result = await pool.query(
      `SELECT role FROM campaign_members WHERE campaign_id = $1 AND user_id = $2`,
      [campaignId, userId]
    );
    if (result.rows.length === 0 || result.rows[0].role !== 'master') {
      res.status(403).json({ error: 'Solo el Master de la campaña puede realizar esta acción' });
      return;
    }
    next();
  } catch (err) {
    console.error('Error en requireCampaignMaster:', err);
    res.status(500).json({ error: 'Error al verificar rol' });
  }
}
