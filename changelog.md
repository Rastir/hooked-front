# Changelog — Hooked Frontend

Todos los cambios notables de este proyecto se documentan aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

---

## [Unreleased]## 

## [0.8.0] — 2026-05-06

### Fixed
- Light mode — paleta completa revisada y corregida en todas las páginas
- `variables.css` — paleta light mode rediseñada con fondo `#f0f4f8` y cards
  blancas, textos azul marino para contraste legible
- `components.css` — header `.nav-header` cambiado de color hardcodeado a
  `color-mix` con variable, adaptable a ambos temas
- `base.css` — scrollbar cambiada de colores fijos a variables CSS
- `perfil.css` — hero gradient, skeletons, textos y badges usando variables
- `post.css` — fondo de comentario propio cambiado a `color-mix` con variable
- `index.html` — color de alerta de error cambiado de rgba hardcodeado a
  `color-mix` con `--accent-danger`

### Added
- `index.html` — botón toggle de tema flotante en esquina superior derecha
- `index.html` — carga de `utils.js` e inicialización de tema al arrancar,
  consistente con el resto de páginas

## [0.7.0] — 2026-05-05

### Added
- Light mode funcional con paleta "Amanecer en el muelle"
  (fondo azul pizarra #1e3a5f + cards arena #f5efe6)
- Toggle de tema persistente en el header

### Fixed
- `perfil.css` — reemplazados colores hardcodeados por variables CSS
  para respetar el light mode
- `post.css` — mismo fix, comentarios y skeletons ahora usan variables
- `create-post.css` — formulario y upload adaptan correctamente al tema
- Textos y cards que se perdían en light mode por herencia de colores
  del dark mode

## [0.6.0] — 2026-04-29

### Added
- Light mode toggle en el header de todas las páginas
- `Utils.initTheme()` y `Utils.toggleTheme()` en `utils.js`
- `Utils.confirm()` — modal de confirmación reutilizable que reemplaza
  el `confirm()` nativo del navegador, siguiendo el tema de Hooked
- Editar posts propios desde `perfil.html` — modal con título,
  descripción, categoría e imagen
- Eliminar posts propios desde `perfil.html` con confirmación
- Confirmación visual antes de guardar cambios en edición de post
- Estilos `.confirm-overlay` y `.confirm-card` en `components.css`
- Estilos `.image-upload-perfil` y `.accion-btn--danger` en `perfil.css`

### Changed
- `confirmarEliminarPost()` en `perfil.js` ahora usa `Utils.confirm()`
- `eliminarComentario()` en `post.js` ahora usa `Utils.confirm()`
- Preferencia de tema guardada en `localStorage` como `hooked_theme`

[0.5.0] — 2026-04-25

### Added
- Lightbox al hacer clic en imagen del feed: imagen completa + panel lateral con
  info del post, likes, comentarios y formulario para comentar
- Editar y eliminar comentarios propios desde el lightbox del feed
- Foto de perfil visible en el sidebar del feed para el usuario logueado

### Fixed
- Editar perfil: ruta del PUT corregida de `/api/usuarios/{id}` a `/api/usuarios/perfil`
- Editar perfil: nombres de campos alineados con el backend (`bio`, `ubicacionPreferida`,
  `nivelPescador`) — antes usaba `biografia`, `ubicacion`, `nivel`
- Foto de perfil en modal de edición: ahora solo sube a Cloudinary si el usuario
  seleccionó una imagen nueva, evitando llamadas innecesarias
- Foto de perfil del autor visible en posts del feed y en post.html
- Foto de perfil del autor visible en comentarios de post.html
- Foto de perfil del usuario logueado guardada en localStorage al hacer login
- Avatar del autor en post.html ahora lee `post.autor.fotoPerfil` directamente
  en lugar de la variable separada `autorFoto` que no era reactiva

## [0.4.0] — 2026-04-22

### Added
- Sistema de racha de login gamificado (estilo Duolingo) — muestra días consecutivos activos
- Sección de Badges placeholder en el perfil con 6 espacios bloqueados listos para implementación futura
- Estadística "Racha 🔥" en el card de estadísticas del perfil

### Fixed
- Header de `perfil.html` usaba clases CSS inexistentes (`nav-inner`, `nav-logo`) — reemplazado por las mismas clases que `feed.html` y `post.html`
- Fuente de `perfil.html` era `Space Grotesk` mientras el resto del proyecto usa `Inter` — unificado
- Botón "Editar perfil" usaba clase `btn-outline` inexistente — cambiado a `btn-secondary`

### Removed
- Estadística de "Comentarios" eliminada del card de estadísticas del perfil — métrica reservada para cálculo interno de nivel
- Estadística "Días activo" reemplazada por "Racha 🔥"

## [0.3.1] — 2026-04-21

### Added
- Modal de edición de comentarios con textarea, contador de caracteres
  y atajos de teclado (Ctrl+Enter guarda, Esc cancela)
- Modal de confirmación de eliminación con mensaje de advertencia
  de proceso irreversible, reemplazando el `confirm()` nativo del navegador
- Botones ✏️ y 🗑️ en comentarios propios (nivel 1 y nivel 2), visibles
  al hacer hover sobre la card del comentario

### Fixed
- `esPropio()` siempre devolvía `false` porque el localStorage guardaba
  el usuario sin el campo `id` — corregido en `auth.js:handleAuthSuccess`
  cosiendo el `id` desde el root del `LoginResponse` al objeto usuario

## [0.3.0] — 2026-04-20

### Added
- `post.html` — Página de detalle de post con comentarios anidados en 2 niveles
- `post.js` — Componente Alpine con carga de árbol de comentarios via `Promise.all`
- `post.css` — Estilos del hilo de comentarios con línea vertical conectora
- Formulario de comentario nuevo (nivel 1) con contador de caracteres y atajo Ctrl+Enter
- Formulario de respuesta inline por comentario (nivel 2) con cancelar
- Botón eliminar comentario/respuesta visible solo para el autor
- Skeleton de carga para el post y los comentarios
- Paginación de comentarios con botón "Cargar más"
- Toggle de likes en la página de detalle con Optimistic UI
- Botón compartir con Web Share API y fallback a clipboard

### Fixed
- `likedByCurrentUser` siempre devolvía `null` en `GET /api/posts/{id}` al no pasar identidad del usuario — corregido con timestamp `_t=Date.now()` en frontend
- Caché del navegador en perfiles propio y ajeno mostraba likes y posts desactualizados — resuelto con `_t=Date.now()` en las 4 peticiones de `perfil.js` y headers `no-store, no-cache, must-revalidate` en el backend

## [0.2.0] — 2026-04-16

### Added
- `perfil.html` — Página de perfil completa (propio y ajeno)
- Detección automática de perfil propio vs ajeno por JWT
- Modal de edición de perfil con upload de foto a Cloudinary
- Likes, comentarios y compartir desde la página de perfil
- Tab "Mejores capturas" con grid ordenado por likes
- Récords de captura calculados automáticamente desde posts
- Stats de usuario: posts, likes recibidos, comentarios, días activo

### Fixed
- Avatar cortado por `overflow: hidden` en el hero
- Ubicación no mostraba cuando era `null` en la BD
- Nivel del pescador ahora visible bajo el nombre

---

## [0.1.0] — 2026-02-25

### Added
- Login y registro con auto-login post-registro
- Feed de posts con paginación y filtro por categoría
- Toggle de likes con Optimistic UI
- Crear post con upload de imagen a Cloudinary
- Sidebar de categorías (solo desktop)
- Mobile nav, toasts, skeletons de carga
- Dark mode tema Deep Ocean