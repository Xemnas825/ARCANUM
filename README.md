# ARCANUM - D&D Web App

Complete D&D 5e character creation and management system with comprehensive game data.

## Overview

ARCANUM is a bilingual (Spanish/English) web application for creating and managing D&D 5e characters. It includes:

- **Backend**: TypeScript, Express, PostgreSQL — REST API with D&D 5e data, JWT auth, and character CRUD.
- **Frontend**: Vue 3, TypeScript, Vite, Pinia, Vue Router — login/register, character list, creation wizard, character sheet, and play session view (HP, gold, spell slots, conditions, inventory).

## Features

### Character Management
- **Create Characters**: Choose from 15 races (with subraces), 12 classes (with 70+ subclasses)
- **Ability Calculations**: Automatically calculates ability scores with race/subrace modifiers
- **Game Stats**: Track health, gold, spell slots, inspiration points
- **Persistent Storage**: All characters saved in PostgreSQL database

### Comprehensive D&D Data
- **30+ Spells** (Levels 0-3) with casting times, ranges, components, schools
- **40+ Weapons** (Simple, Martial, Ranged) with damage types and properties
- **10+ Armor Types** (Light, Medium, Heavy) with AC values
- **8 Backgrounds** with skill proficiencies and features
- **16 Major Feats** with prerequisites and ability modifiers
- **6+ Monsters** with stats and actions
- **14 Conditions** with mechanical effects
- **9 Alignments** with descriptions
- **15+ Magic Items** (Potions, Weapons, Armor, Rings, Wands, Staves)

### Bilingual Content
All content available in Spanish and English.

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Language**: TypeScript (strict mode)
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Modules**: ES2020

### Backend Dependencies
- `express`: Web framework
- `pg`: PostgreSQL client
- `uuid`: UUID generation
- `cors`: Cross-origin resource sharing
- `bcryptjs`, `jsonwebtoken`: Auth

### Frontend (`frontend/`)
- **Vue 3** + **TypeScript** + **Vite**
- **Pinia** (state), **Vue Router**
- Proxy to backend `/api` and `/health` in dev

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # Express server entry point
│   ├── types/
│   │   ├── index.ts          # Character, Ability, Race, Class types
│   │   └── dnd.ts            # Equipment, Spell, Monster types
│   ├── database/
│   │   ├── pool.ts           # PostgreSQL connection pool
│   │   └── init.ts           # Database schema
│   ├── controllers/
│   │   ├── characterController.ts   # Character CRUD
│   │   └── dndController.ts         # D&D data endpoints
│   ├── routes/
│   │   └── index.ts          # Route definitions
│   └── data/
│       ├── races.ts          # 15 races with subraces
│       ├── classes.ts        # 12 classes with 70+ subclasses
│       ├── spells.ts         # 30+ spells
│       ├── weapons.ts        # 40+ weapons
│       ├── armor.ts          # 10+ armor
│       ├── backgrounds.ts    # 8 backgrounds
│       ├── feats.ts          # 16 feats
│       ├── monsters.ts       # 6+ monsters
│       ├── conditions.ts     # 14 conditions
│       ├── alignments.ts     # 9 alignments
│       └── magic-items.ts    # 15+ items
└── .env (not in repo)
```

### Razas (9)
- Humano, Elfo, Enano, Medirano, Dracónido, Gnomo, Semiorco, Tieflin, Semiélfo
## API Endpoints

### Races & Classes

```
GET  /api/races                        # Get all races
GET  /api/races/:id                    # Get race by ID with subraces
GET  /api/races/:raceId/subraces/:subraceId  # Get specific subrace

GET  /api/classes                      # Get all classes
GET  /api/classes/:id                  # Get class by ID with subclasses
GET  /api/classes/:classId/subclasses/:subclassId  # Get specific subclass
```

### Equipment & Items

```
GET  /api/spells                       # Get all spells
GET  /api/spells/:id                   # Get spell by ID

GET  /api/weapons                      # Get all weapons
GET  /api/weapons/:id                  # Get weapon by ID

GET  /api/armor                        # Get all armor
GET  /api/armor/:id                    # Get armor by ID

GET  /api/backgrounds                  # Get all backgrounds
GET  /api/backgrounds/:id              # Get background by ID

GET  /api/feats                        # Get all feats
GET  /api/feats/:id                    # Get feat by ID

GET  /api/magic-items                  # Get all magic items
GET  /api/magic-items/:id              # Get magic item by ID
```

### Game Data

```
GET  /api/monsters                     # Get all monsters
GET  /api/monsters/:id                 # Get monster by ID

GET  /api/conditions                   # Get all conditions
GET  /api/conditions/:id               # Get condition by ID

GET  /api/alignments                   # Get all alignments
GET  /api/alignments/:id               # Get alignment by ID
```

### Character Management

```
POST   /api/characters                 # Create new character
GET    /api/characters/:id             # Get character with stats
GET    /api/users/:userId/characters   # Get user's characters
PATCH  /api/characters/:characterId/stats  # Update game stats
DELETE /api/characters/:id             # Delete character
```

## Installation & Setup

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v12+)
- npm or yarn

### Installation Steps

1. **Clone and navigate to backend**
   ```bash
   cd ARCANUM/backend
   npm install
   ```

2. **Configure environment variables**
   Create a `.env` file:
   ```
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=arcanum_db
   PORT=3001
   ```

3. **Start the server**
   ```bash
   npm run dev
   ```

   Server runs on `http://localhost:3001/api`

## D&D 5e Data Summary

### Races (15)
- **Core**: Human, Dwarf, Elf, Halfling, Dragonborn, Gnome, Half-Orc, Tiefling, Half-Elf
- **Elemental**: Air, Earth, Fire, Water Genasi
- **Specialized**: Warforged, Goliath, Tabaxi, Kenku, Aarakocra

### Classes (12)
Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard
(Each with 3-8 subclasses, 70+ total)

### Spells (30+)
Cantrips and levels 1-3 including: Magic Missile, Fireball, Cure Wounds, Invisibility, and more.

### Monsters (6+)
Goblin, Skeleton, Zombie, Orc, Giant Rat, Wolf, and more with full stat blocks.

### Conditions (14)
Blinded, Charmed, Deafened, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious.

## Example Requests

**Get all weapons:**
```bash
curl http://localhost:3001/api/weapons
```

**Get a specific race:**
```bash
curl http://localhost:3001/api/races/elf
```

**Create a character:**
```bash
curl -X POST http://localhost:3001/api/characters \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "nameEs": "Thorin",
    "nameEn": "Thorin",
    "raceId": "dwarf",
    "classId": "fighter"
  }'
```

## Cómo lanzar la app (solo Docker)

Necesitas **Docker** instalado ([Docker Desktop](https://www.docker.com/products/docker-desktop/) en Mac/Windows).

Desde la raíz del proyecto:

```bash
docker compose up --build
```

La primera vez tarda unos minutos (construye frontend + backend). Cuando veas algo como `Servidor ejecutándose en http://localhost:3001`, **abre el navegador en http://localhost:3001**.

No hace falta instalar Node ni PostgreSQL en tu máquina: todo va dentro de Docker.

**Persistencia de datos**: Los datos de PostgreSQL se guardan en un volumen Docker (`postgres_data`). Aunque reinicies con `docker compose down` y vuelvas a subir con `docker compose up`, los usuarios, personajes y campañas se mantienen. Solo se pierden si borras el volumen: `docker compose down -v`.

**Usuario admin permanente**: Al arrancar, la app crea un usuario administrador si no existe:
- **Email**: `admin@arcanum.local`
- **Usuario**: `admin`
- **Contraseña por defecto**: `Admin123!`

Puedes cambiar la contraseña del admin con la variable de entorno `ADMIN_DEFAULT_PASSWORD` (solo aplica la primera vez que se crea el usuario). En Docker: `ADMIN_DEFAULT_PASSWORD=TuContraseña docker compose up --build`.

Para parar: `Ctrl+C` o en otra terminal `docker compose down` (sin `-v` para conservar los datos).

---

### Opción sin Docker (desarrollo local)

1. **PostgreSQL** instalado y base creada (`createdb arcanum_db`). Configura `backend/.env` (copia de `.env.example`).
2. **Backend**: `cd backend && npm install && npm run dev`.
3. **Frontend**: en otra terminal, `cd frontend && npm install && npm run dev`. Abre http://localhost:5173.

## Future Enhancements

- [ ] Complete spell list (400+ spells)
- [ ] Extended monsters database
- [ ] Multiclass support
- [ ] Campaign management
- [ ] Dice roller integration

---

**Status**: Full-stack app with auth, character creation, character sheet, and play session tracking. Backend and frontend operational.
