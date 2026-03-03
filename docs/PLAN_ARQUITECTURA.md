# ARCANUM — Plan de arquitectura y funcionalidades

Documento para alinear roles (Master / Jugador), campañas, homebrew y orden de implementación. Sirve de referencia para no implementar cosas que luego choquen con el diseño.

---

## 1. Estado actual (resumen)

- **Usuarios**: registro/login, sin roles. Cualquier usuario es “jugador”.
- **Personajes**: cada usuario tiene sus personajes (`user_id`). No hay concepto de campaña ni de Master.
- **Datos D&D**: razas, clases, hechizos, etc. son **globales** (ficheros en backend). No hay homebrew.
- **Flujo**: Login → Lista de mis personajes → Crear/Editar/Ficha/En partida. Todo privado por usuario.

---

## 2. Roles propuestos

| Rol        | Descripción |
|-----------|-------------|
| **Jugador** | Usuario que crea y gestiona sus personajes. Puede unirse a campañas y asignar personajes a una campaña. |
| **Master**  | Usuario que crea y dirige **campañas**. Gestiona el mundo de esa campaña, invita jugadores, ve sus fichas en ese contexto, y puede definir contenido homebrew para esa campaña. |

Opcional más adelante: **Admin** (gestión global de la app, no prioritario).

---

## 3. Concepto clave: la campaña

Una **campaña** es el “mundo de juego” que dirige un Master.

- Tiene **un Master** (creador/owner).
- Tiene **jugadores** invitados (relación usuario ↔ campaña con rol).
- Los **personajes** pueden estar “sueltos” (solo míos) o **asociados a una campaña** (mi personaje en la campaña de X).
- El **homebrew** (razas, clases, objetos, etc. custom) vive **por campaña**: el Master de esa campaña lo define y solo aplica ahí.

Así se evita mezclar “mis personajes en general” con “mis personajes en la partida del Master Pepito”, y el homebrew no contamina el resto del mundo.

---

## 4. Qué puede hacer cada rol

### 4.1 Jugador

- Registrarse e iniciar sesión.
- **Personajes**:
  - Crear, editar, eliminar **sus** personajes.
  - Ver lista de “Mis personajes” (los suyos).
  - Asignar un personaje a una campaña (si el Master le ha invitado) o dejarlo sin campaña.
- **Campañas**:
  - Ver campañas a las que está invitado.
  - Aceptar/rechazar invitaciones (si se implementan).
  - En una campaña: ver su ficha “en partida” (vida, hechizos, condiciones, etc.) y que el Master pueda verla (solo en esa campaña).
- **Datos**: Usar siempre **datos base (SRD)** + **homebrew de la campaña** en la que esté creando/usando el personaje (si aplica).

### 4.2 Master

- Todo lo del Jugador, más:
- **Campañas**:
  - Crear campaña (nombre, descripción, imagen opcional).
  - Invitar jugadores (por usuario/email o link de invitación).
  - Ver lista de personajes de la campaña (de todos los jugadores de esa campaña).
  - Ver fichas en “vista partida” (vida, condiciones, etc.) para dirigir la partida.
- **Mundo / Homebrew de la campaña**:
  - Añadir contenido custom **solo para esa campaña**:
    - Razas homebrew
    - Clases homebrew
    - Hechizos, objetos, monstruos, etc.
  - Los jugadores de esa campaña, al crear o editar personajes **en esa campaña**, eligen entre SRD + homebrew de la campaña.
- **No** puede editar los personajes de los jugadores (salvo que se decida lo contrario más adelante, p. ej. “Master puede ajustar PG en partida”).

---

## 5. Homebrew: cómo integrarlo

### 5.1 Dónde vive el homebrew

- **Por campaña**: cada campaña tiene su “bolsa” de homebrew (razas, clases, hechizos, objetos, etc.).
- **No global** (al menos en una primera versión): no hay “homebrew de la app” compartido por todos; todo custom va asociado a una campaña.
- Opcional futuro: “Biblioteca personal” de un usuario (razas/clases que yo creo y reutilizo en mis campañas si soy Master).

### 5.2 Cómo se usa en la app

- **Crear personaje**:
  - Si el personaje se crea “sin campaña”: solo datos **SRD** (los que ya tienes en backend).
  - Si se crea **dentro de una campaña**: en los desplegables se ofrece **SRD + homebrew de esa campaña** (razas, clases, etc.).
- **API**: endpoints del tipo “opciones de creación para esta campaña” que mezclen SRD + homebrew de la campaña. El frontend ya usa algo como `character-creation-options`; podría existir `character-creation-options?campaignId=xxx`.
- **Almacenamiento**: tablas `campaign_races`, `campaign_classes`, `campaign_spells`, etc., con `campaign_id` y los mismos campos que los datos base (o un JSON flexible). Los personajes de esa campaña pueden tener `race_id` que apunte a `campaign_races.id` o al id de SRD.

### 5.3 Prioridad

- Primero: campañas + roles (Master/Jugador) y que los personajes se asocien a campaña.
- Después: homebrew por campaña (empezar por razas/clases custom es lo más útil).

---

## 6. Modelo de datos futuro (resumen)

Para cuando implementes, sin bajar aún a SQL:

- **users**: como ahora (+ opcional `role` global si quieres Admin en el futuro).
- **campaigns**: id, name, description, **master_user_id**, created_at, updated_at.
- **campaign_members**: campaign_id, user_id, role (`master` | `player`), joined_at. El Master suele ser el creador; puede haber solo un master por campaña o permitir co-masters después.
- **characters**: como ahora + **campaign_id** (nullable). Si `campaign_id` es null, el personaje es “suelto” (solo mío, solo SRD). Si tiene valor, pertenece a esa campaña y usa SRD + homebrew de esa campaña.
- **Homebrew por campaña**: tablas `campaign_races`, `campaign_classes`, `campaign_spells`, etc., con `campaign_id` y los campos necesarios (o un modelo JSON por tipo de contenido).

Reglas de negocio:

- Un personaje con `campaign_id` solo es visible/editable por su dueño (user_id) y por el Master de esa campaña (solo lectura o según reglas que definas).
- Las opciones de creación para un personaje con campaña = SRD + homebrew de esa campaña.

---

## 7. Orden sugerido de implementación

Para no plantar cosas mal y tener que deshacer:

1. **Roles en usuario**
   - Añadir campo `role` en `users` (`player` | `master`) o derivar “es master” de “tiene al menos una campaña donde es master”. La segunda opción evita un rol global y es más flexible.
2. **Campañas**
   - Tabla `campaigns` y `campaign_members`. Solo creación de campaña por un usuario (ese usuario es el Master). Sin invitaciones aún si quieres simplificar.
3. **Asociar personajes a campaña**
   - `characters.campaign_id` nullable. En UI: “Mis personajes” y “Personajes de la campaña X”. Al crear personaje, opción “¿Para qué campaña?” (opcional).
4. **Vista Master**
   - Para el Master: listado de personajes de su campaña (solo lectura o con permisos que definas). Reutilizar la misma “ficha” y “en partida” que ya tienes.
5. **Invitaciones (opcional)**
   - Invitar por email o enlace. Tabla `campaign_invitations` y flujo “aceptar invitación” → se inserta en `campaign_members`.
6. **Homebrew**
   - Tablas de homebrew por campaña. CRUD en backend (solo Master de la campaña). En “opciones de creación de personaje” para esa campaña, mezclar SRD + homebrew.

Este orden mantiene la estructura actual (usuarios, personajes, fichas) y añade campañas y permisos sin romper lo que ya funciona.

---

## 8. Resumen en una frase

- **Jugador**: tiene personajes; puede asociarlos a campañas; usa SRD (+ homebrew de la campaña si aplica).
- **Master**: crea campañas, invita jugadores, ve personajes de su campaña, define homebrew para esa campaña.
- **Homebrew**: por campaña, no global; se integra en “opciones de creación” cuando el personaje pertenece a esa campaña.

Si quieres, el siguiente paso puede ser bajar esto a **cambios concretos en BD y API** (listado de tablas nuevas y endpoints) para la fase 1 (campañas + roles sin homebrew aún).
