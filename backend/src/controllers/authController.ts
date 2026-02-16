import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../database/pool.js';

const JWT_SECRET = process.env.JWT_SECRET || 'arcanum-dev-secret-change-in-production';
const SALT_ROUNDS = 10;

export interface RegisterBody {
  username: string;
  email: string;
  password: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

/** POST /api/auth/register */
export async function register(req: Request, res: Response) {
  try {
    const { username, email, password } = req.body as RegisterBody;

    if (!username?.trim() || !email?.trim() || !password) {
      res.status(400).json({ error: 'Faltan usuario, email o contraseña' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, created_at`,
      [username.trim(), email.trim().toLowerCase(), hashedPassword]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      token,
    });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === '23505') {
      res.status(409).json({ error: 'El nombre de usuario o el email ya están en uso' });
      return;
    }
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al registrarse' });
  }
}

/** POST /api/auth/login */
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body as LoginBody;

    if (!email?.trim() || !password) {
      res.status(400).json({ error: 'Email y contraseña son obligatorios' });
      return;
    }

    const result = await pool.query(
      `SELECT id, username, email, password FROM users WHERE email = $1`,
      [email.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Email o contraseña incorrectos' });
      return;
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: 'Email o contraseña incorrectos' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
}
