# Changelog — Hooked Frontend

Todos los cambios notables de este proyecto se documentan aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

---

## [Unreleased]

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