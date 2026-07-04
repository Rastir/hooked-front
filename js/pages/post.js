/**
 * post.js — Componente Alpine para la página de detalle de un post
 *
 * A partir de este refactor, toda la lógica de comentarios (cargar,
 * editar, eliminar, lazy load de respuestas...) NO vive aquí — vive
 * una sola vez en comentarios-mixin.js y se "mezcla" abajo con
 * ...ComentariosMixin(). Piensa en postApp() como una cocina que
 * usa la misma receta compartida que feed.js, con sus propios
 * ingredientes extra alrededor (el post, el formulario de respuesta).
 */
 
function postApp() {
  return {
 
    // Mezcla comentarios, totalComentarios, cargarComentarios(),
    // cargarMasComentarios(), cargarRespuestas(), editarComentario(),
    // cancelarEdicion(), guardarEdicion(), eliminarComentario(),
    // esPropio(), enviarComentario(), etc. — todo definido una sola
    // vez en comentarios-mixin.js.
    ...ComentariosMixin(),
 
    // ── Estado del post ──────────────────────────────────────
    loading: true,
    error: null,
    post: null,
 
    // Cuántos comentarios se piden por página. Es propio de esta
    // página (el lightbox en feed.js pide una cantidad distinta),
    // por eso vive aquí y no en el mixin.
    TAMANO_COMENTARIOS: 10,
 
    // ── Estado del formulario de comentario nuevo ────────────
    nuevoComentario: '',
 
    // ── Estado del formulario de respuesta ───────────────────
    // Es específico de esta página: el lightbox de feed.js todavía
    // no tiene la función de "responder" a un comentario.
    respondiendo: null,
    textoRespuesta: '',
 
    // ── Usuario logueado ─────────────────────────────────────
    usuarioActual: null,
    postId: null,
 
    // ────────────────────────────────────────────────────────
    // INIT
    // ────────────────────────────────────────────────────────
    async init() {
      const token = localStorage.getItem(CONFIG.STORAGE.TOKEN);
      if (!token) {
        window.location.href = 'index.html';
        return;
      }
 
      try {
        const raw = localStorage.getItem(CONFIG.STORAGE.USER);
        this.usuarioActual = raw ? JSON.parse(raw) : null;
      } catch { this.usuarioActual = null; }
 
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
 
      if (!id) {
        this.error = 'No se especificó un post.';
        this.loading = false;
        return;
      }
 
      this.postId = parseInt(id);
      await this._cargarPost();
    },
 
    // ────────────────────────────────────────────────────────
    // CARGAR POST
    // ────────────────────────────────────────────────────────
    async _cargarPost() {
      try {
        this.loading = true;
        this.error = null;
 
        const data = await api.get(
          `${CONFIG.ENDPOINTS.POSTS}/${this.postId}?_t=${Date.now()}`
        );
 
        this.post = data;
        document.title = `${data.titulo} — Hooked`;
 
        // Método del mixin: carga la primera página de comentarios
        // principales (sin sus respuestas todavía — lazy load).
        await this.cargarComentarios(this.postId, { tamano: this.TAMANO_COMENTARIOS });
 
      } catch (err) {
        console.error('[POST] Error cargando post:', err);
        this.error = err.message || 'No se pudo cargar el post.';
      } finally {
        this.loading = false;
      }
    },
 
    // ────────────────────────────────────────────────────────
    // Envoltorio delgado para publicar el comentario principal.
    //
    // Existe porque el mixin no sabe en qué variable escribes tu
    // texto (aquí se llama "nuevoComentario"), así que este método
    // solo toma lo que hay en pantalla y se lo entrega a la receta
    // compartida — como un mesero llevando la orden a la cocina.
    // ────────────────────────────────────────────────────────
    async publicarComentario() {
      if (!this.nuevoComentario.trim()) return;
      const creado = await this.enviarComentario(this.postId, this.nuevoComentario);
      if (creado) this.nuevoComentario = '';
    },
 
    // ────────────────────────────────────────────────────────
    // TOGGLE FORMULARIO DE RESPUESTA
    // ────────────────────────────────────────────────────────
    toggleResponder(comentario) {
      if (this.respondiendo === comentario.id) {
        this.respondiendo = null;
        this.textoRespuesta = '';
      } else {
        this.respondiendo = comentario.id;
        this.textoRespuesta = '';
      }
    },
 
    // ────────────────────────────────────────────────────────
    // Envoltorio delgado para publicar una respuesta (nivel 2).
    // Igual que publicarComentario(), pero mandando el
    // comentarioPadreId para que el mixin sepa que es una respuesta.
    // ────────────────────────────────────────────────────────
    async enviarRespuesta(comentarioPadreId) {
      if (!this.textoRespuesta.trim()) return;
      const creada = await this.enviarComentario(this.postId, this.textoRespuesta, comentarioPadreId);
      if (creada) {
        this.textoRespuesta = '';
        this.respondiendo = null;
      }
    },
 
    // ────────────────────────────────────────────────────────
    // TOGGLE LIKE en el post
    // ────────────────────────────────────────────────────────
    async toggleLike() {
      if (!this.post) return;
 
      const antesLiked = this.post.likedByCurrentUser;
      const antesCount = this.post.likeCount || 0;
 
      this.post.likedByCurrentUser = !antesLiked;
      this.post.likeCount = antesLiked ? antesCount - 1 : antesCount + 1;
 
      try {
        const resp = await api.post(
          `${CONFIG.ENDPOINTS.POSTS}/${this.postId}/like`
        );
        this.post.likedByCurrentUser = resp.likedByCurrentUser;
        this.post.likeCount = resp.likeCount;
      } catch (err) {
        this.post.likedByCurrentUser = antesLiked;
        this.post.likeCount = antesCount;
        this._toastComentarios('No se pudo registrar el like', 'error');
      }
    },
 
    // ────────────────────────────────────────────────────────
    // COMPARTIR
    // ────────────────────────────────────────────────────────
    async compartir() {
      const url = window.location.href;
      if (navigator.share) {
        try {
          await navigator.share({ title: this.post?.titulo, url });
        } catch { /* usuario canceló */ }
      } else {
        await navigator.clipboard.writeText(url);
        this._toastComentarios('¡Enlace copiado al portapapeles! 🔗', 'success');
      }
    },
 
    // ────────────────────────────────────────────────────────
    // UTILIDADES
    // ────────────────────────────────────────────────────────
    logout() {
      localStorage.clear();
      window.location.href = 'index.html';
    },
 
    formatNum(num) {
      if (!num) return '0';
      if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
      if (num >= 1_000) return (num / 1_000).toFixed(1) + 'k';
      return String(num);
    },
 
    formatFecha(fechaISO) {
      if (!fechaISO) return '';
      const fecha = new Date(fechaISO);
      const ahora = new Date();
      const diff = Math.floor((ahora - fecha) / 1000);
 
      if (diff < 60) return 'Hace un momento';
      if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
      if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
      if (diff < 2592000) return `Hace ${Math.floor(diff / 86400)} días`;
      return fecha.toLocaleDateString('es-MX', {
        day: 'numeric', month: 'short', year: 'numeric'
      });
    },
  };
}
 