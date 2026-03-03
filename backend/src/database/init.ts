import bcrypt from 'bcryptjs';
import pool from './pool.js';

const SALT_ROUNDS = 10;
const ADMIN_EMAIL = 'admin@arcanum.local';
const ADMIN_USERNAME = 'admin';
const ADMIN_DEFAULT_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin123!';

export async function initializeDatabase() {
  try {
    console.log('Inicializando base de datos...');

    // Tabla de usuarios
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'player',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Tabla users creada');

    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'player';
    `).catch(() => {});

    // Usuario admin permanente (se crea si no existe)
    const existingAdmin = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      [ADMIN_EMAIL]
    );
    if (existingAdmin.rows.length === 0) {
      const hashedPassword = await bcrypt.hash(ADMIN_DEFAULT_PASSWORD, SALT_ROUNDS);
      await pool.query(
        `INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, 'admin')`,
        [ADMIN_USERNAME, ADMIN_EMAIL, hashedPassword]
      );
      console.log('✓ Usuario admin creado (email: admin@arcanum.local, usuario: admin)');
    } else {
      await pool.query(
        `UPDATE users SET role = 'admin' WHERE email = $1`,
        [ADMIN_EMAIL]
      );
    }

    // ===== CAMPAÑAS (eje central) =====
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        image_url VARCHAR(512),
        master_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Tabla campaigns creada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_members (
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('master', 'player')),
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (campaign_id, user_id)
      );
    `);
    console.log('✓ Tabla campaign_members creada');

    // Tabla de personajes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS characters (
        id UUID PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
        name_es VARCHAR(255) NOT NULL,
        name_en VARCHAR(255),
        race_id VARCHAR(50) NOT NULL,
        subrace_id VARCHAR(50),
        class_id VARCHAR(50) NOT NULL,
        subclass_id VARCHAR(50),
        level INTEGER DEFAULT 1,
        experience INT DEFAULT 0,
        background_id VARCHAR(50),
        alignment_id VARCHAR(50),
        personality_ideals TEXT,
        personality_bonds TEXT,
        personality_flaws TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Tabla characters creada');

    // Añadir columnas opcionales si la tabla ya existía sin ellas (para migraciones suaves)
    await pool.query(`
      ALTER TABLE characters ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;
      ALTER TABLE characters ADD COLUMN IF NOT EXISTS background_id VARCHAR(50);
      ALTER TABLE characters ADD COLUMN IF NOT EXISTS alignment_id VARCHAR(50);
      ALTER TABLE characters ADD COLUMN IF NOT EXISTS personality_ideals TEXT;
      ALTER TABLE characters ADD COLUMN IF NOT EXISTS personality_bonds TEXT;
      ALTER TABLE characters ADD COLUMN IF NOT EXISTS personality_flaws TEXT;
    `).catch(() => {});

    // Tabla de competencias de skill por personaje (para ficha tipo D&D)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS character_skills (
        character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        skill_key VARCHAR(50) NOT NULL,
        PRIMARY KEY (character_id, skill_key)
      );
    `);
    console.log('✓ Tabla character_skills creada');

    // Tabla de habilidades
    await pool.query(`
      CREATE TABLE IF NOT EXISTS abilities (
        id UUID PRIMARY KEY,
        character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        strength INT DEFAULT 10,
        dexterity INT DEFAULT 10,
        constitution INT DEFAULT 10,
        intelligence INT DEFAULT 10,
        wisdom INT DEFAULT 10,
        charisma INT DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Tabla abilities creada');

    // Tabla de estadísticas de partida
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_stats (
        id UUID PRIMARY KEY,
        character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        current_health INT NOT NULL,
        maximum_health INT NOT NULL,
        current_gold INT DEFAULT 0,
        inspiration_points INT DEFAULT 0,
        spell_slots_level_1 INT DEFAULT 0,
        spell_slots_level_2 INT DEFAULT 0,
        spell_slots_level_3 INT DEFAULT 0,
        spell_slots_level_4 INT DEFAULT 0,
        spell_slots_level_5 INT DEFAULT 0,
        spell_slots_level_6 INT DEFAULT 0,
        spell_slots_level_7 INT DEFAULT 0,
        spell_slots_level_8 INT DEFAULT 0,
        spell_slots_level_9 INT DEFAULT 0,
        concentrating_on TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Tabla game_stats creada');

    await pool.query(`ALTER TABLE game_stats ADD COLUMN IF NOT EXISTS concentrating_on TEXT;`).catch(() => {});

    // Condiciones activas del personaje en partida (estados: envenenado, concentrando, etc.)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS character_conditions (
        character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        condition_id VARCHAR(50) NOT NULL,
        PRIMARY KEY (character_id, condition_id)
      );
    `);
    console.log('✓ Tabla character_conditions creada');

    // Inventario del personaje (objetos y cantidad)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS character_inventory (
        id UUID PRIMARY KEY,
        character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Tabla character_inventory creada');

    // ===== HOMEBREW POR CAMPAÑA (contenido privado de cada partida, JSONB para flexibilidad D&D) =====
    await pool.query(`
      CREATE TABLE IF NOT EXISTS homebrew_races (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        name_es VARCHAR(255) NOT NULL,
        name_en VARCHAR(255),
        description_es TEXT,
        description_en TEXT,
        ability_bonus JSONB DEFAULT '{}',
        speed INT DEFAULT 30,
        size VARCHAR(20) CHECK (size IN ('small', 'medium')),
        languages JSONB DEFAULT '[]',
        traits JSONB DEFAULT '[]',
        subraces JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS homebrew_classes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        name_es VARCHAR(255) NOT NULL,
        name_en VARCHAR(255),
        description_es TEXT,
        description_en TEXT,
        hit_dice INT NOT NULL,
        primary_ability VARCHAR(20) NOT NULL,
        saving_throws JSONB DEFAULT '[]',
        skill_options JSONB DEFAULT '[]',
        subclasses JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS homebrew_spells (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        name_es VARCHAR(255) NOT NULL,
        name_en VARCHAR(255),
        description_es TEXT,
        description_en TEXT,
        level INT NOT NULL,
        school VARCHAR(100),
        casting_time VARCHAR(255),
        range VARCHAR(255),
        components JSONB DEFAULT '[]',
        duration VARCHAR(255),
        is_concentration BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS homebrew_monsters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        name_es VARCHAR(255) NOT NULL,
        name_en VARCHAR(255),
        description_es TEXT,
        description_en TEXT,
        size VARCHAR(20) NOT NULL,
        type VARCHAR(100),
        alignment VARCHAR(255),
        ac INT NOT NULL,
        hp INT NOT NULL,
        speed VARCHAR(255),
        abilities JSONB NOT NULL DEFAULT '{}',
        saving_throws JSONB DEFAULT '{}',
        skills JSONB DEFAULT '{}',
        damage_resistances JSONB DEFAULT '[]',
        damage_immunities JSONB DEFAULT '[]',
        condition_immunities JSONB DEFAULT '[]',
        senses VARCHAR(500),
        languages VARCHAR(500),
        challenge VARCHAR(50),
        traits JSONB DEFAULT '[]',
        actions JSONB DEFAULT '[]',
        legendary_actions JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS homebrew_backgrounds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        name_es VARCHAR(255) NOT NULL,
        name_en VARCHAR(255),
        description_es TEXT,
        description_en TEXT,
        skill_proficiencies JSONB DEFAULT '[]',
        tool_proficiencies JSONB DEFAULT '[]',
        languages JSONB DEFAULT '[]',
        equipment JSONB DEFAULT '[]',
        feature VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS homebrew_magic_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        name_es VARCHAR(255) NOT NULL,
        name_en VARCHAR(255),
        description_es TEXT,
        description_en TEXT,
        rarity VARCHAR(50),
        type VARCHAR(100),
        properties JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Tablas homebrew creadas (races, classes, spells, monsters, backgrounds, magic_items)');

    // Índices para mejor rendimiento
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
      CREATE INDEX IF NOT EXISTS idx_characters_campaign_id ON characters(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_campaigns_master_user_id ON campaigns(master_user_id);
      CREATE INDEX IF NOT EXISTS idx_campaign_members_campaign_id ON campaign_members(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_campaign_members_user_id ON campaign_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_game_stats_character_id ON game_stats(character_id);
      CREATE INDEX IF NOT EXISTS idx_character_conditions_character_id ON character_conditions(character_id);
      CREATE INDEX IF NOT EXISTS idx_character_inventory_character_id ON character_inventory(character_id);
      CREATE INDEX IF NOT EXISTS idx_homebrew_races_campaign_id ON homebrew_races(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_homebrew_classes_campaign_id ON homebrew_classes(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_homebrew_spells_campaign_id ON homebrew_spells(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_homebrew_monsters_campaign_id ON homebrew_monsters(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_homebrew_backgrounds_campaign_id ON homebrew_backgrounds(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_homebrew_magic_items_campaign_id ON homebrew_magic_items(campaign_id);
    `);
    console.log('✓ Índices creados');

    console.log('✓ Base de datos inicializada correctamente');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    process.exit(1);
  }
}

export async function closeDatabase() {
  await pool.end();
  console.log('Conexión a la base de datos cerrada');
}
