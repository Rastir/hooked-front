document.addEventListener('alpine:init', () => {
  
  Alpine.data('auth', () => ({
    user: null,
    token: null,
    isLoading: false,
    error: null,
    
    loginForm: {
      email: '',
      password: ''
    },
    registerForm: {
      nombre: '',
      email: '',
      password: '',
      confirmPassword: ''
    },

    init() {
      console.log('[AUTH] Inicializando auth component');
      this.checkAuth();
    },

    checkAuth() {
      const token = localStorage.getItem(CONFIG.STORAGE.TOKEN);
      const user = localStorage.getItem(CONFIG.STORAGE.USER);
      
      console.log('[AUTH] CheckAuth - Token:', token ? 'Existe' : 'No existe');
      console.log('[AUTH] CheckAuth - User raw:', user);
      
      if (token && user) {
        try {
          this.token = token;
          this.user = JSON.parse(user);
          console.log('[AUTH] Usuario cargado:', this.user);
          
          const currentPage = window.location.pathname.split('/').pop();
          console.log('[AUTH] Página actual:', currentPage);
          
          if (currentPage === 'index.html' || currentPage === '') {
            console.log('[AUTH] Redirigiendo a feed.html');
            window.location.href = 'feed.html';
          }
        } catch (e) {
          console.error('[AUTH] Error parseando usuario:', e);
          this.logout();
        }
      } else {
        const protectedPages = ['feed.html', 'perfil.html', 'crear-post.html'];
        const currentPage = window.location.pathname.split('/').pop();
        
        if (protectedPages.includes(currentPage)) {
          console.log('[AUTH] No hay sesión, redirigiendo a login');
          window.location.href = 'index.html';
        }
      }
    },

    async login() {
      console.log('[AUTH] Intentando login con:', this.loginForm.email);
      this.isLoading = true;
      this.error = null;

      try {
        const response = await api.post(CONFIG.ENDPOINTS.AUTH.LOGIN, {
          email: this.loginForm.email,
          contrasena: this.loginForm.password
        });

        console.log('[AUTH] Respuesta login COMPLETA:', JSON.stringify(response, null, 2));
        this.handleAuthSuccess(response);
        
        console.log('[AUTH] Login exitoso, redirigiendo...');
        window.location.href = 'feed.html';
      } catch (err) {
        console.error('[AUTH] Error login:', err);
        this.error = err.message || 'Error al iniciar sesión';
        this.showToast(this.error, 'error');
      } finally {
        this.isLoading = false;
      }
    },

    async register() {
      console.log('[AUTH] Intentando registro:', this.registerForm.email);
      this.isLoading = true;
      this.error = null;

      if (this.registerForm.password !== this.registerForm.confirmPassword) {
        this.error = 'Las contraseñas no coinciden';
        this.isLoading = false;
        return;
      }

      if (this.registerForm.password.length < 6) {
        this.error = 'La contraseña debe tener al menos 6 caracteres';
        this.isLoading = false;
        return;
      }

      try {
        const response = await api.post(CONFIG.ENDPOINTS.AUTH.REGISTRO, {
          nombre: this.registerForm.nombre,
          email: this.registerForm.email,
          contrasena: this.registerForm.password
        });

        console.log('[AUTH] Registro exitoso:', response);
        this.showToast('Registro exitoso. Iniciando sesión...', 'success');
        
        // Auto-login
        await this.autoLoginAfterRegister();
      } catch (err) {
        console.error('[AUTH] Error registro:', err);
        this.error = err.message || 'Error al registrar usuario';
        this.showToast(this.error, 'error');
      } finally {
        this.isLoading = false;
      }
    },

    async autoLoginAfterRegister() {
      console.log('[AUTH] Auto-login después de registro');
      try {
        const response = await api.post(CONFIG.ENDPOINTS.AUTH.LOGIN, {
          email: this.registerForm.email,
          contrasena: this.registerForm.password
        });
        
        console.log('[AUTH] Auto-login respuesta:', response);
        this.handleAuthSuccess(response);
        window.location.href = 'feed.html';
      } catch (err) {
        console.error('[AUTH] Error auto-login:', err);
        this.showToast('Por favor inicia sesión manualmente', 'info');
      }
    },

    handleAuthSuccess(response) {
      console.log('[AUTH] Procesando respuesta auth:', response);
      console.log('[AUTH] Keys en respuesta:', Object.keys(response));
      
      // Intentar diferentes estructuras de respuesta
      const token = response.token || response.accessToken;
      let userData = response.usuario || response.user || response.usuarioDto;
      
      // Si no hay userData pero hay token, crear objeto mínimo
      if (!userData && token) {
        console.warn('[AUTH] No hay usuario en respuesta, creando objeto mínimo');
        userData = { 
          email: this.loginForm.email,
          nombre: this.loginForm.email.split('@')[0] // Temporal
        };
      }
      
      if (!token) {
        console.error('[AUTH] No se encontró token en respuesta');
        throw new Error('Respuesta inválida: falta token');
      }
      
      // Guardar token
      localStorage.setItem(CONFIG.STORAGE.TOKEN, token);
      this.token = token;
      console.log('[AUTH] Token guardado');
      
      // Guardar usuario
      if (userData) {
        localStorage.setItem(CONFIG.STORAGE.USER, JSON.stringify(userData));
        this.user = userData;
        console.log('[AUTH] Usuario guardado:', userData);
      }
      
      // Verificar
      console.log('[AUTH] Verificación - Token:', !!localStorage.getItem(CONFIG.STORAGE.TOKEN));
      console.log('[AUTH] Verificación - User:', !!localStorage.getItem(CONFIG.STORAGE.USER));
    },

    logout() {
      console.log('[AUTH] Cerrando sesión');
      api.logout();
      this.user = null;
      this.token = null;
      this.showToast('Sesión cerrada', 'info');
      window.location.href = 'index.html';
    },

    showToast(message, type = 'info') {
      window.dispatchEvent(new CustomEvent('toast', { 
        detail: { message, type } 
      }));
    }
  }));

});