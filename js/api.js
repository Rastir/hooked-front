// js/api.js - COMPLETO CON VALIDACIÓN DE TOKEN EXPIRADO
class ApiClient {
  constructor() {
    this.baseURL = CONFIG.API_BASE_URL;
    console.log('[API] Cliente inicializado, baseURL:', this.baseURL);
  }

  getToken() {
    return localStorage.getItem(CONFIG.STORAGE.TOKEN);
  }

  // NUEVO: Decodificar JWT y obtener payload
  decodeToken(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('[API] Error decodificando token:', e);
      return null;
    }
  }

  // NUEVO: Verificar si el token expiró
  isTokenExpired(token) {
    if (!token) return true;

    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) return true;

    // exp está en segundos, Date.now() en milisegundos
    const expirationDate = payload.exp * 1000;
    const isExpired = Date.now() >= expirationDate;

    console.log('[API] Token expira en:', new Date(expirationDate).toLocaleString());
    console.log('[API] Token expirado:', isExpired);

    return isExpired;
  }

  // NUEVO: Validar token antes de usarlo
  async validateToken() {
    const token = this.getToken();

    if (!token) {
      console.warn('[API] No hay token');
      return false;
    }

    if (this.isTokenExpired(token)) {
      console.warn('[API] Token expirado, intentando refresh...');
      const refreshed = await this.tryRefreshToken();

      if (!refreshed) {
        console.error('[API] No se pudo refrescar token expirado');
        this.logout();
        window.location.href = 'index.html';
        return false;
      }
      return true;
    }

    return true;
  }

  // NUEVO: Verificar si el endpoint es de autenticación (no requiere token)
  isAuthEndpoint(endpoint) {
    const authEndpoints = [
      CONFIG.ENDPOINTS.AUTH.LOGIN,
      CONFIG.ENDPOINTS.AUTH.REGISTRO,
      CONFIG.ENDPOINTS.AUTH.REFRESH
    ];
    return authEndpoints.some(authEndpoint => endpoint.includes(authEndpoint));
  }

  getHeaders(contentType = 'application/json') {
    const headers = {};

    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('[API] Token añadido a headers');
    } else {
      console.warn('[API] No hay token disponible');
    }

    return headers;
  }

  async handleResponse(response, originalOptions = null) {
    console.log('[API] Respuesta HTTP:', response.status, response.statusText);

    if (response.status === 401) {
      console.warn('[API] Recibido 401, intentando refresh token');
      const refreshed = await this.tryRefreshToken();
      if (!refreshed) {
        console.error('[API] No se pudo refrescar token, haciendo logout');
        this.logout();
        window.location.href = 'index.html';
        throw new Error('401 - Sesión expirada');
      }

      if (originalOptions) {
        console.log('[API] Token refrescado, reintentando request');
        return this.retryRequest(response.url, originalOptions);
      }
      throw new Error('401 - No se puede reintentar');
    }

    if (!response.ok) {
      let errorMessage = `Error HTTP: ${response.status}`;
      try {
        const error = await response.json();
        errorMessage = error.message || error.error || errorMessage;
      } catch (e) {
        errorMessage = response.statusText || errorMessage;
      }
      console.error('[API] Error en respuesta:', errorMessage);
      throw new Error(errorMessage);
    }

    if (response.status === 204) return null;

    // ✅ CORREGIDO: Manejar mejor el body de la respuesta
    const contentType = response.headers.get('content-type');

    // Si no hay content-type JSON, retornar null explícitamente
    if (!contentType || !contentType.includes('application/json')) {
      console.log('[API] Respuesta no es JSON, retornando null');
      return null;
    }

    // ✅ CORREGIDO: Clonar response para poder leer el body y debuggear si es necesario
    const responseClone = response.clone();

    try {
      const data = await response.json();
      console.log('[API] Datos recibidos:', data);
      return data;
    } catch (e) {
      // Si falla el parseo, intentar leer el texto para debug
      console.error('[API] Error parseando JSON:', e);
      try {
        const rawText = await responseClone.text();
        console.log('[API] Raw response body:', rawText);
      } catch (textError) {
        console.log('[API] No se pudo leer el body como texto');
      }
      return null;
    }
  }

  // CORREGIDO: Usar el nombre correcto del campo según tu backend
  async tryRefreshToken() {
    const refreshToken = localStorage.getItem(CONFIG.STORAGE.REFRESH_TOKEN);
    if (!refreshToken) {
      console.warn('[API] No hay refresh token');
      return false;
    }

    try {
      const response = await fetch(`${this.baseURL}${CONFIG.ENDPOINTS.AUTH.REFRESH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        // CORREGIDO: Tu backend devuelve 'accessToken', no 'token'
        const newToken = data.accessToken || data.token;
        const newRefreshToken = data.refreshToken;

        if (!newToken) {
          console.error('[API] No se recibió nuevo access token');
          return false;
        }

        localStorage.setItem(CONFIG.STORAGE.TOKEN, newToken);
        if (newRefreshToken) {
          localStorage.setItem(CONFIG.STORAGE.REFRESH_TOKEN, newRefreshToken);
        }
        console.log('[API] Token refrescado exitosamente');
        return true;
      }
      return false;
    } catch (e) {
      console.error('[API] Error refrescando token:', e);
      return false;
    }
  }

  async retryRequest(url, options) {
    const newOptions = {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.getToken()}`
      }
    };

    const response = await fetch(url, newOptions);
    if (response.status === 401) {
      throw new Error('401 - Token refrescado pero sigue siendo inválido');
    }
    return this.handleResponse(response, null);
  }

  logout() {
    console.log('[API] Limpiando sesión');
    localStorage.removeItem(CONFIG.STORAGE.TOKEN);
    localStorage.removeItem(CONFIG.STORAGE.REFRESH_TOKEN);
    localStorage.removeItem(CONFIG.STORAGE.USER);
  }

  // MODIFICADO: Validar token antes de cada petición (excepto auth endpoints)
  async get(endpoint) {
    console.log('[API] GET', endpoint);

    // NUEVO: No validar para endpoints de autenticación
    if (!this.isAuthEndpoint(endpoint)) {
      const isValid = await this.validateToken();
      if (!isValid) {
        throw new Error('Token inválido o expirado');
      }
    }

    const options = {
      method: 'GET',
      headers: this.getHeaders()
    };
    const response = await fetch(`${this.baseURL}${endpoint}`, options);
    return this.handleResponse(response, options);
  }

  // MODIFICADO: Cambio de flujo de respuesta
  async post(endpoint, data = null) {
    console.log('[API] POST', endpoint, data);

    if (!this.isAuthEndpoint(endpoint)) {
      const isValid = await this.validateToken();
      if (!isValid) {
        throw new Error('Token inválido o expirado');
      }
    }

    const options = {
      method: 'POST',
      headers: this.getHeaders(),
      ...(data !== null && data !== undefined && { body: JSON.stringify(data) })
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, options);
    return this.handleResponse(response, options);
  }

  // MODIFICADO: Validar token antes de cada petición (excepto auth endpoints)
  async postFormData(endpoint, formData) {
    console.log('[API] POST FormData', endpoint);

    // NUEVO: No validar para endpoints de autenticación
    if (!this.isAuthEndpoint(endpoint)) {
      const isValid = await this.validateToken();
      if (!isValid) {
        throw new Error('Token inválido o expirado');
      }
    }

    const token = this.getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = {
      method: 'POST',
      headers,
      body: formData
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, options);
    return this.handleResponse(response, options);
  }

  // MODIFICADO: Validar token antes de cada petición (excepto auth endpoints)
  async put(endpoint, data) {
    console.log('[API] PUT', endpoint);

    // NUEVO: No validar para endpoints de autenticación
    if (!this.isAuthEndpoint(endpoint)) {
      const isValid = await this.validateToken();
      if (!isValid) {
        throw new Error('Token inválido o expirado');
      }
    }

    const options = {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    };
    const response = await fetch(`${this.baseURL}${endpoint}`, options);
    return this.handleResponse(response, options);
  }

  // MODIFICADO: Validar token antes de cada petición (excepto auth endpoints)
  async delete(endpoint) {
    console.log('[API] DELETE', endpoint);

    // NUEVO: No validar para endpoints de autenticación
    if (!this.isAuthEndpoint(endpoint)) {
      const isValid = await this.validateToken();
      if (!isValid) {
        throw new Error('Token inválido o expirado');
      }
    }

    const options = {
      method: 'DELETE',
      headers: this.getHeaders()
    };
    const response = await fetch(`${this.baseURL}${endpoint}`, options);
    return this.handleResponse(response, options);
  }
}

const api = new ApiClient();
window.api = api;
