# Changelog — Hooked Frontend

Todos los cambios notables de este proyecto se documentan aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

---

## [Unreleased]

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