document.addEventListener('alpine:init', () => {

  Alpine.data('feedApp', () => ({
    // IMPORTANTE: Inicializar posts como array vacío, NO null/undefined
    user: null,
    posts: [], // ← Esto evita el error de Alpine
    categorias: [],
    loading: true,
    loadingMore: false,
    hasMorePosts: true,
    currentPage: 0,
    selectedCategory: null,

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

      if (userData) {
        try {
          this.user = JSON.parse(userData);
          console.log('[FEED] Usuario:', this.user);
        } catch (e) {
          console.error('[FEED] Error parseando user:', e);
        }
      }

      // Cargar datos
      await this.loadCategorias();
      await this.loadPosts();

      console.log('[FEED] Init completado. Posts:', this.posts.length);
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
        console.log('[FEED] Tipo:', typeof response);
        console.log('[FEED] Es array?', Array.isArray(response));

        // Manejar diferentes formatos de respuesta
        let newPosts = [];

        if (Array.isArray(response)) {
          // Backend devuelve array directo
          newPosts = response;
          console.log('[FEED] Respuesta es array, posts:', newPosts.length);
        } else if (response && response.content) {
          // Backend devuelve Page (Spring Data)
          newPosts = response.content;
          console.log('[FEED] Respuesta es Page, posts:', newPosts.length);
        } else if (response && typeof response === 'object') {
          // Podría ser un objeto con array dentro
          newPosts = Object.values(response).find(v => Array.isArray(v)) || [];
          console.log('[FEED] Buscando array en objeto, posts:', newPosts.length);
        }

        // Asegurar que newPosts sea array
        if (!Array.isArray(newPosts)) {
          console.error('[FEED] newPosts no es array:', newPosts);
          newPosts = [];
        }

        // Agregar a posts existentes
        if (this.currentPage === 0) {
          this.posts = newPosts;
        } else {
          this.posts = [...this.posts, ...newPosts];
        }

        console.log('[FEED] Posts totales:', this.posts.length);
        console.log('[FEED] Primer post:', this.posts[0]);

        // Determinar si hay más
        this.hasMorePosts = newPosts.length === 10;

      } catch (err) {
        console.error('[FEED] Error cargando posts:', err);
        this.posts = []; // Asegurar que sea array vacío en error
        this.showToast('Error al cargar publicaciones', 'error');
      } finally {
        this.loading = false;
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

    filterByCategory(catId) {
      this.selectedCategory = catId;
      this.currentPage = 0;
      this.posts = []; // Resetear a array vacío
      this.loadPosts();

      if (catId && catId !== 'todo') {
        history.pushState({}, '', `?categoria=${catId}`);
      } else {
        history.pushState({}, '', 'feed.html');
      }
    },

    async toggleLike(post) {
      console.log('[FEED] Toggle like en post:', post.id, 'Estado actual:', post.liked);

      try {
        const response = await api.post(`${CONFIG.ENDPOINTS.POSTS}/${post.id}/like`);
        console.log('[FEED] Respuesta like:', response);

        // El backend devuelve el nuevo estado o el conteo
        if (response.liked !== undefined) {
          // Backend devuelve estado explícito
          post.liked = response.liked;
          post.like_count = response.like_count || (post.liked ? (post.like_count || 0) + 1 : Math.max(0, (post.like_count || 0) - 1));
        } else if (response.like_count !== undefined) {
          // Backend solo devuelve conteo, alternamos estado local
          post.liked = !post.liked;
          post.like_count = response.like_count;
        } else {
          // Fallback: alternar localmente
          post.liked = !post.liked;
          post.like_count = post.liked ? (post.like_count || 0) + 1 : Math.max(0, (post.like_count || 0) - 1);
        }

      } catch (err) {
        console.error('[FEED] Error en like:', err);

        // Si es 403, probablemente es "ya existe like" o "no existe like"
        if (err.message && (err.message.includes('403') || err.message.includes('ya'))) {
          console.log('[FEED] Error 403 detectado, alternando estado local');
          // Alternar estado localmente como fallback
          post.liked = !post.liked;
          post.like_count = post.liked ? (post.like_count || 0) + 1 : Math.max(0, (post.like_count || 0) - 1);
          return;
        }

        this.showToast('Error al procesar like', 'error');
      }
    },

    formatDate(dateString) {
      if (!dateString) return 'Fecha desconocida';

      const date = new Date(dateString);
      const now = new Date();
      const diff = (now - date) / 1000;

      if (diff < 60) return 'Hace un momento';
      if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
      if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
      if (diff < 604800) return `Hace ${Math.floor(diff / 86400)} d`;

      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short'
      });
    },

    async sharePost(post) {
      const url = `${window.location.origin}/post.html?id=${post.id}`;

      if (navigator.share) {
        try {
          await navigator.share({ title: post.titulo, url });
        } catch (err) { }
      } else {
        await navigator.clipboard.writeText(url);
        this.showToast('Enlace copiado', 'success');
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