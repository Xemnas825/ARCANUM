# ARCANUM - App D&D

Aplicación web completa para crear y gestionar personajes de Dungeons & Dragons 5e, con soporte para español e inglés.

## Características

- ✅ **Creación de personajes** - Selecciona entre 9 razas y 12 clases oficiales de D&D 5e
- ✅ **Gestión de partida** - Actualiza oro, vida, puntos de hechizo, inspiración en tiempo real
- ✅ **Multiidioma** - Interfaz completamente en español e inglés
- ✅ **Base de datos PostgreSQL** - Persistencia segura de datos
- ✅ **TypeScript** - Código type-safe en frontend y backend

## Estructura del Proyecto

```
ARCANUM/
├── backend/                 # API REST (Express + PostgreSQL)
│   ├── src/
│   │   ├── index.ts        # Punto de entrada
│   │   ├── types/          # Tipos TypeScript
│   │   ├── database/       # Configuración PostgreSQL
│   │   ├── controllers/    # Lógica de negocio
│   │   ├── routes/         # Endpoints API
│   │   └── data/           # Razas y clases D&D
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/               # Aplicación Vue (próxyimamente)
│   └── (estructuras por configurar)
│
└── README.md              # Este archivo
```

## Stack Tecnológico

### Backend
- **Node.js** + **Express** - Framework web
- **PostgreSQL** - Base de datos relacional
- **TypeScript** - Type-safe
- **pg** - Cliente PostgreSQL

### Frontend (próximamente)
- **Vue 3** - Framework
- **TypeScript** - Type-safe
- **Vite** - Build tool

## Configuración Rápida

### Backend

1. **Instalar dependencias:**
   ```bash
   cd backend
   npm install
   ```

2. **Configurar base de datos:**
   ```bash
   cp .env.example .env
   # Editar .env con credenciales PostgreSQL
   ```

3. **Crear base de datos:**
   ```bash
   createdb arcanum_db
   ```

4. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

Servidor disponible en: `http://localhost:3001`

## API Endpoints

Ver [backend/README.md](backend/README.md#endpoints-de-api) para documentación completa.

### Ejemplos rápidos

**Obtener todas las razas:**
```bash
curl http://localhost:3001/api/races
```

**Crear personaje:**
```bash
curl -X POST http://localhost:3001/api/characters \
  -H "Content-Type: application/json" \
  -d '{
    "nameEs": "Aragorn",
    "raceId": "human",
    "classId": "fighter",
    "userId": "user123"
  }'
```

## D&D 5e Content

### Razas (9)
- Humano, Elfo, Enano, Medirano, Dracónido, Gnomo, Semiorco, Tieflin, Semiélfo

### Clases (12)
- Bárbaro, Bardo, Clérigo, Druida, Luchador, Monje, Paladín, Explorador, Pícaro, Hechicero, Brujo, Mago

## Próximos Pasos

- [ ] Frontend con Vue 3 + TypeScript
- [ ] Autenticación de usuarios
- [ ] Gestión de equipo y objetos
- [ ] Hechizos y habilidades
- [ ] Combate y rolls de dados
- [ ] Multijugador (sesiones)

## Contribuir

Este es un proyecto personal. Siéntete libre de modificarlo según tus necesidades.

## Licencia

ISC
