document.addEventListener('alpine:init', () => {

  Alpine.data('feedApp', () => ({
    user: null,
    posts: [],
    categorias: [],
    loading: true,
    loadingMore: false,
    hasMorePosts: true,
    currentPage: 0,
    selectedCategory: null,
    isInitialized: false,

    async init() {
      console.log('[FEED] Inicializando feed app');

      const token = localStorage.getItem(CONFIG.STORAGE.TOKEN);
      const userData = localStorage.getItem(CONFIG.STORAGE.USER);

      console.log('[FEED] Token:', token ? 'Sí' : 'No');
      console.log('[FEED] User raw:', userData);

      if (!token) {
        console.error('[FEED] No hay token, redirigiendo');
        window.location.href = 'index.html';
        return;
      }

      if (userData && userData !== 'undefined' && userData !== 'null') {
        try {
          this.user = JSON.parse(userData);
          console.log('[FEED] Usuario cargado:', this.user);
        } catch (e) {
          console.error('[FEED] Error parseando user:', e);
          this.user = null;
        }
      } else {
        console.warn('[FEED] No hay datos de usuario en localStorage');
        this.user = this.decodeTokenUser(token);
      }

      await this.loadCategorias();
      await this.loadPosts();

      this.isInitialized = true;
      console.log('[FEED] Init completado. Posts:', this.posts.length, 'User:', this.user);
    },

    decodeTokenUser(token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
          id: payload.sub || payload.id,
          email: payload.email,
          nombre: payload.nombre || payload.sub || 'Usuario'
        };
      } catch (e) {
        console.error('[FEED] Error decodificando token:', e);
        return null;
      }
    },

    async loadPosts() {
      console.log('[FEED] Cargando posts...');
      this.loading = true;

      try {
        let endpoint = `${CONFIG.ENDPOINTS.POSTS}?page=${this.currentPage}&size=10`;
        if (this.selectedCategory && this.selectedCategory !== 'todo') {
          endpoint += `&categoria=${this.selectedCategory}`;
        }

        const response = await api.get(endpoint);
        console.log('[FEED] Respuesta raw:', response);

        let newPosts = [];
        let totalPages = null;

        if (Array.isArray(response)) {
          newPosts = response;
        } else if (response && response.content) {
          newPosts = response.content;
          totalPages = response.totalPages;
        } else if (response && typeof response === 'object') {
          newPosts = Object.values(response).find(v => Array.isArray(v)) || [];
        }

        if (!Array.isArray(newPosts)) {
          console.error('[FEED] newPosts no es array:', newPosts);
          newPosts = [];
        }

        newPosts = newPosts.map(post => this.mapearPostDesdeBackend(post));

        if (this.currentPage === 0) {
          this.posts = newPosts;
        } else {
          this.posts = [...this.posts, ...newPosts];
        }

        console.log('[FEED] Posts totales:', this.posts.length);

        if (totalPages !== null) {
          this.hasMorePosts = this.currentPage < totalPages - 1;
        } else {
          this.hasMorePosts = newPosts.length === 10;
        }

      } catch (err) {
        console.error('[FEED] Error cargando posts:', err);
        this.posts = [];
        this.showToast('Error al cargar publicaciones', 'error');
      } finally {
        this.loading = false;
      }
    },

    // CORREGIDO: Mapear likedByCurrentUser del backend a liked del frontend
    mapearPostDesdeBackend(post) {
      return {
        id: post.id,
        titulo: post.titulo,
        contenido: post.contenido,
        foto_link: post.fotoLink || post.foto_link || null,
        fecha_creacion: post.fechaCreacion || post.fecha_creacion || null,
        like_count: post.likeCount || post.like_count || 0,
        // ← CORREGIDO: Mapear likedByCurrentUser del backend
        liked: post.likedByCurrentUser !== undefined ? post.likedByCurrentUser : (post.liked || false),
        usuario: post.autor ? {
          id: post.autor.id,
          nombre: post.autor.nombre,
          email: post.autor.email,
          foto_perfil: post.autor.fotoPerfil || null
        } : post.usuario || null,
        categoria: post.categoria || null,
        comentarios_count: post.comentariosCount || 0
      };
    },

    async loadMore() {
      if (this.loadingMore || !this.hasMorePosts) return;

      this.loadingMore = true;
      this.currentPage++;

      try {
        await this.loadPosts();
      } finally {
        this.loadingMore = false;
      }
    },

    async loadCategorias() {
      try {
        this.categorias = await api.get(CONFIG.ENDPOINTS.CATEGORIAS) || [];
        console.log('[FEED] Categorías:', this.categorias.length);
      } catch (err) {
        console.error('[FEED] Error categorías:', err);
        this.categorias = [];
      }
    },

    filterByCategory(catId, event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      console.log('[FEED] Filtrando por categoría:', catId);

      this.selectedCategory = catId;
      this.currentPage = 0;
      this.posts = [];
      this.hasMorePosts = true;

      this.$nextTick(() => {
        this.loadPosts();
      });

      const url = catId && catId !== 'todo'
        ? `?categoria=${catId}`
        : 'feed.html';
      history.pushState({ category: catId }, '', url);
    },

    // CORREGIDO: Toggle like con mapeo correcto de la respuesta
    async toggleLike(post) {
      if (!post || !post.id) {
        console.error('[FEED] Post inválido para like');
        return;
      }

      console.log('[FEED] Toggle like en post:', post.id, 'Estado actual:', post.liked);

      const previousLiked = post.liked;
      const previousCount = post.like_count || 0;

      // Optimistic UI
      post.liked = !post.liked;
      post.like_count = post.liked ? previousCount + 1 : Math.max(0, previousCount - 1);

      try {
        const response = await api.post(`${CONFIG.ENDPOINTS.POSTS}/${post.id}/like`);
        console.log('[FEED] Like response:', response);

        // ← CORREGIDO: Mapear correctamente la respuesta del backend
        if (response) {
          // El backend devuelve likedByCurrentUser, no liked
          if (response.likedByCurrentUser !== undefined) {
            post.liked = response.likedByCurrentUser;
          } else if (response.liked !== undefined) {
            post.liked = response.liked;
          }
          
          // El backend devuelve likeCount (camelCase)
          if (response.likeCount !== undefined) {
            post.like_count = response.likeCount;
          } else if (response.like_count !== undefined) {
            post.like_count = response.like_count;
          }
        }

      } catch (err) {
        console.error('[FEED] Error en like:', err);

        // Revertir cambios
        post.liked = previousLiked;
        post.like_count = previousCount;

        this.showToast('Error al procesar like', 'error');
      }
    },

    formatDate(dateString) {
      if (!dateString || dateString === 'null' || dateString === 'undefined') {
        return 'Fecha desconocida';
      }

      try {
        if (typeof dateString === 'string' && dateString.includes('/Date(')) {
          const match = dateString.match(/\/Date\((\d+)\)\//);
          if (match) {
            dateString = parseInt(match[1]);
          }
        }

        const date = new Date(dateString);

        if (isNaN(date.getTime())) {
          console.warn('[FEED] Fecha inválida:', dateString);
          return 'Fecha inválida';
        }

        const now = new Date();
        const diff = (now - date) / 1000;

        if (diff < 60) return 'Hace un momento';
        if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
        if (diff < 604800) return `Hace ${Math.floor(diff / 86400)} d`;

        return date.toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
          year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
      } catch (e) {
        console.error('[FEED] Error formateando fecha:', e, dateString);
        return 'Fecha desconocida';
      }
    },

    async sharePost(post) {
      if (!post || !post.id) return;

      const url = `${window.location.origin}/post.html?id=${post.id}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: post.titulo || 'Ver post en Hooked',
            url
          });
        } catch (err) {
          // User cancelled share
        }
      } else {
        try {
          await navigator.clipboard.writeText(url);
          this.showToast('Enlace copiado al portapeles', 'success');
        } catch (err) {
          this.showToast('No se pudo copiar el enlace', 'error');
        }
      }
    },

    logout() {
      api.logout();
      window.location.href = 'index.html';
    },

    showToast(message, type = 'info') {
      window.dispatchEvent(new CustomEvent('toast', {
        detail: { message, type }
      }));
    }
  }));

});