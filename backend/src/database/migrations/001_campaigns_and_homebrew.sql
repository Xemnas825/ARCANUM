-- Migración 001: Campaigns (eje central), campaign_members, campaign_id en characters, tablas Homebrew
-- Ejecutar solo si se aplica manualmente; si no, init.ts ya crea/actualiza todo al arrancar.

-- 1. Campañas
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(512),
  master_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Miembros de campaña (DM y jugadores)
CREATE TABLE IF NOT EXISTS campaign_members (
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('master', 'player')),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (campaign_id, user_id)
);

-- 3. Personajes: añadir campaign_id opcional
ALTER TABLE characters ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

-- 4. Homebrew por campaña (JSONB para stats/habilidades)
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_characters_campaign_id ON characters(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_master_user_id ON campaigns(master_user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_members_campaign_id ON campaign_members(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_members_user_id ON campaign_members(user_id);
CREATE INDEX IF NOT EXISTS idx_homebrew_races_campaign_id ON homebrew_races(campaign_id);
CREATE INDEX IF NOT EXISTS idx_homebrew_classes_campaign_id ON homebrew_classes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_homebrew_spells_campaign_id ON homebrew_spells(campaign_id);
CREATE INDEX IF NOT EXISTS idx_homebrew_monsters_campaign_id ON homebrew_monsters(campaign_id);
CREATE INDEX IF NOT EXISTS idx_homebrew_backgrounds_campaign_id ON homebrew_backgrounds(campaign_id);
CREATE INDEX IF NOT EXISTS idx_homebrew_magic_items_campaign_id ON homebrew_magic_items(campaign_id);
