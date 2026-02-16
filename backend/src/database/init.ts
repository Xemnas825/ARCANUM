import pool from './pool.js';

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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Tabla users creada');

    // Tabla de personajes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS characters (
        id UUID PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

    // Índices para mejor rendimiento
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
      CREATE INDEX IF NOT EXISTS idx_game_stats_character_id ON game_stats(character_id);
      CREATE INDEX IF NOT EXISTS idx_character_conditions_character_id ON character_conditions(character_id);
      CREATE INDEX IF NOT EXISTS idx_character_inventory_character_id ON character_inventory(character_id);
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
