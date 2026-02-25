// js/api.js - CORREGIDO CON DEBUG
class ApiClient {
  constructor() {
    this.baseURL = CONFIG.API_BASE_URL;
    console.log('[API] Cliente inicializado, baseURL:', this.baseURL);
  }

  getToken() {
    return localStorage.getItem(CONFIG.STORAGE.TOKEN);
  }

  getHeaders(contentType = 'application/json') {
    const headers = {
      'Content-Type': contentType
    };
    
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('[API] Token añadido a headers');
    } else {
      console.warn('[API] No hay token disponible');
    }
    
    return headers;
  }

  async handleResponse(response) {
    console.log('[API] Respuesta HTTP:', response.status, response.statusText);
    
    // Si es 401, intentar refresh o redirigir
    if (response.status === 401) {
      console.warn('[API] Recibido 401, intentando refresh token');
      const refreshed = await this.tryRefreshToken();
      if (!refreshed) {
        console.error('[API] No se pudo refrescar token, haciendo logout');
        this.logout();
        throw new Error('401 - Sesión expirada');
      }
      // Retry la request original
      console.log('[API] Token refrescado, reintentando request');
      return this.retryRequest(response.url, response.requestOptions);
    }

    if (!response.ok) {
      let errorMessage = `Error HTTP: ${response.status}`;
      try {
        const error = await response.json();
        errorMessage = error.message || error.error || errorMessage;
      } catch (e) {
        // No hay body JSON
      }
      console.error('[API] Error en respuesta:', errorMessage);
      throw new Error(errorMessage);
    }

    if (response.status === 204) return null;
    
    const data = await response.json();
    console.log('[API] Datos recibidos:', data);
    return data;
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
    return fetch(url, {
      ...options,
      headers: this.getHeaders()
    }).then(r => this.handleResponse(r));
  }

  logout() {
    console.log('[API] Limpiando sesión');
    localStorage.removeItem(CONFIG.STORAGE.TOKEN);
    localStorage.removeItem(CONFIG.STORAGE.REFRESH_TOKEN);
    localStorage.removeItem(CONFIG.STORAGE.USER);
  }

  async get(endpoint) {
    console.log('[API] GET', endpoint);
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async post(endpoint, data) {
    console.log('[API] POST', endpoint, data);
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse(response);
  }

  async postFormData(endpoint, formData) {
    console.log('[API] POST FormData', endpoint);
    const headers = {};
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData
    });
    return this.handleResponse(response);
  }

  async put(endpoint, data) {
    console.log('[API] PUT', endpoint);
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse(response);
  }

  async delete(endpoint) {
    console.log('[API] DELETE', endpoint);
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }
}

const api = new ApiClient();
window.api = api;