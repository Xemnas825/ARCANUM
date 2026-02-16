# Prompt para recordar mejoras de ARCANUM

**Copia y pega este bloque cuando quieras que implemente estas mejoras en la app ARCANUM (D&D 5e, Vue + Express):**

---

Implementa en ARCANUM las siguientes mejoras, en el orden que sea más lógico (backend cuando haga falta, luego frontend):

## Navegación y contexto
- Añadir breadcrumbs o pestañas claras (ej. Personajes > [Nombre] > Ficha / En partida).
- En la lista de personajes: mostrar fecha de última modificación o “última partida”.
- En la lista: indicador visual por clase (icono o color) para reconocer personajes de un vistazo.
- Confirmación antes de borrar personaje (“¿Eliminar a [nombre]? No se puede deshacer”).

## Creación de personaje
- Vista previa antes de crear: botón que muestre resumen (nombre, raza, clase, estadísticas, competencias) antes de enviar.
- Validación en tiempo real: avisar si nombre vacío, habilidades fuera de 8–20, “elige hasta 2 competencias”, etc.
- Recordar en localStorage si el usuario prefiere “Tiradas de dados” o “Modo estándar” y preseleccionarlo.

## Vista “En partida”
- Botones Descanso corto / Descanso largo que apliquen reglas 5e (recuperar dados de golpe, vida, slots de hechizo) y actualicen backend.
- Mini lanzador de dados (d20, d6, 2d6+3, etc.) con resultado visible.
- Campo “Notas de partida” por personaje guardado en backend.

## Ficha y datos
- Poder editar personaje: nombre, alineamiento, trasfondo, ideales/vínculos/defectos desde la ficha (y guardar en backend).
- Vista “Imprimir ficha” o ruta solo con la ficha, bien maquetada para imprimir o guardar como PDF.

## Lista y organización
- Ordenar personajes por nombre, nivel o última modificación (y opcionalmente guardar preferencia).
- Si hay muchos personajes: búsqueda/filtro por nombre (o clase/raza).

## Feedback y robustez
- Mensajes de éxito (toast o similar) al crear personaje, guardar en partida o editar.
- Manejo de carga y errores claro (spinner/skeleton, mensaje si falla la API, botón reintentar).

## Accesibilidad y tema
- Revisar contraste y focus visible al navegar con teclado.
- Opcional: toggle tema claro / oscuro (variables CSS).

---

*Generado para usar como prompt en Cursor/Codex. Proyecto: ARCANUM, stack Vue 3 + Vite + Pinia (frontend), Express + PostgreSQL (backend).*
