document.addEventListener('alpine:init', () => {
 
  // ══════════════════════════════════════════════════════════
  // feedApp — controla el feed principal y el lightbox
  // ══════════════════════════════════════════════════════════
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
      const token = localStorage.getItem(CONFIG.STORAGE.TOKEN);
      const userData = localStorage.getItem(CONFIG.STORAGE.USER);
 
      if (!token) {
        window.location.href = 'index.html';
        return;
      }
 
      if (userData && userData !== 'undefined' && userData !== 'null') {
        try {
          this.user = JSON.parse(userData);
        } catch (e) {
          this.user = this.decodeTokenUser(token);
        }
      } else {
        this.user = this.decodeTokenUser(token);
      }
 
      await this.loadCategorias();
      await this.loadPosts();
      this.isInitialized = true;
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
        return null;
      }
    },
 
    async loadPosts() {
      this.loading = true;
      try {
        let endpoint = `${CONFIG.ENDPOINTS.POSTS}?page=${this.currentPage}&size=10&_t=${Date.now()}`;
        if (this.selectedCategory && this.selectedCategory !== 'todo') {
          endpoint += `&categoriaId=${this.selectedCategory}`;
        }
 
        const response = await api.get(endpoint);
 
        let newPosts = [];
        let totalPages = null;
 
        if (Array.isArray(response)) {
          newPosts = response;
        } else if (response?.content) {
          newPosts = response.content;
          totalPages = response.totalPages;
        } else if (response && typeof response === 'object') {
          newPosts = Object.values(response).find(v => Array.isArray(v)) || [];
        }
 
        const mappedPosts = newPosts.map(post => this.mapearPostDesdeBackend(post));
 
        if (this.currentPage === 0) {
          this.posts = [];
          await this.$nextTick();
          this.posts = [...mappedPosts];
        } else {
          this.posts = [...this.posts, ...mappedPosts];
        }
 
        this.hasMorePosts = totalPages !== null
          ? this.currentPage < totalPages - 1
          : newPosts.length === 10;
 
      } catch (err) {
        console.error('[FEED] Error cargando posts:', err);
        this.posts = [];
        this.showToast('Error al cargar publicaciones', 'error');
      } finally {
        this.loading = false;
      }
    },
 
    mapearPostDesdeBackend(post) {
      return {
        id: post.id,
        titulo: post.titulo,
        contenido: post.contenido,
        foto_link: post.fotoLink || post.foto_link || null,
        fecha_creacion: post.fechaCreacion || post.fecha_creacion || null,
        like_count: post.likeCount || post.like_count || 0,
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
      } catch (err) {
        console.error('[FEED] Error categorías:', err);
        this.categorias = [];
      }
    },
 
    filterByCategory(catId) {
      this.selectedCategory = catId;
      this.currentPage = 0;
      this.posts = [];
      this.hasMorePosts = true;
      this.$nextTick(() => this.loadPosts());
 
      const url = catId && catId !== 'todo' ? `?categoria=${catId}` : 'feed.html';
      history.pushState({ category: catId }, '', url);
    },
 
    async toggleLike(post) {
      if (!post?.id) return;
 
      const prevLiked = post.liked;
      const prevCount = post.like_count || 0;
 
      post.liked = !post.liked;
      post.like_count = post.liked ? prevCount + 1 : Math.max(0, prevCount - 1);
      this.posts = [...this.posts];
 
      try {
        const response = await api.post(`${CONFIG.ENDPOINTS.POSTS}/${post.id}/like`, {});
        if (response?.likedByCurrentUser !== undefined) {
          const idx = this.posts.findIndex(p => p.id === post.id);
          if (idx !== -1) {
            this.posts[idx] = {
              ...this.posts[idx],
              liked: response.likedByCurrentUser === true,
              like_count: response.likeCount ?? post.like_count
            };
            this.posts = [...this.posts];
          }
        }
      } catch (err) {
        post.liked = prevLiked;
        post.like_count = prevCount;
        this.posts = [...this.posts];
        this.showToast('Error al procesar like', 'error');
      }
    },
 
    formatDate(dateString) {
      if (!dateString || dateString === 'null' || dateString === 'undefined') return 'Fecha desconocida';
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Fecha inválida';
 
        const diff = (Date.now() - date) / 1000;
        if (diff < 60) return 'Hace un momento';
        if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
        if (diff < 604800) return `Hace ${Math.floor(diff / 86400)} d`;
 
        return date.toLocaleDateString('es-ES', {
          day: 'numeric', month: 'short',
          year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
      } catch (e) {
        return 'Fecha desconocida';
      }
    },
 
    async sharePost(post) {
      if (!post?.id) return;
      const url = `${window.location.origin}/post.html?id=${post.id}`;
      if (navigator.share) {
        try { await navigator.share({ title: post.titulo || 'Hooked', url }); } catch {}
      } else {
        try {
          await navigator.clipboard.writeText(url);
          this.showToast('Enlace copiado al portapeles', 'success');
        } catch {
          this.showToast('No se pudo copiar el enlace', 'error');
        }
      }
    },
 
    // ── Lightbox ──────────────────────────────────────────────
    async abrirLightbox(post) {
      this.lightbox.abierto = true;
      this.lightbox.post = post;
      this.lightbox.comentarios = [];
      this.lightbox.nuevoComentario = '';
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
        const res = await api.get(
          `${CONFIG.ENDPOINTS.COMENTARIOS}/post/${postId}/principales?pagina=0&tamano=20&_t=${Date.now()}`
        );
        this.lightbox.comentarios = res.contenido || res.content || [];
      } catch (err) {
        console.error('[LIGHTBOX] Error comentarios:', err);
        this.lightbox.comentarios = [];
      } finally {
        this.lightbox.loadingComentarios = false;
      }
    },
 
    async toggleLikeLightbox() {
      const post = this.lightbox.post;
      if (!post) return;
 
      const prevLiked = post.liked;
      const prevCount = post.like_count || 0;
      post.liked = !post.liked;
      post.like_count = post.liked ? prevCount + 1 : Math.max(0, prevCount - 1);
 
      try {
        const response = await api.post(`${CONFIG.ENDPOINTS.POSTS}/${post.id}/like`, {});
        if (response?.likedByCurrentUser !== undefined) {
          post.liked = response.likedByCurrentUser === true;
          post.like_count = response.likeCount ?? post.like_count;
        }
        const idx = this.posts.findIndex(p => p.id === post.id);
        if (idx !== -1) {
          this.posts[idx] = { ...this.posts[idx], liked: post.liked, like_count: post.like_count };
          this.posts = [...this.posts];
        }
      } catch (err) {
        post.liked = prevLiked;
        post.like_count = prevCount;
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
        this.lightbox.comentarios = [creado, ...this.lightbox.comentarios];
        const idx = this.posts.findIndex(p => p.id === post.id);
        if (idx !== -1) {
          this.posts[idx] = { ...this.posts[idx], comentarios_count: (this.posts[idx].comentarios_count || 0) + 1 };
          this.posts = [...this.posts];
        }
        this.lightbox.nuevoComentario = '';
        this.showToast('Comentario publicado 💬', 'success');
      } catch (err) {
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
          c.id === comentario.id ? { ...c, contenido: actualizado.contenido } : c
        );
        this.cancelarEdicionLightbox();
        this.showToast('Comentario actualizado ✏️', 'success');
      } catch {
        this.showToast('No se pudo editar el comentario', 'error');
      }
    },
 
    async eliminarComentarioLightbox(comentario) {
      const ok = await Utils.confirm({
        icono: '🗑️',
        titulo: '¿Eliminar comentario?',
        mensaje: 'Esta acción no se puede deshacer.',
        btnOk: 'Eliminar',
        btnCancel: 'Cancelar',
        peligro: true,
      });
      if (!ok) return;
 
      try {
        await api.delete(`${CONFIG.ENDPOINTS.COMENTARIOS}/${comentario.id}`);
        this.lightbox.comentarios = this.lightbox.comentarios.filter(c => c.id !== comentario.id);
        const idx = this.posts.findIndex(p => p.id === this.lightbox.post?.id);
        if (idx !== -1) {
          this.posts[idx] = { ...this.posts[idx], comentarios_count: Math.max(0, (this.posts[idx].comentarios_count || 1) - 1) };
          this.posts = [...this.posts];
        }
        this.showToast('Comentario eliminado', 'info');
      } catch {
        this.showToast('No se pudo eliminar el comentario', 'error');
      }
    },
 
    logout() {
      api.logout();
      window.location.href = 'index.html';
    },
 
    showToast(message, type = 'info') {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message, type } }));
    }
  }));
 
  // ══════════════════════════════════════════════════════════
  // tipsWidget — widget "Tip del día" en el sidebar
  // ══════════════════════════════════════════════════════════
  Alpine.data('tipsWidget', () => ({
    tipActual: 0,
    tips: [
      { emoji: '🌅', categoria: 'Horario',     tip: 'Las mejores mordidas son al amanecer y al atardecer, cuando la luz es baja y los peces suben a alimentarse.' },
      { emoji: '🌊', categoria: 'Agua',        tip: 'En agua turbia usa señuelos de colores brillantes como naranja o chartreuse. En agua clara, tonos naturales y transparentes.' },
      { emoji: '🎣', categoria: 'Técnica',     tip: 'Varía la velocidad del curricán. A veces un tirón brusco seguido de pausa es lo que provoca el ataque.' },
      { emoji: '🌡️', categoria: 'Temperatura', tip: 'Los peces son de sangre fría. Cuando el agua baja de 15°C se vuelven más lentos — usa señuelos más pequeños y muévelos despacio.' },
      { emoji: '🪱', categoria: 'Carnada',     tip: 'La lombriz de tierra sigue siendo la carnada más efectiva para agua dulce. Cámbiala cada 20-30 minutos para que siga activa.' },
      { emoji: '🌙', categoria: 'Luna',        tip: 'Luna llena y luna nueva son los mejores días para pescar. La gravedad lunar afecta el comportamiento de los peces.' },
      { emoji: '🌿', categoria: 'Hábitat',     tip: 'Busca estructuras bajo el agua: rocas, troncos, plantas acuáticas. Los peces se refugian ahí para cazar.' },
      { emoji: '🎯', categoria: 'Precisión',   tip: 'Lanza paralelo a la orilla, no hacia el centro. La mayoría de peces se alimentan cerca de la vegetación costera.' },
      { emoji: '🤫', categoria: 'Silencio',    tip: 'Los peces detectan vibración a través de la línea lateral. Camina suave en la orilla y evita golpear la embarcación.' },
      { emoji: '🪝', categoria: 'Anzuelo',     tip: 'Un anzuelo sin filo es el error más común. Pruébalo en tu uña — si resbala, afílalo. Un buen filo duplica tus capturas.' },
      { emoji: '☁️', categoria: 'Clima',       tip: 'Los días nublados son ideales. Sin sol directo los peces se sienten seguros y se mueven más, especialmente truchas.' },
      { emoji: '🎶', categoria: 'Paciencia',   tip: 'El 10% del agua contiene el 90% de los peces. Aprende a leer el río: corrientes, remansos, cambios de profundidad.' },
    ],
    get tip() { return this.tips[this.tipActual]; },
    init() {
      const inicio = new Date(new Date().getFullYear(), 0, 0);
      const diaDelAnio = Math.floor((Date.now() - inicio) / 86_400_000);
      this.tipActual = diaDelAnio % this.tips.length;
    }
  }));
 
  // ══════════════════════════════════════════════════════════
  // buscarApp — modal de búsqueda global
  //
  // Vive en su propio Alpine.data() separado de feedApp porque
  // su HTML está fuera del div de feedApp. Se comunican con
  // CustomEvents: feedApp dispara 'abrir-buscador' con
  // $dispatch(), y buscarApp lo escucha con @abrir-buscador.window.
  //
  // La búsqueda lanza dos peticiones en paralelo con Promise.all
  // (usuarios + posts al mismo tiempo), como pescar con dos
  // cañas en vez de una.
  // ══════════════════════════════════════════════════════════
  Alpine.data('buscarApp', () => ({
 
    buscar: {
      abierto: false,
      query: '',
      tabActiva: 'todo',  // 'todo' | 'posts' | 'personas' | 'spots' | 'tiendas'
      loading: false,
      usuarios: [],
      posts: [],
    },
 
    init() {
      // El evento se escucha con @abrir-buscador.window en el HTML.
      // No necesitamos addEventListener manual aquí.
    },
 
    abrirModal() {
      this.buscar.abierto = true;
      this.buscar.query = '';
      this.buscar.usuarios = [];
      this.buscar.posts = [];
      this.buscar.tabActiva = 'todo';
      // Enfocar el input una vez Alpine termine de renderizar el modal
      this.$nextTick(() => this.$refs.inputBuscar?.focus());
    },
 
    cerrar() {
      this.buscar.abierto = false;
    },
 
    cambiarTab(tab) {
      // Los tabs "próximamente" están bloqueados con @click.prevent en el HTML
      if (tab === 'spots' || tab === 'tiendas') return;
      this.buscar.tabActiva = tab;
    },
 
    async buscarTodo() {
      const q = this.buscar.query.trim();
      if (!q) {
        this.buscar.usuarios = [];
        this.buscar.posts = [];
        return;
      }
 
      this.buscar.loading = true;
      try {
        // Promise.all lanza las dos peticiones al mismo tiempo
        // y espera a que ambas terminen antes de continuar.
        const [usuarios, posts] = await Promise.all([
          this._buscarUsuarios(q),
          this._buscarPosts(q),
        ]);
        this.buscar.usuarios = usuarios;
        this.buscar.posts = posts;
      } catch (err) {
        console.error('[BUSCAR] Error:', err);
      } finally {
        this.buscar.loading = false;
      }
    },
 
    async _buscarUsuarios(q) {
      try {
        // GET /api/usuarios/buscar-avanzado?q=...
        const res = await api.get(
          `${CONFIG.ENDPOINTS.USUARIOS}/buscar-avanzado?q=${encodeURIComponent(q)}&pagina=0&tamano=10&_t=${Date.now()}`
        );
        return res?.contenido || res?.content || (Array.isArray(res) ? res : []);
      } catch (err) {
        console.error('[BUSCAR] Error usuarios:', err);
        return [];
      }
    },
 
    async _buscarPosts(q) {
      try {
        // GET /api/posts?busqueda=... — mismo endpoint del feed con filtro
        const res = await api.get(
          `${CONFIG.ENDPOINTS.POSTS}?busqueda=${encodeURIComponent(q)}&page=0&size=10&_t=${Date.now()}`
        );
        return res?.content || res?.contenido || (Array.isArray(res) ? res : []);
      } catch (err) {
        console.error('[BUSCAR] Error posts:', err);
        return [];
      }
    },
 
  }));
 
});