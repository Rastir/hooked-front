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

    lightbox: {
      abierto: false,
      post: null,
      comentarios: [],
      loadingComentarios: false,
      nuevoComentario: '',
      enviando: false,
      comentarioEditando: null,
      textoEditando: '',
    },

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
          id: payload.userId || payload.id || payload.sub,
          email: payload.sub || payload.email,
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
        let endpoint = `${CONFIG.ENDPOINTS.POSTS}?page=${this.currentPage}&size=10&_t=${Date.now()}`;
        if (this.selectedCategory && this.selectedCategory !== 'todo') {
          endpoint += `&categoria=${this.selectedCategory}`;
        }

        console.log('[FEED] Endpoint:', endpoint);
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

        // DEBUG: Log del primer post crudo
        if (newPosts.length > 0) {
          console.log('[FEED] Primer post crudo del backend:', newPosts[0]);
          console.log('[FEED] likedByCurrentUser en primer post:', newPosts[0].likedByCurrentUser);
        }

        // MAPEO CORREGIDO: Forzar recreación completa del array para reactividad
        const mappedPosts = newPosts.map(post => this.mapearPostDesdeBackend(post));

        console.log('[FEED] Posts mapeados:', mappedPosts);
        if (mappedPosts.length > 0) {
          console.log('[FEED] Primer post mapeado - liked:', mappedPosts[0].liked);
        }

        // CORRECCIÓN CRÍTICA: Usar asignación reactiva correcta
        if (this.currentPage === 0) {
          // Forzar limpieza completa para evitar referencias viejas
          this.posts = [];
          await this.$nextTick();
          this.posts = [...mappedPosts];
        } else {
          this.posts = [...this.posts, ...mappedPosts];
        }

        console.log('[FEED] Posts totales en array:', this.posts.length);
        if (this.posts.length > 0) {
          console.log('[FEED] Estado final primer post - liked:', this.posts[0].liked);
        }

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

    // CORREGIDO: Mapeo explícito con logs de debug
    mapearPostDesdeBackend(post) {
      console.log('[FEED] Mapeando post ID:', post.id, '- likedByCurrentUser crudo:', post.likedByCurrentUser);
      console.log('[FEED] fotoPerfil del autor:', post.autor?.fotoPerfil);

      const mapped = {
        id: post.id,
        titulo: post.titulo,
        contenido: post.contenido,
        foto_link: post.fotoLink || post.foto_link || null,
        fecha_creacion: post.fechaCreacion || post.fecha_creacion || null,
        like_count: post.likeCount || post.like_count || 0,
        // CRÍTICO: Usar likedByCurrentUser del backend, forzar booleano
        liked: Boolean(post.likedByCurrentUser),
        usuario: post.autor ? {
          id: post.autor.id,
          nombre: post.autor.nombre,
          email: post.autor.email,
          foto_perfil: post.autor.fotoPerfil || null
        } : post.usuario || null,
        categoria: post.categoria || null,
        comentarios_count: post.comentariosCount || 0
      };

      console.log('[FEED] Post mapeado - liked final:', mapped.liked);
      return mapped;
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

    // CORREGIDO: Toggle
    async toggleLike(post) {
      if (!post || !post.id) return;

      const previousLiked = post.liked;
      const previousCount = post.like_count || 0;

      // Optimistic UI inmediato
      post.liked = !post.liked;
      post.like_count = post.liked
        ? previousCount + 1
        : Math.max(0, previousCount - 1);
      this.posts = [...this.posts];

      try {
        const response = await api.post(
          `${CONFIG.ENDPOINTS.POSTS}/${post.id}/like`, {}
        );

        if (response && response.likedByCurrentUser !== undefined) {
          // ✅ Actualizar SOLO este post en el array, sin recargar nada
          const index = this.posts.findIndex(p => p.id === post.id);
          if (index !== -1) {
            this.posts[index] = {
              ...this.posts[index],
              liked: response.likedByCurrentUser === true,
              like_count: response.likeCount ?? post.like_count
            };
            // Forzar reactividad de Alpine
            this.posts = [...this.posts];
          }
        }

      } catch (err) {
        // Revertir si falla
        post.liked = previousLiked;
        post.like_count = previousCount;
        this.posts = [...this.posts];
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

    async abrirLightbox(post) {
      // Abrimos con los datos que ya tenemos del feed
      this.lightbox.abierto = true;
      this.lightbox.post = post;
      this.lightbox.comentarios = [];
      this.lightbox.nuevoComentario = '';

      // Cargamos comentarios en paralelo
      await this._cargarComentariosLightbox(post.id);
    },

    cerrarLightbox() {
      this.lightbox.abierto = false;
      this.lightbox.post = null;
      this.lightbox.comentarios = [];
      this.lightbox.nuevoComentario = '';
    },

    async _cargarComentariosLightbox(postId) {
      try {
        this.lightbox.loadingComentarios = true;

        const respuesta = await api.get(
          `${CONFIG.ENDPOINTS.COMENTARIOS}/post/${postId}/principales?pagina=0&tamano=20&_t=${Date.now()}`
        );

        this.lightbox.comentarios = respuesta.contenido || respuesta.content || [];

      } catch (err) {
        console.error('[LIGHTBOX] Error cargando comentarios:', err);
        this.lightbox.comentarios = [];
      } finally {
        this.lightbox.loadingComentarios = false;
      }
    },

    async toggleLikeLightbox() {
      const post = this.lightbox.post;
      if (!post) return;

      // Optimistic UI
      const previousLiked = post.liked;
      const previousCount = post.like_count || 0;

      post.liked = !post.liked;
      post.like_count = post.liked ? previousCount + 1 : Math.max(0, previousCount - 1);

      try {
        const response = await api.post(
          `${CONFIG.ENDPOINTS.POSTS}/${post.id}/like`, {}
        );

        if (response && response.likedByCurrentUser !== undefined) {
          post.liked = response.likedByCurrentUser === true;
          post.like_count = response.likeCount ?? post.like_count;
        }

        // Sincronizar con el post en el feed también
        const index = this.posts.findIndex(p => p.id === post.id);
        if (index !== -1) {
          this.posts[index] = {
            ...this.posts[index],
            liked: post.liked,
            like_count: post.like_count
          };
          this.posts = [...this.posts];
        }

      } catch (err) {
        // Revertir si falla
        post.liked = previousLiked;
        post.like_count = previousCount;
        this.showToast('Error al procesar like', 'error');
      }
    },

    async enviarComentarioLightbox() {
      const post = this.lightbox.post;
      if (!this.lightbox.nuevoComentario.trim() || this.lightbox.enviando || !post) return;

      try {
        this.lightbox.enviando = true;

        const creado = await api.post(CONFIG.ENDPOINTS.COMENTARIOS, {
          contenido: this.lightbox.nuevoComentario.trim(),
          postId: post.id,
          comentarioPadreId: null
        });

        // Agregar al inicio de la lista
        this.lightbox.comentarios = [creado, ...this.lightbox.comentarios];

        // Actualizar contador en el feed
        const index = this.posts.findIndex(p => p.id === post.id);
        if (index !== -1) {
          this.posts[index] = {
            ...this.posts[index],
            comentarios_count: (this.posts[index].comentarios_count || 0) + 1
          };
          this.posts = [...this.posts];
        }

        this.lightbox.nuevoComentario = '';
        this.showToast('Comentario publicado 💬', 'success');

      } catch (err) {
        console.error('[LIGHTBOX] Error enviando comentario:', err);
        this.showToast(err.message || 'No se pudo publicar el comentario', 'error');
      } finally {
        this.lightbox.enviando = false;
      }
    },

    esPropioLightbox(comentario) {
      if (!this.user || !comentario.autor) return false;
      return comentario.autor.id?.toString() === this.user.id?.toString();
    },

    editarComentarioLightbox(comentario) {
      this.lightbox.comentarioEditando = comentario;
      this.lightbox.textoEditando = comentario.contenido;
    },

    cancelarEdicionLightbox() {
      this.lightbox.comentarioEditando = null;
      this.lightbox.textoEditando = '';
    },

    async guardarEdicionLightbox() {
      const comentario = this.lightbox.comentarioEditando;
      if (!comentario || !this.lightbox.textoEditando.trim()) return;
      if (this.lightbox.textoEditando.trim() === comentario.contenido) {
        this.cancelarEdicionLightbox();
        return;
      }

      try {
        const actualizado = await api.put(
          `${CONFIG.ENDPOINTS.COMENTARIOS}/${comentario.id}`,
          { contenido: this.lightbox.textoEditando.trim() }
        );

        this.lightbox.comentarios = this.lightbox.comentarios.map(c =>
          c.id === comentario.id
            ? { ...c, contenido: actualizado.contenido }
            : c
        );

        this.cancelarEdicionLightbox();
        this.showToast('Comentario actualizado ✏️', 'success');

      } catch (err) {
        this.showToast('No se pudo editar el comentario', 'error');
      }
    },

    async eliminarComentarioLightbox(comentario) {
      if (!confirm('¿Eliminar este comentario?')) return;

      try {
        await api.delete(`${CONFIG.ENDPOINTS.COMENTARIOS}/${comentario.id}`);

        this.lightbox.comentarios = this.lightbox.comentarios.filter(
          c => c.id !== comentario.id
        );

        // Actualizar contador en el feed
        const index = this.posts.findIndex(p => p.id === this.lightbox.post?.id);
        if (index !== -1) {
          this.posts[index] = {
            ...this.posts[index],
            comentarios_count: Math.max(0, (this.posts[index].comentarios_count || 1) - 1)
          };
          this.posts = [...this.posts];
        }

        this.showToast('Comentario eliminado', 'info');

      } catch (err) {
        this.showToast('No se pudo eliminar el comentario', 'error');
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