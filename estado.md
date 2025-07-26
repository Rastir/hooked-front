🎣 HOOKED - Frontend Documentation
Documentación Completa del Frontend - Vanilla JavaScript

📋 Índice
Información General
Arquitectura del Frontend
Estructura de Archivos
Funcionalidades Implementadas
Sistema de Vistas
Sistema de Autenticación
Sistema de Posts
Sistema de Likes
API Integration
Mejores Prácticas Aplicadas
Próximos Pasos
🎯 Información General
Hooked Frontend es una aplicación web Vanilla JavaScript que consume la API REST del backend Spring Boot. Implementa un foro completo de pesca con autenticación JWT, sistema de posts, likes y categorías.

Características Principales:
🔐 Autenticación JWT completa (Login/Registro)
📝 CRUD de Posts con validaciones
👍 Sistema de Likes bidireccional y optimizado
📂 Categorías dinámicas cargadas del backend
📱 Arquitectura SPA (Single Page Application)
🎨 UI/UX optimizada para foro de pesca
🏗️ Arquitectura del Frontend
Patrón Arquitectural: Component-Based SPA

┌─────────────────────────────────────┐
│           FRONTEND SPA              │
├─────────────────────────────────────┤
│ VIEW LAYER (HTML Templates)         │
│ ├── Posts View                      │
│ ├── Auth View (Login/Register)      │
│ ├── Create Post View               │
├─────────────────────────────────────┤
│ LOGIC LAYER (JavaScript)            │
│ ├── app.js (Main Logic)            │
│ ├── auth.js (Authentication)       │
│ ├── api.js (Backend Integration)   │
├─────────────────────────────────────┤
│ STYLE LAYER (CSS)                   │
│ └── styles.css                     │
└─────────────────────────────────────┘
              ↕ HTTP/REST
┌─────────────────────────────────────┐
│        BACKEND API                  │
│     (Spring Boot + JWT)             │
└─────────────────────────────────────┘

📁 Estructura de Archivos

HOOKED-FRONT/
├── index.html          # 🏠 Estructura principal y vistas
├── css/
│   └── styles.css      # 🎨 Estilos (pendiente de actualizar)
└── js/
    ├── api.js          # 🔌 Integración con Backend API
    ├── auth.js         # 🔐 Lógica de Autenticación
    └── app.js          # 🧠 Lógica principal de la SPA


✅ Funcionalidades Implementadas
🔐 Sistema de Autenticación
✅ Login con email y contraseña
✅ Registro con nombre, email y contraseña
✅ JWT Token Management en localStorage
✅ Auto-login post-registro
✅ Navegación dinámica (botones auth-only)
✅ Toggle Login/Registro en mismo formulario
✅ Validaciones frontend y manejo de errores
📝 Sistema de Posts
✅ Listar todos los posts con autor y categoría
✅ Crear nuevos posts con validaciones
✅ Categorías dinámicas desde backend
✅ Subida de fotos via URL
✅ Validaciones robustas (título 5-200 chars, contenido 10+ chars)
✅ UX optimizada con loading states y mensajes
✅ Template system eficiente para renderizado
👍 Sistema de Likes
✅ Like/Unlike bidireccional optimizado
✅ Lógica inteligente - intenta like, si falla intenta unlike
✅ UI Optimistic - actualiza inmediatamente
✅ Rollback automático en caso de error
✅ Multi-usuario tested - funciona con diferentes users
✅ Estado local tracking con Set()
🎨 Interfaz de Usuario
✅ SPA con navegación fluida entre vistas
✅ Responsive design ready (viewport meta tag)
✅ Estados de carga y feedback visual
✅ Manejo de errores user-friendly
✅ Navbar dinámica según estado de auth

🖥️ Sistema de Vistas
Arquitectura de Vistas:

javascript
const views = {
  posts: 'posts-view',        // Lista principal de posts
  auth: 'auth-view',          // Login/Registro  
  createPost: 'create-post-view' // Crear nuevo post
};

function showView(viewName) {
  // Hide all views, show selected
}

1. Posts View (#posts-view)
Container: #posts-container
Template: #post-template (cloneable)
Features: Lista de posts, likes, autores, categorías
2. Auth View (#auth-view)
Dual-mode: Login ↔ Registro con toggle
Form: #auth-form con validaciones
Dynamic: Campos aparecen/desaparecen según modo
3. Create Post View (#create-post-view)
Form: #create-post-form completo
Fields: Título, Categoría, Contenido, Foto
Validation: Frontend + Backend

🔐 Sistema de Autenticación
Flujo de Autenticación:
javascript
// 1. Login/Register
login(email, password) → API → JWT Token → localStorage

// 2. Token Management  
apiFetch() → Auto-include "Bearer <token>" header

// 3. Navigation Update
renderNavbar() → Show/Hide auth-only buttons

// 4. Logout
logout() → Clear localStorage → Reset UI

JWT Integration:
javascript
// Auto-inject token in all API calls
function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem("jwt");
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // ...
}
📝 Sistema de Posts
Post Creation Flow:
javascript
showCreatePostForm() 
  → Load categories from API
  → Show form with validation
  → handleCreatePost()
  → createPost() API call
  → Success → redirect to posts
Post Rendering:
javascript
renderPosts(posts) 
  → Clone #post-template for each post
  → Fill data (title, content, author, category)
  → Setup like button with event listener
  → Append to #posts-container
👍 Sistema de Likes
Lógica Inteligente de Likes:
javascript
handleLike() {
  // 1. Always try POST (like) first
  likePost(postId)
    .then(() => updateUI(liked=true, count+1))
    .catch(() => {
      // 2. If fails, try DELETE (unlike)  
      unlikePost(postId)
        .then(() => updateUI(liked=false, count-1))
        .catch(() => rollback())
    });
}
Estado Local:
javascript
let userLikes = new Set(); // Track user likes locally
// Syncs with backend automatically via intelligent logic
🔌 API Integration
Configuración Base:
javascript
const API_BASE = "http://localhost:8080/api";

// Central API function with JWT auto-injection
function apiFetch(endpoint, options = {}) {
  // Auto-adds Authorization header
  // Handles errors consistently  
  // Returns parsed JSON
}
Endpoints Implementados:
Autenticación
javascript
loginApi(email, password)     // POST /auth/login
registerApi(nombre, email, password) // POST /auth/registro
Posts
javascript
getPosts()                    // GET /posts
createPost(titulo, contenido, categoriaId, fotoLink) // POST /posts
likePost(postId)             // POST /posts/{id}/like  
unlikePost(postId)           // DELETE /posts/{id}/like
Categorías
javascript
getCategories()              // GET /categorias
// + 8 more category functions available
🏆 Mejores Prácticas Aplicadas
✅ Separación de Responsabilidades
HTML: Solo estructura y contenido
CSS: Solo estilos (pendiente actualización)
JS: Solo lógica y comportamiento
✅ Arquitectura Escalable
Component-based views fácil de extender
Central API management (apiFetch)
State management organizado
✅ UX/UI Optimizada
Loading states en operaciones async
Error handling user-friendly
Optimistic UI para likes
Form validation en frontend y backend
✅ Performance
Template cloning eficiente
Local state tracking (userLikes)
Minimal DOM manipulation
✅ Security
JWT auto-injection en todas las requests
Frontend validation + backend validation
CORS ready para diferentes dominios
🚀 Próximos Pasos Recomendados
🥇 Prioridad Alta
Actualizar styles.css para la nueva estructura HTML
"Mis Posts" - Ver solo posts del usuario actual
Editar/Eliminar Posts - Para autores de posts
Filtro por Categorías - Dropdown para filtrar posts
🥈 Prioridad Media
Paginación - Para manejar muchos posts
Search/Búsqueda - Buscar posts por texto
Profile Page - Ver perfil de usuario con sus posts
Toast Notifications - Mejor feedback visual
🥉 Prioridad Baja
Dark Mode - Toggle de tema
PWA Features - Service Worker, offline
Image Upload - Reemplazar URL por upload real
Admin Panel - Para moderadores
📊 Estado Actual del Proyecto
✅ Completado (100%)
Sistema de autenticación JWT
CRUD de posts (Create + Read)
Sistema de likes bidireccional
Navegación SPA fluida
Integración completa con Backend API
🔄 En Proceso (0%)
Actualización de CSS para nueva estructura
Funcionalidades adicionales de posts
📋 Pendiente
Update/Delete de posts
Filtros y búsqueda
Mejoras de UI/UX

