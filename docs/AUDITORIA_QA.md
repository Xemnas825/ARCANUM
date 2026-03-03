# Auditoría QA — ARCANUM

Resumen de hallazgos antes de aplicar cambios. Dar el visto bueno para que se ejecuten las correcciones propuestas.

---

## 1. Código muerto

### Frontend

| Elemento | Ubicación | Acción propuesta |
|----------|-----------|------------------|
| **HelloWorld.vue** | `frontend/src/components/HelloWorld.vue` | No está importado en `App.vue` ni en el router. Es el componente por defecto de Vue y no se usa. | **Eliminar** el archivo. |
| **types/api.ts** | `frontend/src/types/api.ts` | Define DTOs (CampaignDto, CharacterSheetDto, etc.) pero **ningún archivo los importa**. Las vistas y stores usan tipos inline o de los stores. | **Eliminar** el archivo o **usar** estos tipos en vistas/stores para tipar respuestas del API (recomendado: usarlos para consistencia). |

### Backend

| Elemento | Ubicación | Acción propuesta |
|----------|-----------|------------------|
| **dndController: funciones sustituidas por contentController** | `backend/src/controllers/dndController.ts` | Las siguientes funciones ya **no se usan** en las rutas (ahora se usan las de contentController): `getCharacterCreationOptions`, `getAllRaces`, `getRaceById`, `getAllClasses`, `getClassById`, `getAllSpells`, `getSpellById`, `getAllMonsters`, `getMonsterById`. | **Eliminar** esas 9 funciones de dndController para evitar duplicidad y confusión. El resto (getSubraceById, getSubclassById, weapons, armor, backgrounds, feats, conditions, alignments, magic-items) sí se usan. |

---

## 2. Conexión end-to-end (Front ↔ Back)

Revisión por flujo:

| Vista / flujo | Endpoint(s) usado(s) | ¿Existe en Back? | ¿Formato correcto? |
|---------------|----------------------|-------------------|---------------------|
| AuthView (login/register) | POST /auth/login, POST /auth/register | Sí | Sí |
| CharacterListView | GET /users/:userId/characters, DELETE /characters/:id | Sí | Sí |
| CreateCharacterView | GET /character-creation-options?campaignId=, POST /characters | Sí | Sí |
| CharacterSheetView | GET /characters/:id, PATCH /characters/:id, DELETE /characters/:id | Sí | Sí |
| PlaySessionView | GET /characters/:id, PATCH /characters/:id/stats, PUT /characters/:id/conditions, POST/PATCH/DELETE inventory | Sí (ruta stats usa param `:characterId` en backend pero URL es la misma) | Sí |
| CampaignListView / Store | GET/POST/PATCH/DELETE /campaigns, GET /campaigns/:id | Sí | Sí |
| CampaignDetailView | GET /campaigns/:id, GET /campaigns/:id/characters | Sí | Sí |
| CreateCampaignView | POST /campaigns | Sí | Sí |

**Conclusión**: No falta ningún endpoint. Todas las llamadas del front tienen su ruta y controlador en el back.

---

## 3. Consistencia de tipos / modelos (Postgres → Back → Front)

### Ficha de personaje (CharacterSheet)

- **Backend**: `characterSheetService.buildCharacterSheet` devuelve un objeto con claves en **camelCase** (nameEs, raceId, health, spellSlots, concentratingOn, activeConditions, inventory, etc.), alineado con el tipo `CharacterSheet` en `backend/src/types/index.ts`.
- **Frontend**: CharacterSheetView y PlaySessionView usan `sheet.value.nameEs`, `sheet.value.health`, `sheet.value.concentratingOn`, `sheet.value.activeConditions`, `sheet.value.inventory`, etc. Coinciden con lo que devuelve el back.
- **JSONB en backend**: En tablas homebrew (homebrew_races, homebrew_monsters, etc.) los campos JSONB (ability_bonus, traits, actions, etc.) se leen como objetos/arrays; el contentService los mapea a la forma esperada por el front (camelCase, misma estructura que el SRD). No se ha detectado desalineación.

### Lista de personajes

- **Backend**: GET /users/:userId/characters devuelve filas con `name_es`, `name_en`, `race_id`, `class_id`, `level`, `campaign_id`, etc. (snake_case).
- **Frontend**: CharacterListView usa `c.name_es`, `c.name_en`, `c.race_id`, `c.class_id`, `c.level`, `c.campaign_id`. Coincide.

### Campañas

- **Backend**: listCampaigns y getCampaign devuelven `id`, `name`, `description`, `image_url`, `master_user_id`, `created_at`, `updated_at`, `role` (y en detalle `members`).
- **Frontend**: stores/campaigns.ts y vistas usan esas mismas propiedades. Coincide.

**Conclusión**: No hay inconsistencias detectadas entre lo que devuelve Postgres (vía controladores/servicios) y lo que el front espera. Los JSONB de homebrew están mapeados a la misma forma que el contenido oficial.

---

## 4. Logs y limpieza

### console.log / console.error

| Ubicación | Uso | Acción propuesta |
|-----------|-----|------------------|
| **backend/src/index.ts** | `console.log` al arrancar (puerto, API) | **Mantener**: útil en arranque. |
| **backend/src/database/init.ts** | Múltiples `console.log` por tabla y “Usuario admin creado” | **Mantener**: útiles para ver que la BD y el admin se han inicializado. |
| **backend/src/database/init.ts** | `console.error` en catch de init | **Mantener**: necesario para depuración. |
| **backend controllers/middleware** | `console.error` en bloques catch | **Mantener**: errores de servidor deben registrarse. |
| **backend/src/database/pool.ts** | `console.error` en error del pool | **Mantener**. |

No hay `console.log` de prueba sueltos en el frontend. No se propone eliminar los logs actuales del backend; son apropiados para diagnóstico.

### Comentarios de código antiguo

- No se han encontrado bloques grandes de código comentado ni comentarios obsoletos que haya que borrar.
- Los comentarios en español en rutas y controladores son descriptivos y están bien.

### Manejo de errores en el front (evitar que se quede colgado)

| Vista | ¿Loading? | ¿Error mostrado? | ¿finally / loading = false? |
|-------|-----------|------------------|-----------------------------|
| CharacterListView | Sí | Sí (error.value) | Sí |
| CharacterSheetView | Sí | Sí | Sí |
| PlaySessionView | Sí | Sí | Sí |
| CreateCharacterView | Sí | Sí | Sí |
| CreateCampaignView | Sí (sending) | Sí | Sí |
| CampaignListView | Sí | Sí (campaignsStore.error) | Sí |
| CampaignDetailView | Sí (loading + loadingChars) | Sí | Sí; loadCharacters en catch pone array vacío y finally loadingChars = false |
| AuthView | Sí (loading) | Sí | Sí |

Si el backend falla, el front captura el error, asigna un mensaje a `error` (o al store) y sale del estado de carga. No se detectan flujos que dejen la UI colgada sin mensaje.

**Conclusión**: Manejo de errores consistente; no se requieren cambios por “colgado”. Logs actuales del backend se consideran adecuados; no hay limpieza obligatoria.

---

## 5. Variables de entorno y configuración (API / puertos)

### Backend

- **.env.example** contiene: DB_*, PORT, NODE_ENV.  
- **Faltan en .env.example** (usados en código):
  - `JWT_SECRET` (auth y middleware; por defecto hay un valor de desarrollo en código).
  - `ADMIN_DEFAULT_PASSWORD` (solo para creación del admin; opcional).

**Acción propuesta**: Añadir en `.env.example` comentarios o líneas opcionales para `JWT_SECRET` y `ADMIN_DEFAULT_PASSWORD`, para documentar despliegue y producción.

### Frontend (no usa Axios)

- **api/client.ts**: `const API_BASE = '/api'`. Todas las peticiones son a `/api/...` (ruta relativa).
- **Desarrollo**: Vite proxy en `vite.config.ts` redirige `/api` y `/health` a `http://localhost:3001`. Puerto 3001 coincide con el backend.
- **Producción (Docker)**: El front se sirve desde el mismo origen que el backend; `/api` es correcto y no depende de variable de entorno en el front.

**Conclusión**: No hay desalineación de puertos ni URLs. La conexión no falla por configuración de API; solo conviene documentar JWT y admin en .env.example.

---

## 6. Resumen de acciones recomendadas (aplicadas)

| # | Acción | Estado |
|---|--------|--------|
| 1 | Eliminar **HelloWorld.vue** (no usado). | No existía en el proyecto (ya eliminado o nunca creado). |
| 2 | Usar **types/api.ts** para tipar respuestas del API. | Hecho: importado en CharacterListView, CreateCharacterView, CampaignDetailView, CharacterSheetView, PlaySessionView y store campaigns; añadido CharacterSheetDto. |
| 3 | Eliminar del **dndController** las 9 funciones sustituidas por contentController. | Hecho: eliminadas getCharacterCreationOptions, getAllRaces, getRaceById, getAllClasses, getClassById, getAllSpells, getSpellById, getAllMonsters, getMonsterById. |
| 4 | Añadir en **backend/.env.example** JWT_SECRET y ADMIN_DEFAULT_PASSWORD. | Hecho: añadidas variables comentadas con descripción. |

No se requieren cambios para: conexión end-to-end, consistencia de tipos/JSONB, manejo de errores ni configuración de puertos/URLs del front.
