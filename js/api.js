// js/api.js - COMPLETO CON FIXES
class ApiClient {
  constructor() {
    this.baseURL = CONFIG.API_BASE_URL;
    console.log('[API] Cliente inicializado, baseURL:', this.baseURL);
  }

  getToken() {
    return localStorage.getItem(CONFIG.STORAGE.TOKEN);
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
    
    try {
      const data = await response.json();
      console.log('[API] Datos recibidos:', data);
      return data;
    } catch (e) {
      console.log('[API] Respuesta sin body JSON');
      return null;
    }
  }

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
        localStorage.setItem(CONFIG.STORAGE.TOKEN, data.token);
        if (data.refreshToken) {
          localStorage.setItem(CONFIG.STORAGE.REFRESH_TOKEN, data.refreshToken);
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

  async get(endpoint) {
    console.log('[API] GET', endpoint);
    const options = {
      method: 'GET',
      headers: this.getHeaders()
    };
    const response = await fetch(`${this.baseURL}${endpoint}`, options);
    return this.handleResponse(response, options);
  }

  async post(endpoint, data) {
    console.log('[API] POST', endpoint, data);
    const options = {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    };
    const response = await fetch(`${this.baseURL}${endpoint}`, options);
    return this.handleResponse(response, options);
  }

  async postFormData(endpoint, formData) {
    console.log('[API] POST FormData', endpoint);
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

  async put(endpoint, data) {
    console.log('[API] PUT', endpoint);
    const options = {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    };
    const response = await fetch(`${this.baseURL}${endpoint}`, options);
    return this.handleResponse(response, options);
  }

  async delete(endpoint) {
    console.log('[API] DELETE', endpoint);
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