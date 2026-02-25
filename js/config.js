// Configuración centralizada de la API
const CONFIG = {
  // Cambiar según entorno
  API_BASE_URL: 'http://localhost:8080/api',
  
  // Endpoints
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTRO: '/auth/registro',
      REFRESH: '/auth/refresh'
    },
    POSTS: '/posts',
    CATEGORIAS: '/categorias',
    COMENTARIOS: '/comentarios',
    USUARIOS: '/usuarios'
  },
  
  // Storage keys
  STORAGE: {
    TOKEN: 'hooked_token',
    USER: 'hooked_user',
    REFRESH_TOKEN: 'hooked_refresh'
  }
};

// No exponer CONFIG globalmente en producción, pero para desarrollo:
window.CONFIG = CONFIG;