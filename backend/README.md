# ARCANUM - Backend

Backend de la aplicación D&D construida con **TypeScript**, **Express** y **PostgreSQL**.

## Características
- API REST para gestión de personajes
- Almacenamiento de datos en PostgreSQL
- Razas y clases de D&D 5e en español e inglés
- Gestión de estadísticas de partida (oro, vida, puntos de hechizo, etc.)
- Tipos TypeScript completos

## Stack Tecnológico
- **Node.js** + **Express** - Framework web
- **TypeScript** - Type-safe JavaScript
- **PostgreSQL** - Base de datos
- **pg** - Cliente PostgreSQL

## Instalación

### Requisitos previos
- Node.js 18+
- PostgreSQL 12+

### Pasos

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   ```bash
   # Copiar archivo de ejemplo
   cp .env.example .env
   
   # Editar .env con tu configuración de PostgreSQL
   # DB_USER=postgres
   # DB_PASSWORD=tu_contraseña
   # DB_HOST=localhost
   # DB_PORT=5432
   # DB_NAME=arcanum_db
   ```

3. **Crear base de datos:**
   ```bash
   createdb arcanum_db
   ```

4. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

5. **Build para producción:**
   ```bash
   npm run build
   npm start
   ```

## Estructura de carpetas

```
src/
├── index.ts                 # Archivo principal
├── types/                   # Tipos TypeScript
│   └── index.ts
├── database/                # Configuración de BD
│   ├── pool.ts
│   └── init.ts
├── controllers/             # Lógica de negocio
│   ├── characterController.ts
│   └── dndController.ts
├── routes/                  # Rutas de API
│   └── index.ts
└── data/                    # Datos estáticos
    └── dnd-data.ts          # Razas y clases
```

## Endpoints de API

### Razas y Clases
- `GET /api/races` - Obtener todas las razas
- `GET /api/races/:id` - Obtener raza por ID
- `GET /api/classes` - Obtener todas las clases
- `GET /api/classes/:id` - Obtener clase por ID

### Personajes
- `POST /api/characters` - Crear nuevo personaje
- `GET /api/characters/:id` - Obtener personaje
- `GET /api/users/:userId/characters` - Listar personajes de un usuario
- `PATCH /api/characters/:characterId/stats` - Actualizar estadísticas de partida
- `DELETE /api/characters/:id` - Eliminar personaje

### Salud del servidor
- `GET /health` - Verificar estado del servidor

## Ejemplo: Crear personaje

```bash
curl -X POST http://localhost:3001/api/characters \
  -H "Content-Type: application/json" \
  -d '{
    "nameEs": "Aragorn",
    "nameEn": "Aragorn",
    "raceId": "human",
    "classId": "fighter",
    "userId": "user123"
  }'
```

## Ejemplo: Actualizar estadísticas

```bash
curl -X PATCH http://localhost:3001/api/characters/character-uuid/stats \
  -H "Content-Type: application/json" \
  -d '{
    "currentHealth": 25,
    "currentGold": 150,
    "inspirationPoints": 1
  }'
```
