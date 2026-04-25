# 🎣 Hooked - Frontend
 
**Hooked Frontend** es la interfaz web de la red social para pescadores. Construida con HTML, CSS vanilla y JavaScript puro usando Alpine.js como framework reactivo ligero. Se comunica con la [API REST de Hooked](../hooked-api) para todas las operaciones de datos.
 
---
 
## 📋 Tabla de Contenidos
 
1. [Tecnología y Stack](#-tecnología-y-stack)
2. [Estructura del Proyecto](#-estructura-del-proyecto)
3. [Arquitectura y Patrones](#-arquitectura-y-patrones)
4. [Páginas](#-páginas)
5. [Sistema de Estilos](#-sistema-de-estilos)
6. [Módulos JavaScript](#-módulos-javascript)
7. [Configuración](#-configuración)
8. [Estado de Features](#-estado-de-features)
 
---
 
## 🛠️ Tecnología y Stack
 
| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Markup** | HTML5 | - |
| **Estilos** | CSS3 Vanilla | - |
| **Interactividad** | Alpine.js | 3.x |
| **Fuentes** | Google Fonts (Inter) | - |
| **Imágenes** | Cloudinary (upload directo) | - |
| **Auth** | JWT (access + refresh tokens) | - |
 
### Sin dependencias de build
 
El frontend no requiere Node.js, Webpack, ni ningún proceso de compilación. Abre `index.html` en un navegador y funciona. Las únicas dependencias externas se cargan vía CDN:
 
- **Alpine.js** — `cdn.jsdelivr.net`
- **Inter font** — `fonts.googleapis.com`
- **Cloudinary API** — `api.cloudinary.com` (solo para subida de imágenes)
 
---
 
## 📁 Estructura del Proyecto
 
```
hooked-frontend/
├── index.html              # Página de login / registro
├── feed.html               # Feed principal de posts
├── crear-post.html         # Formulario para crear publicación
├── perfil.html             # Perfil de usuario (propio y ajeno)
├── post.html               # Detalle de post con comentarios anidados
│
├── css/
│   ├── variables.css       # Tokens de diseño (colores, radios, tipografía)
│   ├── base.css            # Reset y estilos globales
│   ├── components.css      # Botones, inputs, cards, toasts, nav
│   ├── layout.css          # Grid, sidebar, auth layout, mobile nav
│   └── pages/
│       ├── feed.css        # Estilos específicos del feed y posts
│       ├── create-post.css # Estilos del formulario de creación
│       ├── perfil.css      # Estilos de la página de perfil
│       └── post.css        # Estilos del detalle de post y comentarios
│
└── js/
    ├── config.js           # Configuración centralizada (URLs, endpoints, storage keys)
    ├── api.js              # Cliente HTTP con manejo de JWT y refresh automático
    ├── auth.js             # Componente Alpine de autenticación (login/registro)
    ├── utils.js            # Utilidades compartidas (debounce, formateo, sanitización)
    └── pages/
        ├── feed.js         # Lógica del feed
        ├── create-post.js  # Lógica de creación de posts
        ├── perfil.js       # Lógica del perfil de usuario
        └── post.js         # Lógica del detalle de post y comentarios
```
 
---
 
## 🏗️ Arquitectura y Patrones
 
### Capas del frontend
 
| Capa | Archivo | Responsabilidad |
|------|---------|----------------|
| **Config** | `config.js` | URLs, endpoints, keys de localStorage centralizados |
| **API Client** | `api.js` | Fetch con auth headers, retry automático, manejo de 401 |
| **Auth** | `auth.js` | Login, registro, sesión, guards de rutas |
| **Utils** | `utils.js` | Debounce, formateo de números, sanitización, localStorage con TTL |
| **Pages** | `pages/*.js` | Lógica específica de cada página como componentes Alpine |
 
### Patrones implementados
 
| Patrón | Implementación |
|--------|---------------|
| **Módulo de configuración** | `CONFIG` global centraliza todas las URLs y keys |
| **API Client class** | `ApiClient` encapsula todo el fetch con headers, retry y refresh |
| **Componentes Alpine** | Cada página es un `Alpine.data()` autocontenido |
| **Optimistic UI** | Los likes se actualizan visualmente antes de confirmar con el backend |
| **Guard de rutas** | `auth.js` redirige a `index.html` si no hay sesión activa |
| **Toast system** | Eventos globales `window.dispatchEvent('toast')` para notificaciones |
 
### Flujo de autenticación
 
```
Usuario abre página protegida
    ↓
auth.js verifica localStorage (token + user)
    ↓
¿Hay token? → No → Redirige a index.html
    ↓ Sí
api.js valida si el token expiró (decodifica JWT)
    ↓
¿Expiró? → Sí → Llama a /auth/refresh automáticamente
    ↓
¿Refresh exitoso? → No → Logout + redirige a index.html
    ↓ Sí
Guarda nuevo accessToken en localStorage
    ↓
Continúa con la petición original
```
 
---
 
## 📄 Páginas
 
### `index.html` — Login / Registro
 
Punto de entrada de la app. Tiene dos tabs (Iniciar Sesión / Crear Cuenta) manejados con Alpine.js.
 
- Si ya hay sesión activa, redirige automáticamente a `feed.html`
- Al registrarse exitosamente, hace auto-login y redirige al feed
- Muestra errores de validación en línea
 
**Componente Alpine:** `auth` (definido en `auth.js`)
 
---
 
### `feed.html` — Feed Principal
 
Página principal después del login. Muestra los posts de todos los usuarios con opciones de filtrado.
 
**Funcionalidades:**
- Listado paginado de posts (10 por página, botón "Cargar más")
- Filtro por categoría desde el sidebar
- Toggle de likes con Optimistic UI
- Skeletons de carga mientras llegan los posts
- Estado vacío si no hay posts
- Botón de compartir (usa Web Share API o copia al portapapeles)
- Navegación mobile con barra inferior fija
 
**Sidebar (solo desktop ≥ 1024px):**
- Muestra nombre y email del usuario logueado
- Lista de categorías para filtrar el feed
 
**Componente Alpine:** `feedApp` (definido en `pages/feed.js`)
 
---
 
### `crear-post.html` — Crear Publicación
 
Formulario para publicar una nueva captura de pesca.
 
**Funcionalidades:**
- Upload de imagen con preview (máx. 5MB, solo imágenes)
- Sube la imagen directamente a Cloudinary antes de enviar al backend
- Contador de caracteres en tiempo real (título: 100, descripción: 2000)
- Validación de mínimo 10 caracteres en descripción
- Selector de categoría cargado dinámicamente desde la API
- Botón "Publicar" en el header, deshabilitado hasta que todo es válido
 
**Componente Alpine:** `createPost` (definido en `pages/create-post.js`)

---
 
### `perfil.html` — Perfil de Usuario 
 
Vista de perfil propio y ajeno. Detecta automáticamente quién es el usuario logueado mediante el JWT.

- Si no hay `?id=` en la URL → carga tu propio perfil (`/api/usuarios/perfil`)
- Si hay `?id=42` → carga el perfil de ese usuario
- Perfil propio muestra botón "Editar perfil" con modal completo
- Perfil ajeno muestra botón "+ Seguir"
- Lista de posts con likes, comentarios y compartir
- Tab "Mejores capturas" con grid de fotos ordenadas por likes
- Récords de captura calculados desde los posts
- Stats: total posts, likes recibidos, comentarios, días activo

**Componente Alpine:** `perfilApp` (definido en `js/pages/perfil.js`)
---
 
### `post.html` — Detalle de Post

Vista completa de un post individual con su hilo de comentarios anidados.

**Funcionalidades:**
- Post completo con imagen, título, contenido y datos del autor
- Toggle de likes con Optimistic UI
- Comentarios en 2 niveles: principales y respuestas anidadas con línea conectora visual
- Formulario de comentario nuevo con contador de caracteres y atajo Ctrl+Enter
- Formulario de respuesta inline por cada comentario
- Botón eliminar visible solo para comentarios propios
- Botones editar y eliminar visibles solo para comentarios propios (ambos niveles)
- Modal de edición con textarea prellenado, contador de caracteres y atajos de teclado
- Modal de confirmación de eliminación con advertencia de proceso irreversible
- Paginación de comentarios con botón "Cargar más"
- Skeletons de carga para post y comentarios

**Componente Alpine:** `postApp` (definido en `js/pages/post.js`)
---
 
## 🎨 Sistema de Estilos
 
El sistema de diseño usa **CSS Custom Properties** (variables) como tokens, permitiendo theming sin JavaScript.
 
### Tema actual: Deep Ocean (Dark Mode)
 
```css
--bg-primary:    #0a0f1c   /* Fondo más profundo */
--bg-secondary:  #111827   /* Cards y contenedores */
--bg-tertiary:   #1f2937   /* Inputs y elementos interactivos */
--bg-elevated:   #374151   /* Hover states */
 
--accent-ocean:  #0ea5e9   /* Azul principal (botones, links, activos) */
--accent-fishing:#10b981   /* Verde (acciones secundarias, éxito) */
--accent-danger: #ef4444   /* Rojo (errores, eliminar) */
```
 
### Arquitectura CSS
 
| Archivo | Contenido |
|---------|-----------|
| `variables.css` | Tokens: colores, radios, transiciones, breakpoints |
| `base.css` | Reset, tipografía base, scrollbar, animaciones globales |
| `components.css` | `.btn`, `.input-field`, `.card`, `.nav-header`, `.toast` |
| `layout.css` | `.container`, `.layout-sidebar`, `.auth-layout`, `.mobile-nav` |
| `pages/feed.css` | `.post-card`, `.avatar`, `.action-btn`, `.loading-skeleton` |
| `pages/create-post.css` | `.image-upload`, `.form-group`, `.spinner`, `.remove-image-btn` |
 
### Light mode
 
Las variables para light mode están definidas en `variables.css` bajo `[data-theme="light"]`. Actualmente el HTML fuerza `data-theme="dark"`. El toggle está marcado como feature pendiente.
 
### Responsive
 
| Breakpoint | Comportamiento |
|------------|---------------|
| `< 768px` | Mobile nav visible, sidebar oculto |
| `768px - 1024px` | Mobile nav oculto, sidebar aún oculto |
| `≥ 1024px` | Sidebar visible, layout de dos columnas |
 
---
 
## 🧩 Módulos JavaScript
 
### `config.js`
 
Centraliza toda la configuración. **Cambiar aquí para apuntar a producción.**
 
```javascript
const CONFIG = {
  API_BASE_URL: 'http://localhost:8080/api', // ← Cambiar en producción
 
  CLOUDINARY: {
    CLOUD_NAME: 'tu_cloud_name',
    UPLOAD_PRESET: 'hooked_unsigned'
  },
 
  ENDPOINTS: {
    AUTH: { LOGIN, REGISTRO, REFRESH },
    POSTS, CATEGORIAS, COMENTARIOS, USUARIOS
  },
 
  STORAGE: {
    TOKEN: 'hooked_token',
    REFRESH_TOKEN: 'hooked_refresh',
    USER: 'hooked_user'
  }
}
```
 
---
 
### `api.js` — `ApiClient`
 
Cliente HTTP que envuelve `fetch`. Maneja automáticamente:
 
- Agregar `Authorization: Bearer <token>` a cada petición
- Detectar token expirado antes de enviar (decodifica el JWT localmente)
- Llamar a `/auth/refresh` automáticamente si el token expiró
- Reintentar la petición original con el nuevo token
- Redirigir a `index.html` si el refresh también falla
- Endpoints públicos de auth (`/login`, `/registro`, `/refresh`) se saltan la validación
 
**Métodos disponibles:**
 
```javascript
api.get(endpoint)
api.post(endpoint, data)
api.put(endpoint, data)
api.delete(endpoint)
api.postFormData(endpoint, formData)  // Para multipart (no usado actualmente)
```
 
---
 
### `auth.js`
 
Componente Alpine `auth`. Maneja login, registro y sesión activa.
 
**Funciones clave:**
 
| Función | Descripción |
|---------|-------------|
| `checkAuth()` | Verifica sesión al cargar. Redirige si ya está logueado (o si no lo está en página protegida) |
| `login()` | POST a `/auth/login`, guarda token y user en localStorage |
| `register()` | POST a `/auth/registro`, luego auto-login |
| `handleAuthSuccess(response)` | Extrae y guarda accessToken, refreshToken y datos de usuario |
| `logout()` | Limpia localStorage y redirige a `index.html` |
 
---
 
### `utils.js`
 
Utilidades puras sin dependencias.
 
| Función | Descripción |
|---------|-------------|
| `debounce(func, wait)` | Retrasa ejecución para búsquedas/scroll |
| `formatNumber(num)` | `1200` → `"1.2k"`, `1500000` → `"1.5M"` |
| `isValidEmail(email)` | Valida formato de email con regex |
| `sanitizeInput(input)` | Escapa HTML para prevenir XSS básico |
| `setWithExpiry(key, value, ttlMin)` | localStorage con tiempo de expiración |
| `getWithExpiry(key)` | Lee y verifica expiración, borra si venció |
 
---
 
### `pages/feed.js`
 
Componente Alpine `feedApp`. Es el módulo más complejo del frontend.
 
**Estado:**
 
```javascript
{
  user,           // Datos del usuario logueado
  posts,          // Array de posts cargados
  categorias,     // Lista de categorías para el sidebar
  loading,        // Skeleton de carga inicial
  loadingMore,    // Spinner del botón "Cargar más"
  hasMorePosts,   // Controla si mostrar el botón
  currentPage,    // Página actual para paginación
  selectedCategory // Categoría activa para filtrar
}
```
 
**Funciones clave:**
 
| Función | Descripción |
|---------|-------------|
| `loadPosts()` | Carga posts paginados, soporta filtro por categoría |
| `loadMore()` | Incrementa página y agrega posts al array existente |
| `mapearPostDesdeBackend(post)` | Normaliza campos del backend a nombres del frontend |
| `toggleLike(post)` | Optimistic UI: actualiza visualmente, luego confirma con API |
| `filterByCategory(catId)` | Resetea paginación y recarga con nueva categoría |
| `formatDate(dateString)` | Convierte fecha ISO a texto relativo ("Hace 2 h") |
| `sharePost(post)` | Web Share API con fallback a clipboard |
 
---
 
### `pages/create-post.js`
 
Componente Alpine `createPost`.
 
**Flujo de publicación:**
 
```
Usuario selecciona imagen
    ↓
Preview local inmediato (FileReader)
    ↓
Usuario completa título, descripción y categoría
    ↓
Click en "Publicar"
    ↓
¿Hay imagen? → Sí → Sube a Cloudinary → Obtiene URL
    ↓
POST a /api/posts con { titulo, contenido, categoriaId, fotoLink }
    ↓
Redirige a feed.html
```
 
**Validaciones antes de enviar:**
- Título no vacío
- Descripción mínimo 10 caracteres
- Categoría seleccionada
- Imagen menor a 5MB y de tipo `image/*`
 
---
 
## ⚙️ Configuración
 
### Cambiar entorno (desarrollo → producción)
 
Solo hay que modificar `js/config.js`:
 
```javascript
// Desarrollo
API_BASE_URL: 'http://localhost:8080/api'
 
// Producción
API_BASE_URL: 'https://tu-api.com/api'
```
 
### Configurar Cloudinary
 
En `js/config.js`:
 
```javascript
CLOUDINARY: {
  CLOUD_NAME: 'tu_cloud_name',       // Dashboard de Cloudinary
  UPLOAD_PRESET: 'hooked_unsigned'   // Preset sin firma (unsigned)
}
```
 
> El preset debe estar configurado como **unsigned** en Cloudinary para permitir uploads desde el frontend sin exponer el API Secret.
 
### Correr en local
 
No se necesita servidor. Basta con abrir `index.html` directamente en el navegador, o usar un servidor estático simple:
 
```bash
# Con Python
python -m http.server 3000
 
# Con Node.js
npx serve .
 
# Con VS Code
# Instalar extensión "Live Server" y click en "Go Live"
```
 
> **Importante:** La API backend debe estar corriendo en `http://localhost:8080` (o actualizar `API_BASE_URL` en `config.js`).
 
---
 
## ✅ Estado de Features
 
### Completadas ✅
 
| Feature | Estado | Notas |
|---------|--------|-------|
| Login / Registro | ✅ Completo | Con auto-login post-registro |
| Guard de rutas | ✅ Completo | Redirige si no hay sesión |
| Refresh token automático | ✅ Completo | Transparente para el usuario |
| Feed de posts | ✅ Completo | Con paginación y filtro por categoría |
| Toggle de likes | ✅ Completo | Optimistic UI + sincronización con backend |
| Crear post | ✅ Completo | Con upload de imagen a Cloudinary |
| Sidebar de categorías | ✅ Completo | Solo visible en desktop |
| Mobile nav | ✅ Completo | Barra inferior en móvil |
| Sistema de toasts | ✅ Completo | Éxito, error e info |
| Skeletons de carga | ✅ Completo | En el feed mientras cargan posts |
| Compartir post | ✅ Completo | Web Share API + fallback a clipboard |
| Dark mode | ✅ Completo | Tema Deep Ocean por defecto |
| perfil.html | ✅ Completo | Perfil propio/ajeno, edición, likes, stats |
| post.html | ✅ Completo | Detalle de post, comentarios anidados 2 niveles, likes |
| Editar / eliminar comentario propio | ✅ Completo | Modal de edición y confirmación de eliminación, niveles 1 y 2 |
| Sistema de racha 🔥 | ✅ Completo | Muestra días consecutivos de login en perfil |
| Badges placeholder | ✅ Completo | 6 espacios visuales listos para implementación |
| Header unificado | ✅ Completo | Todos los headers usan las mismas clases CSS |
| Foto de perfil en posts y comentarios | ✅ Completo | Autor visible en feed, post.html y lightbox |
| Lightbox de imágenes | ✅ Completo | Desde el feed: imagen completa + panel con likes, comentarios y compartir |
| Editar/Eliminar comentarios desde lightbox | ✅ Completo | Solo comentarios propios |
| Editar perfil funcional | ✅ Completo | PUT corregido, campos alineados con backend, foto via Cloudinary |
 
### Pendientes 🚧
 
| Feature | Prioridad | Notas |
|---------|-----------|-------|
| Light mode toggle | 🟡 Media | Variables CSS ya definidas, falta el botón |
| Búsqueda de posts | 🟢 Baja | Barra de búsqueda en el feed |
| Notificaciones | 🟢 Baja | Requiere WebSocket en el backend |
 
---
 
## 🔗 Relación con el Backend
 
El frontend consume exclusivamente la [API REST de Hooked](../hooked-api). No tiene base de datos propia ni lógica de negocio — todo se delega al backend.
 
| Frontend llama a | Backend responde con |
|------------------|----------------------|
| `GET /posts?page=0&size=10` | `PaginatedResponse<PostResponse>` |
| `GET /categorias` | `List<CategoriaResponse>` |
| `GET /posts/{id}` | `PostResponse` con `likedByCurrentUser` correcto |
| `GET /comentarios/post/{id}/principales` | `PaginatedResponse<ComentarioResponse>` |
| `GET /comentarios/{id}/respuestas` | `PaginatedResponse<ComentarioResponse>` |
| `POST /posts/{id}/like` | `{ likedByCurrentUser, likeCount }` |
| `POST /comentarios` | `ComentarioResponse` del comentario creado |
| `POST /posts` | `PostResponse` del post creado |
| `POST /auth/login` | `accessToken`, `refreshToken`, datos de usuario |
| `DELETE /comentarios/{id}` | 204 No Content |