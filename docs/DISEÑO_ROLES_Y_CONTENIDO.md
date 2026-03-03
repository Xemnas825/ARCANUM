# ARCANUM — Análisis y diseño: Roles (DM/Jugador), Contenido (Oficial/Homebrew) y Seguridad

Documento técnico para implementar el sistema de roles, gestión de contenido en capas y protección de rutas/expansiones. Incluye **carencias detectadas** y el **plan de modificaciones** (schemas, endpoints, componentes Vue, PWA).

---

## 1. Análisis de la estructura actual

### 1.1 Conexión Front–Back

| Aspecto | Estado actual |
|--------|----------------|
| **API** | REST bajo `/api`. Frontend usa `fetch` en `api/client.ts` con base `/api`. |
| **Auth** | JWT en `Authorization: Bearer <token>`. El token se envía **por parámetro** en cada llamada (`api.get(path, auth.token)`), no hay interceptor que lo inyecte automáticamente. |
| **Rutas protegidas** | Solo las de personajes usan `requireAuth`; el resto (races, classes, spells, monsters, etc.) son **públicas**. |
| **Usuario en front** | `useAuthStore()` guarda `user: { id, username, email }` y `token`. No hay rol ni permisos en el payload. |

**Riesgo de escalabilidad:** Si se añaden muchas rutas protegidas, olvidar el token en una llamada es fácil. Conviene un **interceptor** (o wrapper) que inyecte el token cuando exista.

### 1.2 Backend: datos D&D y personajes

- **Contenido D&D (razas, clases, hechizos, monstruos, etc.):** Todo viene de **ficheros estáticos** (`backend/src/data/*.ts`) importados en memoria en `dnd-data.ts`. No hay BD para este contenido. No hay concepto de **origen** (SRD vs expansión de pago) ni **homebrew**.
- **Personajes:** En PostgreSQL: `users`, `characters`, `abilities`, `game_stats`, `character_skills`, `character_conditions`, `character_inventory`. Los personajes se asocian solo a `user_id`; **no existe `campaign_id`** ni relación con campañas.
- **Validación en creación de personaje:** `characterController.createCharacter` valida `raceId`/`classId`/etc. contra los arrays importados de `dnd-data.js`. Cualquier cambio a “contenido por campaña” obligará a que esa validación consuma una **fuente combinada** (SRD + homebrew de campaña).

### 1.3 Autenticación y autorización

- **JWT:** Solo incluye `userId` y `email`. No hay `role` ni `campaignId` en el token.
- **Middleware:** Solo existe `requireAuth` (comprueba token y pone `req.userId`). No hay `requireRole`, `requireCampaignMaster`, ni comprobación de “este usuario es jugador de esta campaña”.
- **Control de acceso a personajes:** Se hace **en el controller**: `getCharacter` y `getUserCharacters` comprueban que `req.userId` coincida con el dueño. Correcto, pero no reutilizable para “Master puede ver personajes de su campaña”.

### 1.4 Frontend

- **Router:** Rutas por ruta (path), con `meta: { requiresAuth: true }` o `guest: true`. No hay `meta.role` ni rutas por rol (DM vs Jugador).
- **Vistas:** Una lista de personajes (por usuario), ficha, creación, partida. No hay vistas de “campañas”, “invitaciones”, “bestiario”, “homebrew”.
- **API:** Las vistas que necesitan auth pasan `auth.token` manualmente. No hay capa que unifique “si estoy logueado, siempre mando el token”.

---

## 2. Carencias detectadas (resumen)

Antes de escribir código, estas son las carencias que el diseño debe cubrir:

1. **Sin roles en el modelo ni en JWT**  
   No existe DM vs Jugador. No se puede restringir “solo el DM crea campañas / gestiona bestiario / homebrew”.

2. **Sin concepto de campaña**  
   No hay tabla `campaigns` ni `campaign_members`. No se puede “invitar jugadores” ni “asociar personaje a campaña”.

3. **Contenido D&D monolítico y público**  
   Todo el contenido (races, classes, spells, monsters, etc.) es el mismo para todos y sin protección. No hay:
   - Diferenciación oficial (read-only) vs homebrew (editable por DM).
   - Capa “por campaña” para inyectar homebrew.
   - Protección de expansiones de pago (todo es accesible sin auth).

4. **Sin middlewares de autorización por rol/contexto**  
   Solo `requireAuth`. Faltan: “es Master de esta campaña”, “es jugador de esta campaña”, “tiene acceso a esta expansión”.

5. **Token no inyectado de forma centralizada en el front**  
   Riesgo de olvidar el token en nuevas pantallas o servicios.

6. **Sin diseño de “capas” de contenido**  
   No está definido cómo se mezcla SRD + homebrew por campaña en un mismo endpoint (p. ej. opciones de creación de personaje).

7. **Sin estrategia para contenido de pago**  
   No hay API key, ni sesión, ni flag en usuario/campaña para desbloquear bestiario/expansión.

8. **Frontend sin estructura para campañas ni DM**  
   No hay componentes ni rutas para: listar campañas, detalle de campaña, invitaciones, bestiario, CRUD de homebrew.

---

## 3. Sistema de roles (DM y Jugador)

### 3.1 Modelo de roles

- **Jugador:** Usuario que crea y gestiona sus personajes; puede unirse a campañas y asignar personajes a una campaña. Solo ve contenido que el DM autorice (SRD + homebrew de la campaña).
- **DM (Master):** Puede crear campañas, invitar jugadores, gestionar bestiario (oficial/pago si se implementa) y crear contenido homebrew por campaña. “Ser DM” se deriva de **ser el creador o miembro con rol `master` en al menos una campaña**, no necesariamente un campo global en `users` (aunque se puede añadir para conveniencia).

Recomendación: **no** poner un único rol global en `users` (ej. “eres DM en toda la app”), sino **rol por campaña** en `campaign_members`. Así un usuario puede ser DM en una campaña y jugador en otra. Opcional: campo `users.role` para “admin” u otras funciones globales en el futuro.

### 3.2 Uso en autorización

- Crear campaña: cualquier usuario autenticado (el creador será DM de esa campaña).
- Invitar / expulsar de campaña, editar campaña, CRUD homebrew: **solo si el usuario es Master de esa campaña**.
- Ver personajes de la campaña (lista para el Master): **solo Master**.
- Asignar mi personaje a una campaña, ver mis personajes en la campaña: **jugador que sea miembro de esa campaña**.
- Acceso a contenido (opciones de creación, bestiario): según **capa** (sección 4): siempre SRD; si hay `campaignId`, SRD + homebrew de esa campaña; expansiones de pago según suscripción/sesión (sección 5).

---

## 4. Gestión de contenido: Oficial vs Homebrew y capas

### 4.1 Tipos de contenido

| Tipo | Fuente | Quién puede modificar | Alcance |
|------|--------|------------------------|--------|
| **Oficial (SRD)** | Ficheros en backend (o futura BD de solo lectura) | Nadie (read-only) | Global |
| **Homebrew** | BD, tablas por campaña | Solo el DM de esa campaña | Por campaña |
| **De pago** (futuro) | BD o ficheros protegidos | Nadie (solo lectura); acceso por licencia/sesión | Por usuario o por campaña |

### 4.2 Sistema de capas inyectables

Objetivo: que “opciones de creación de personaje” y “bestiario” puedan devolver **SRD + homebrew de la campaña** sin duplicar lógica en cada controlador.

- **Capa 0 – Base:** Siempre se incluye el contenido oficial (SRD). Se puede seguir sirviendo desde ficheros o desde una tabla `srd_*` de solo lectura.
- **Capa 1 – Campaña:** Si el contexto es una campaña (p. ej. `campaignId` en query o en el personaje), se **inyecta** el contenido de las tablas `campaign_races`, `campaign_classes`, `campaign_spells`, etc. Los IDs de homebrew deben ser distinguibles de los del SRD (p. ej. prefijo `hb_` o UUID) para no colisionar.
- **Servicio de contenido:** Un módulo (p. ej. `contentService.js`) que reciba `{ campaignId?: string }` y devuelva “razas = SRD + homebrew de campaña”, “clases = SRD + homebrew”, etc. Los controladores de personaje y de opciones de creación consumen este servicio en lugar de importar solo `dnd-data.js`.
- **Bestiario:** Igual: “monstruos visibles” = SRD (y si aplica expansión de pago) + monstruos homebrew de la campaña. El DM gestiona el bestiario (oficial + homebrew) en la UI de la campaña.

### 4.3 Diferenciación en BD y APIs

- **Oficial:** IDs estables (ej. `human`, `fighter`). No se guardan en tablas editables; son referencia.
- **Homebrew:** Filas en `campaign_races`, `campaign_classes`, etc., con `campaign_id`. Identificador único (ej. `id = uuid`) para no chocar con el SRD. Al devolver listas combinadas, el frontend puede marcar `source: 'srd' | 'homebrew'` para mostrar badge o filtros.

---

## 5. Seguridad y privacidad

### 5.1 JWT y middlewares

- **Mantener JWT** como está (Bearer, 7 días). Opcional: incluir en el payload `roleInCampaign?: { campaignId: string, role: 'master' | 'player' }[]` para reducir consultas; si no, se comprueba en BD en cada petición.
- **Middlewares propuestos:**
  - `requireAuth` (ya existe).
  - `requireCampaignMember(campaignIdParam)` – el usuario debe ser miembro de la campaña (master o player).
  - `requireCampaignMaster(campaignIdParam)` – el usuario debe ser master de esa campaña. Útil para: PATCH/PUT/DELETE campaña, invitar, CRUD homebrew, ver lista de personajes de la campaña.
  - `requireCharacterOwnerOrCampaignMaster` – para GET/PATCH del personaje: o eres el dueño o eres el Master de la campaña a la que pertenece el personaje (si tiene `campaign_id`).

### 5.2 Protección de expansiones de pago

- **No exponer listados completos de pago en rutas públicas.** Que todas las rutas de “contenido ampliado” (bestiario de pago, razas/clases de pago) exijan `requireAuth` y, además, un middleware que compruebe “este usuario (o su campaña) tiene acceso a la expansión X”.
- **Opciones de implementación:**
  - **Por usuario:** Tabla `user_entitlements( user_id, expansion_key )`. El backend comprueba antes de servir contenido de esa expansión.
  - **Por API Key (servidor a servidor):** Si en el futuro un tercero paga por API, se valida una API key asociada a un `expansion_key` y se sirve solo ese contenido.
  - **Por sesión:** Si el “desbloqueo” es temporal (ej. evento), guardar en sesión o en token un claim `entitlements: string[]`.
- **Recomendación inicial:** Rutas de contenido actuales (SRD) pueden seguir públicas si se desea. Al añadir contenido de pago, meterlo en rutas nuevas (ej. `/api/expansions/:key/races`) protegidas con `requireAuth` + `requireEntitlement(key)` que consulte `user_entitlements` o equivalente.

### 5.3 Resumen de aplicación

- Rutas de **personajes** y **campañas**: siempre `requireAuth`.
- Acciones que modifican campaña o homebrew: `requireAuth` + `requireCampaignMaster`.
- Acciones que leen personaje de otro (Master viendo ficha): `requireAuth` + “soy dueño o Master de la campaña del personaje”.
- Contenido de pago: `requireAuth` + comprobación de titularidad/entitlement.

---

## 6. Modificaciones necesarias en modelos de datos (Schemas)

### 6.1 Tablas nuevas

- **campaigns**  
  `id` (UUID), `name`, `description`, `image_url` (opcional), `master_user_id` (FK users), `created_at`, `updated_at`.

- **campaign_members**  
  `campaign_id` (FK campaigns), `user_id` (FK users), `role` (`'master' | 'player'`), `joined_at`. PK (`campaign_id`, `user_id`). El creador se inserta con `role = 'master'`.

- **campaign_invitations** (opcional, fase 2)  
  `id`, `campaign_id`, `email` o `invited_user_id`, `token`, `expires_at`, `created_at`.

- **Contenido homebrew por campaña** (misma estructura que SRD donde aplique):  
  - `campaign_races` (id, campaign_id, name_es, name_en, description_es, description_en, ability_bonus JSONB, speed, size, languages JSONB, traits JSONB, subraces JSONB, …)  
  - `campaign_classes` (id, campaign_id, name_es, name_en, hit_dice, primary_ability, saving_throws JSONB, skill_options JSONB, subclasses JSONB, …)  
  - `campaign_spells`, `campaign_monsters`, `campaign_magic_items`, etc. (según necesidad).  
  Los IDs de homebrew pueden ser UUID para no colisionar con IDs SRD (string).

### 6.2 Cambios en tablas existentes

- **users**  
  Añadir (opcional) `role` VARCHAR para uso global (ej. `admin`). Para solo DM/Jugador, puede no ser necesario si el rol se deriva de `campaign_members`.

- **characters**  
  Añadir `campaign_id` UUID NULLABLE FK a `campaigns`. Si `campaign_id` es NULL, el personaje es “suelto” (solo SRD). Si tiene valor, el personaje pertenece a esa campaña y las opciones de contenido deben incluir homebrew de esa campaña.

### 6.3 Contenido de pago (futuro)

- **user_entitlements** (o `campaign_entitlements`): `user_id` (o `campaign_id`), `expansion_key` (ej. `bestiary_xanathar`), `granted_at`.  
- Las rutas que sirven ese contenido comprobarán esta tabla (o API key asociada).

---

## 7. Nuevos endpoints necesarios en el Backend

### 7.1 Campañas

- `POST   /api/campaigns` (requireAuth) – Crear campaña; el usuario actual es el master.
- `GET    /api/campaigns` (requireAuth) – Listar campañas del usuario (donde es master o player).
- `GET    /api/campaigns/:id` (requireAuth, requireCampaignMember) – Detalle de una campaña.
- `PATCH  /api/campaigns/:id` (requireAuth, requireCampaignMaster) – Actualizar nombre/descripción.
- `DELETE /api/campaigns/:id` (requireAuth, requireCampaignMaster) – Eliminar campaña (y lógica de borrado en cascada o desvincular personajes).
- `POST   /api/campaigns/:id/members` (requireAuth, requireCampaignMaster) – Invitar jugador (por email o user id).
- `GET    /api/campaigns/:id/members` (requireAuth, requireCampaignMember) – Listar miembros.
- `DELETE /api/campaigns/:id/members/:userId` (requireAuth, requireCampaignMaster o el propio usuario) – Expulsar o abandonar.

### 7.2 Personajes en contexto de campaña

- `GET    /api/campaigns/:id/characters` (requireAuth, requireCampaignMember) – Lista de personajes de la campaña (para Master: todos; para Player: solo los suyos, o según regla).
- Mantener `GET /api/users/:userId/characters` para “mis personajes” (propios).
- Al crear/actualizar personaje: permitir cuerpo `campaignId` (opcional). Si se envía, validar que el usuario sea miembro y que las opciones (raza, clase, etc.) vengan de SRD + homebrew de esa campaña.

### 7.3 Contenido en capas

- `GET    /api/character-creation-options?campaignId=:id` (opcional campaignId; si va en query, requireAuth + requireCampaignMember) – Devolver razas, clases, backgrounds, alignments = SRD + homebrew de esa campaña. Si no hay campaignId, solo SRD (comportamiento actual).
- Para bestiario (monstruos):  
  - `GET    /api/campaigns/:id/monsters` (requireAuth, requireCampaignMember) – Monstruos visibles en la campaña (SRD + homebrew de campaña; y si hay expansión de pago, según entitlement).  
  - El DM podría tener además `GET/POST/PUT/DELETE /api/campaigns/:id/homebrew/monsters` (requireCampaignMaster).

### 7.4 Homebrew (CRUD por tipo)

- `GET    /api/campaigns/:id/homebrew/races` (requireAuth, requireCampaignMember) – Listar razas homebrew.
- `POST   /api/campaigns/:id/homebrew/races` (requireAuth, requireCampaignMaster) – Crear raza homebrew.
- `GET    /api/campaigns/:id/homebrew/races/:raceId` (requireAuth, requireCampaignMember) – Una raza.
- `PATCH  /api/campaigns/:id/homebrew/races/:raceId` (requireAuth, requireCampaignMaster) – Actualizar.
- `DELETE /api/campaigns/:id/homebrew/races/:raceId` (requireAuth, requireCampaignMaster) – Eliminar.  
  Idem para **classes**, **spells**, **monsters**, **magic-items** según prioridad.

### 7.5 Invitaciones (fase 2)

- `POST   /api/campaigns/:id/invitations` (requireAuth, requireCampaignMaster) – Crear invitación (email o link).
- `GET    /api/invitations/:token` (público o requireAuth) – Ver invitación y aceptar/rechazar.
- `POST   /api/invitations/:token/accept` (requireAuth) – Aceptar → insertar en campaign_members.

### 7.6 Seguridad en rutas existentes

- **Personajes:**  
  - `GET /api/characters/:id`: además de “soy el dueño”, permitir “soy Master de la campaña a la que pertenece este personaje” (si tiene `campaign_id`).  
  - PATCH/PUT/DELETE de personaje: solo dueño (y opcionalmente Master con permisos limitados en partida, si se define después).

---

## 8. Plan de componentes y vistas en Vue 3

### 8.1 Nuevos componentes/vistas

- **Campañas (lista):** Vista que liste “Mis campañas” (donde soy DM o jugador). Enlace a crear campaña (solo si se desea restringir por rol) o permitir a todos.
- **Detalle de campaña:** Tabs o secciones: Resumen, Personajes (lista), Invitaciones (si aplica), Bestiario (monstruos), Homebrew (razas, clases, hechizos, etc.). Según rol: DM ve botones “Añadir homebrew”, “Invitar”; Jugador solo ve resumen y sus personajes en esa campaña.
- **Crear/Editar campaña:** Formulario nombre, descripción, imagen (opcional).
- **Homebrew:** Componentes reutilizables por tipo (Raza, Clase, Hechizo, Monstruo): lista + formulario crear/editar. Los formularios pueden ser similares a los datos SRD (mismos campos) con `source: 'homebrew'`.
- **Invitaciones:** Modal o vista “Invitaciones pendientes” y flujo “Aceptar invitación” desde link o lista.
- **Selector de campaña:** En “Crear personaje” y en “Mis personajes”, selector opcional “¿Para qué campaña?” (dropdown de campañas del usuario). Si se elige campaña, las opciones de creación se piden con `?campaignId=...`.

### 8.2 Componentes a modificar

- **CreateCharacterView:**  
  - Añadir selector de campaña (opcional).  
  - Llamar a `GET /character-creation-options?campaignId=...` cuando haya campaña seleccionada; si no, sin query (solo SRD).  
  - Mostrar en desplegables razas/clases/backgrounds combinados (SRD + homebrew), con indicador visual si es homebrew (opcional).

- **CharacterListView:**  
  - Pestañas o filtros: “Todos mis personajes” vs “Por campaña” (dropdown por campaña).  
  - Mostrar `campaign_id` o nombre de campaña en cada card si aplica.

- **CharacterSheetView / PlaySessionView:**  
  - Mostrar campaña si el personaje tiene `campaign_id`.  
  - Si el usuario es Master de esa campaña, permitir “Ver como Master” (solo lectura de fichas de otros jugadores) desde la vista de campaña, no desde “Mis personajes”.

- **AppHeader / navegación:**  
  - Añadir enlace “Campañas” y, si hay campaña abierta, contexto (ej. “Campaña: Nombre”) o breadcrumb.

- **Router:**  
  - Rutas nuevas: `/campanas`, `/campanas/nueva`, `/campanas/:id`, `/campanas/:id/homebrew`, `/invitaciones/:token` (aceptar).  
  - `meta: { requiresAuth: true }` en todas; opcional `meta: { requiresMaster: true }` para vistas que solo el DM deba ver (se puede comprobar en vista con el rol en store o con respuesta de API).

### 8.3 Store y API en frontend

- **Store de campañas:** Pinia store `useCampaignStore`: lista de campañas del usuario, campaña actual seleccionada, miembros, métodos para fetch/create/update/leave.
- **Store de contenido:** Opcional `useContentStore` para cachear “opciones de creación por campaña” y evitar llamadas repetidas.
- **Cliente API:**  
  - Interceptor o wrapper que inyecte `auth.token` en todas las peticiones cuando exista (evitar pasar token en cada llamada).  
  - Métodos para nuevos endpoints: campaigns, homebrew, invitations.

---

## 9. PWA instalable

Para convertir la web en PWA instalable:

1. **Manifest:** Añadir `manifest.webmanifest` (o `manifest.json`) en `frontend/public/` con `name`, `short_name`, `description`, `start_url` (ej. `/`), `display: standalone` o `minimal-ui`, `theme_color`, `background_color`, e iconos en varios tamaños (192, 512 como mínimo).
2. **Service Worker:** Registrar un service worker (Vite puede usar `vite-plugin-pwa` con `workbox`). Configurar estrategia de caché para la app (ej. “Network First” para API, “Cache First” para assets estáticos) para que funcione offline de forma básica.
3. **Iconos:** Generar iconos 192x192 y 512x512 desde el logo de ARCANUM y referenciarlos en el manifest.
4. **HTTPS:** Las PWA requieren HTTPS en producción (en local, `localhost` suele ser aceptado).
5. **Detección de instalación:** Opcional: mostrar un banner “Instalar app” cuando `beforeinstallprompt` esté disponible y el usuario no la haya instalado.

Con Vite, la opción más directa es `vite-plugin-pwa`: añadir el plugin en `vite.config.ts`, configurar `registerType: 'autoUpdate'` o `prompt` según se quiera actualizar en segundo plano o pedir confirmación, y asegurar que el build genere el SW y el manifest.

---

## 10. Orden sugerido de implementación

1. **BD y migraciones:** Tablas `campaigns`, `campaign_members`, y columna `characters.campaign_id`. Sin homebrew aún.
2. **Middlewares:** `requireCampaignMember`, `requireCampaignMaster` (y opcional `requireCharacterOwnerOrCampaignMaster`).
3. **Endpoints de campañas:** CRUD básico y miembros; luego integración en “crear personaje” con `campaignId` opcional.
4. **Frontend:** Store campañas, vistas lista/detalle/crear campaña, selector de campaña en creación de personaje y en lista de personajes.
5. **Contenido en capas:** Servicio en backend que combine SRD + homebrew por campaña; endpoint `character-creation-options?campaignId=`.
6. **Tablas y CRUD homebrew:** Empezar por razas y clases; después hechizos y monstruos.
7. **Invitaciones:** Tabla y flujo aceptar invitación.
8. **Contenido de pago:** Tabla `user_entitlements` y protección de rutas de expansiones cuando se añadan.
9. **PWA:** Manifest + `vite-plugin-pwa` + iconos.

Este orden mantiene la estructura actual (usuarios, personajes, fichas) y añade campañas y permisos sin romper lo que ya funciona, y deja la puerta abierta a homebrew y expansiones de pago.
