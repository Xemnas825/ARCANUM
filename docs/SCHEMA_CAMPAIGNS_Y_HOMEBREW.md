# Esquema de base de datos: Campaigns y Homebrew

PostgreSQL. La tabla **campaigns** es el eje central: un usuario (DM) crea campañas, los jugadores se asocian mediante **campaign_members**, y el contenido homebrew vive por campaña.

---

## 1. Tablas centrales

### 1.1 `users` (existente, sin cambios)

| Columna     | Tipo         | Descripción |
|------------|--------------|-------------|
| id         | SERIAL PK    | |
| username   | VARCHAR(255) UNIQUE NOT NULL | |
| email      | VARCHAR(255) UNIQUE NOT NULL | |
| password   | VARCHAR(255) NOT NULL | |
| created_at | TIMESTAMP   | |
| updated_at | TIMESTAMP   | |

Un usuario puede ser **DM** de las campañas que cree y **jugador** en otras (vía `campaign_members`).

---

### 1.2 `campaigns` (nueva)

Eje central: cada campaña pertenece a un DM y agrupa miembros y contenido homebrew.

| Columna          | Tipo         | Descripción |
|------------------|--------------|-------------|
| id               | UUID PK      | Identificador de la campaña (gen_random_uuid() o uuid_generate_v4()) |
| name             | VARCHAR(255) NOT NULL | Nombre de la campaña |
| description      | TEXT         | Descripción opcional |
| image_url        | VARCHAR(512) | URL de imagen opcional |
| master_user_id   | INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE | Usuario que creó la campaña (DM) |
| created_at       | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | |
| updated_at       | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | |

- Índice: `idx_campaigns_master_user_id` en `master_user_id`.

---

### 1.3 `campaign_members` (nueva)

Tabla intermedia: quién participa en cada campaña y con qué rol.

| Columna     | Tipo         | Descripción |
|-------------|--------------|-------------|
| campaign_id | UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE | |
| user_id     | INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE | |
| role        | VARCHAR(20) NOT NULL CHECK (role IN ('master', 'player')) | 'master' = DM, 'player' = jugador |
| joined_at   | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | |

- **PK:** `(campaign_id, user_id)`.
- El creador de la campaña se inserta con `role = 'master'`.
- Índices: `idx_campaign_members_campaign_id`, `idx_campaign_members_user_id`.

---

### 1.4 `characters` (modificación)

Se añade relación opcional con una campaña.

| Columna nueva | Tipo | Descripción |
|---------------|------|-------------|
| campaign_id   | UUID NULL REFERENCES campaigns(id) ON DELETE SET NULL | Si no NULL, el personaje pertenece a esa campaña y puede usar homebrew de la misma. Si NULL, es un personaje "suelto" (solo SRD). |

- Índice: `idx_characters_campaign_id`.

---

## 2. Tablas de Homebrew (por campaña)

Todas tienen `campaign_id` para que el contenido sea privado de esa partida. Se usan **JSONB** en campos complejos (stats, habilidades, listas) para mantener flexibilidad D&D.

---

### 2.1 `homebrew_races`

| Columna       | Tipo    | Descripción |
|---------------|---------|-------------|
| id            | UUID PK | Identificador único (no colisiona con IDs SRD tipo 'human', 'dwarf') |
| campaign_id   | UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE | |
| name_es       | VARCHAR(255) NOT NULL | |
| name_en       | VARCHAR(255) | |
| description_es| TEXT    | |
| description_en| TEXT    | |
| ability_bonus | JSONB   | Ej: `{"strength":1,"dexterity":1}` (bonos por habilidad) |
| speed         | INTEGER DEFAULT 30 | Pies |
| size          | VARCHAR(20) CHECK (size IN ('small','medium')) | |
| languages     | JSONB   | Ej: `["Común","Élfico"]` |
| traits        | JSONB   | Ej: `["Visión en la penumbra","Resistencia enana"]` o array de objetos |
| subraces      | JSONB   | Array de subrazas: `[{"id":"...","nameEs":"...","abilityBonus":{...},...}]` |
| created_at    | TIMESTAMP | |
| updated_at    | TIMESTAMP | |

- Índice: `idx_homebrew_races_campaign_id`.

---

### 2.2 `homebrew_classes`

| Columna        | Tipo    | Descripción |
|----------------|---------|-------------|
| id             | UUID PK | |
| campaign_id    | UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE | |
| name_es        | VARCHAR(255) NOT NULL | |
| name_en        | VARCHAR(255) | |
| description_es | TEXT    | |
| description_en | TEXT    | |
| hit_dice       | INTEGER NOT NULL | Dado de golpe (6, 8, 10, 12) |
| primary_ability| VARCHAR(20) NOT NULL | 'strength','dexterity', etc. |
| saving_throws  | JSONB   | Ej: `["constitution","intelligence"]` |
| skill_options  | JSONB   | Ej: `["arcana","history","investigation"]` |
| subclasses     | JSONB   | Array: `[{"id":"...","nameEs":"...","minLevel":3,...}]` |
| created_at     | TIMESTAMP | |
| updated_at     | TIMESTAMP | |

- Índice: `idx_homebrew_classes_campaign_id`.

---

### 2.3 `homebrew_spells`

| Columna        | Tipo    | Descripción |
|----------------|---------|-------------|
| id             | UUID PK | |
| campaign_id    | UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE | |
| name_es        | VARCHAR(255) NOT NULL | |
| name_en        | VARCHAR(255) | |
| description_es | TEXT    | |
| description_en | TEXT    | |
| level          | INTEGER NOT NULL | 0 = truco, 1–9 = nivel |
| school         | VARCHAR(100) | Escuela de magia |
| casting_time   | VARCHAR(255) | Ej: "1 acción" |
| range          | VARCHAR(255) | Ej: "60 pies" |
| components     | JSONB   | Ej: `["V","S","M"]` |
| duration       | VARCHAR(255) | |
| is_concentration| BOOLEAN DEFAULT false | |
| created_at     | TIMESTAMP | |
| updated_at     | TIMESTAMP | |

- Índice: `idx_homebrew_spells_campaign_id`.

---

### 2.4 `homebrew_monsters`

Campos complejos en JSONB para stats, habilidades, acciones y rasgos.

| Columna            | Tipo    | Descripción |
|--------------------|---------|-------------|
| id                 | UUID PK | |
| campaign_id        | UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE | |
| name_es            | VARCHAR(255) NOT NULL | |
| name_en            | VARCHAR(255) | |
| description_es     | TEXT    | |
| description_en     | TEXT    | |
| size               | VARCHAR(20) NOT NULL | tiny, small, medium, large, huge, gargantuan |
| type               | VARCHAR(100) | Ej: "humanoide", "no-muerto" |
| alignment          | VARCHAR(255) | |
| ac                 | INTEGER NOT NULL | Clase de armadura |
| hp                 | INTEGER NOT NULL | Puntos de vida |
| speed              | VARCHAR(255) | Ej: "30 pies" |
| abilities          | JSONB NOT NULL | Ej: `{"str":8,"dex":14,"con":10,"int":10,"wis":8,"cha":8}` |
| saving_throws      | JSONB   | Ej: `{"dex":4}` (modificadores) |
| skills             | JSONB   | Ej: `{"stealth":4,"perception":2}` |
| damage_resistances | JSONB   | Ej: `["fuego","frío"]` |
| damage_immunities  | JSONB   | Ej: `["veneno"]` |
| condition_immunities| JSONB   | Ej: `["envenenado"]` |
| senses             | VARCHAR(500) | Ej: "darkvision 60 pies" |
| languages          | VARCHAR(500) | |
| challenge          | VARCHAR(50) | Ej: "1/8 (25 XP)" |
| traits             | JSONB   | Ej: `[{"name":"...","description":"..."}]` |
| actions            | JSONB   | Ej: `[{"name":"...","description":"..."}]` |
| legendary_actions  | JSONB   | Opcional |
| created_at         | TIMESTAMP | |
| updated_at         | TIMESTAMP | |

- Índice: `idx_homebrew_monsters_campaign_id`.

---

### 2.5 `homebrew_backgrounds` (opcional, misma filosofía)

| Columna             | Tipo    | Descripción |
|---------------------|---------|-------------|
| id                  | UUID PK | |
| campaign_id         | UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE | |
| name_es             | VARCHAR(255) NOT NULL | |
| name_en             | VARCHAR(255) | |
| description_es      | TEXT    | |
| description_en      | TEXT    | |
| skill_proficiencies  | JSONB   | Ej: `["Perspicacia","Medicina"]` |
| tool_proficiencies  | JSONB   | Opcional |
| languages           | JSONB   | Opcional |
| equipment           | JSONB   | Ej: `["Kit de investigador","..."]` |
| feature             | VARCHAR(500) | Nombre de la característica |
| created_at          | TIMESTAMP | |
| updated_at          | TIMESTAMP | |

---

### 2.6 `homebrew_magic_items` (opcional)

| Columna        | Tipo    | Descripción |
|----------------|---------|-------------|
| id             | UUID PK | |
| campaign_id    | UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE | |
| name_es        | VARCHAR(255) NOT NULL | |
| name_en        | VARCHAR(255) | |
| description_es | TEXT    | |
| description_en | TEXT    | |
| rarity         | VARCHAR(50) | common, uncommon, rare, etc. |
| type           | VARCHAR(100) | weapon, armor, wondrous-item, etc. |
| properties     | JSONB   | Atributos libres (daño, bonificaciones, etc.) |
| created_at     | TIMESTAMP | |
| updated_at     | TIMESTAMP | |

---

## 3. Relaciones resumidas

```
users 1───* campaigns (master_user_id)
users *───* campaigns vía campaign_members (user_id, campaign_id, role)
campaigns 1───* characters (campaign_id opcional)
campaigns 1───* homebrew_races | homebrew_classes | homebrew_spells | homebrew_monsters | ...
```

- Un **user** crea **campaigns** (es DM por defecto en esa campaña).
- **campaign_members** relaciona usuarios con campañas (master o player).
- **characters** pueden tener `campaign_id` opcional; si lo tienen, pueden usar el homebrew de esa campaña.
- Todo el homebrew tiene `campaign_id` y se borra en cascada si se elimina la campaña.

---

## 4. Extensiones PostgreSQL (opcional)

Para generar UUIDs en el servidor:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- luego usar gen_random_uuid() en DEFAULT
```

Si no se usa extensión, el backend puede generar los UUID con `uuid` (Node) al insertar.
