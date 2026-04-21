/**
 * post.js — Componente Alpine para la página de detalle de un post
 *
 * ¿Cómo funciona la carga?
 * ─────────────────────────
 * 1. Lee el ?id= de la URL para saber qué post mostrar
 * 2. Carga el post con GET /api/posts/{id}
 * 3. Carga los comentarios con GET /api/comentarios/post/{id}/principales
 * 4. Para cada comentario principal, carga sus respuestas si tiene (totalRespuestas > 0)
 * 5. Construye el árbol: comentarios principales con su array "respuestas" adentro
 *
 * Árbol resultante (lo que Alpine renderiza):
 * [
 *   { id: 1, contenido: "...", respuestas: [
 *       { id: 3, contenido: "...", respuestas: [] },
 *   ]},
 *   { id: 2, contenido: "...", respuestas: [] },
 * ]
 */
 
function postApp() {
  return {
 
    // ── Estado del post ──────────────────────────────────────
    loading: true,
    error: null,
    post: null,
    autorFoto: null,       // foto del autor (campo separado para facilitar template)
 
    // ── Estado de comentarios ────────────────────────────────
    loadingComentarios: false,
    loadingMas: false,
    comentariosArbol: [],  // lista plana convertida a árbol
    totalComentarios: 0,
    paginaComentarios: 0,
    TAMANO_COMENTARIOS: 10,
    hayMasComentarios: false,
 
    // ── Estado formularios ───────────────────────────────────
    nuevoComentario: '',
    enviandoComentario: false,
    respondiendo: null,    // id del comentario al que se está respondiendo
    textoRespuesta: '',
    enviandoRespuesta: false,
 
    // ── Usuario logueado ─────────────────────────────────────
    usuarioActual: null,
    postId: null,
 
    // ────────────────────────────────────────────────────────
    // INIT
    // ────────────────────────────────────────────────────────
    async init() {
      // Verificar sesión
      const token = localStorage.getItem(CONFIG.STORAGE.TOKEN);
      if (!token) {
        window.location.href = 'index.html';
        return;
      }
 
      // Leer usuario logueado
      try {
        const raw = localStorage.getItem(CONFIG.STORAGE.USER);
        this.usuarioActual = raw ? JSON.parse(raw) : null;
      } catch { this.usuarioActual = null; }
 
      // Leer el ?id= de la URL
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
 
      if (!id) {
        this.error = 'No se especificó un post.';
        this.loading = false;
        return;
      }
 
      this.postId = parseInt(id);
 
      // Cargar post y comentarios en paralelo para ser más rápidos
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
 
        // El título de la pestaña del navegador muestra el nombre del post
        document.title = `${data.titulo} — Hooked`;
 
        // Guardamos la foto del autor por separado para simplificar el template
        // PostResponse.UsuarioResponse solo tiene id, nombre, email — sin foto
        // así que usamos el avatar generado con la inicial
        this.autorFoto = null;
 
        // Ahora cargamos los comentarios
        await this._cargarComentarios();
 
      } catch (err) {
        console.error('[POST] Error cargando post:', err);
        this.error = err.message || 'No se pudo cargar el post.';
      } finally {
        this.loading = false;
      }
    },
 
    // ────────────────────────────────────────────────────────
    // CARGAR COMENTARIOS PRINCIPALES + SUS RESPUESTAS
    //
    // El backend devuelve una lista plana de comentarios principales
    // (comentarioPadreId = null). Para cada uno que tenga
    // totalRespuestas > 0, pedimos sus respuestas por separado.
    //
    // Es como un árbol genealógico: primero traemos a los abuelos,
    // luego a los hijos de cada abuelo.
    // ────────────────────────────────────────────────────────
    async _cargarComentarios() {
      try {
        this.loadingComentarios = true;
        this.paginaComentarios = 0;
 
        const respuesta = await api.get(
          `${CONFIG.ENDPOINTS.COMENTARIOS}/post/${this.postId}/principales?pagina=0&tamano=${this.TAMANO_COMENTARIOS}&_t=${Date.now()}`
        );
 
        const principales = respuesta.contenido || respuesta.content || [];
        this.totalComentarios = respuesta.totalElementos || 0;
        this.hayMasComentarios = !respuesta.esUltimaPagina && !respuesta.last;
 
        // Construir el árbol: para cada comentario principal, buscar sus respuestas
        this.comentariosArbol = await this._construirArbol(principales);
 
      } catch (err) {
        console.error('[POST] Error cargando comentarios:', err);
        // No mostramos error global, solo dejamos la sección vacía
      } finally {
        this.loadingComentarios = false;
      }
    },
 
    // ────────────────────────────────────────────────────────
    // CONSTRUIR ÁRBOL
    // Recibe lista de comentarios principales, para cada uno
    // que tenga respuestas las carga del backend y las adjunta.
    // ────────────────────────────────────────────────────────
    async _construirArbol(principales) {
      // Cargamos las respuestas de todos los comentarios con hijos en paralelo
      // Promise.all es como pedir varios platillos a la vez en lugar de uno por uno
      const conRespuestas = await Promise.all(
        principales.map(async (comentario) => {
          let respuestas = [];
 
          if (comentario.totalRespuestas > 0) {
            try {
              const r = await api.get(
                `${CONFIG.ENDPOINTS.COMENTARIOS}/${comentario.id}/respuestas?pagina=0&tamano=50&_t=${Date.now()}`
              );
              respuestas = r.contenido || r.content || [];
            } catch (e) {
              console.warn('[POST] No se pudieron cargar respuestas de comentario', comentario.id);
            }
          }
 
          return { ...comentario, respuestas };
        })
      );
 
      return conRespuestas;
    },
 
    // ────────────────────────────────────────────────────────
    // CARGAR MÁS COMENTARIOS (paginación)
    // ────────────────────────────────────────────────────────
    async cargarMasComentarios() {
      if (this.loadingMas || !this.hayMasComentarios) return;
 
      try {
        this.loadingMas = true;
        this.paginaComentarios++;
 
        const respuesta = await api.get(
          `${CONFIG.ENDPOINTS.COMENTARIOS}/post/${this.postId}/principales?pagina=${this.paginaComentarios}&tamano=${this.TAMANO_COMENTARIOS}&_t=${Date.now()}`
        );
 
        const nuevos = respuesta.contenido || respuesta.content || [];
        this.hayMasComentarios = !respuesta.esUltimaPagina && !respuesta.last;
 
        // Construir árbol solo para los nuevos y agregarlos al final
        const nuevosConRespuestas = await this._construirArbol(nuevos);
        this.comentariosArbol = [...this.comentariosArbol, ...nuevosConRespuestas];
 
      } catch (err) {
        console.error('[POST] Error cargando más comentarios:', err);
        this._toast('No se pudieron cargar más comentarios', 'error');
      } finally {
        this.loadingMas = false;
      }
    },
 
    // ────────────────────────────────────────────────────────
    // ENVIAR COMENTARIO NUEVO (nivel 1)
    // ────────────────────────────────────────────────────────
    async enviarComentario() {
      if (!this.nuevoComentario.trim() || this.enviandoComentario) return;
 
      try {
        this.enviandoComentario = true;
 
        const creado = await api.post(CONFIG.ENDPOINTS.COMENTARIOS, {
          contenido: this.nuevoComentario.trim(),
          postId: this.postId,
          comentarioPadreId: null   // es comentario principal, sin padre
        });
 
        // Agregamos el comentario nuevo al principio del árbol con respuestas vacías
        this.comentariosArbol = [{ ...creado, respuestas: [] }, ...this.comentariosArbol];
        this.totalComentarios++;
        this.nuevoComentario = '';
 
        this._toast('Comentario publicado 💬', 'success');
 
      } catch (err) {
        console.error('[POST] Error enviando comentario:', err);
        this._toast(err.message || 'No se pudo publicar el comentario', 'error');
      } finally {
        this.enviandoComentario = false;
      }
    },
 
    // ────────────────────────────────────────────────────────
    // TOGGLE FORMULARIO DE RESPUESTA
    // ────────────────────────────────────────────────────────
    toggleResponder(comentario) {
      if (this.respondiendo === comentario.id) {
        // Ya estaba abierto: cerrarlo
        this.respondiendo = null;
        this.textoRespuesta = '';
      } else {
        // Abrir el formulario para este comentario
        this.respondiendo = comentario.id;
        this.textoRespuesta = '';
      }
    },
 
    // ────────────────────────────────────────────────────────
    // ENVIAR RESPUESTA (nivel 2)
    // ────────────────────────────────────────────────────────
    async enviarRespuesta(comentarioPadreId) {
      if (!this.textoRespuesta.trim() || this.enviandoRespuesta) return;
 
      try {
        this.enviandoRespuesta = true;
 
        const creada = await api.post(CONFIG.ENDPOINTS.COMENTARIOS, {
          contenido: this.textoRespuesta.trim(),
          postId: this.postId,
          comentarioPadreId: comentarioPadreId   // apunta al comentario padre
        });
 
        // Buscar el comentario padre en el árbol y agregar la respuesta
        const idx = this.comentariosArbol.findIndex(c => c.id === comentarioPadreId);
        if (idx !== -1) {
          const padre = this.comentariosArbol[idx];
          this.comentariosArbol[idx] = {
            ...padre,
            respuestas: [...(padre.respuestas || []), creada],
            totalRespuestas: (padre.totalRespuestas || 0) + 1
          };
        }
 
        this.totalComentarios++;
        this.textoRespuesta = '';
        this.respondiendo = null;
 
        this._toast('Respuesta publicada ↩', 'success');
 
      } catch (err) {
        console.error('[POST] Error enviando respuesta:', err);
        this._toast(err.message || 'No se pudo publicar la respuesta', 'error');
      } finally {
        this.enviandoRespuesta = false;
      }
    },
 
    // ────────────────────────────────────────────────────────
    // ELIMINAR COMENTARIO O RESPUESTA
    // ────────────────────────────────────────────────────────
    async eliminarComentario(comentario) {
      if (!confirm('¿Eliminar este comentario?')) return;
 
      try {
        await api.delete(`${CONFIG.ENDPOINTS.COMENTARIOS}/${comentario.id}`);
 
        if (comentario.comentarioPadreId) {
          // Es una respuesta: buscar el padre y quitar esta respuesta de su array
          const idxPadre = this.comentariosArbol.findIndex(
            c => c.id === comentario.comentarioPadreId
          );
          if (idxPadre !== -1) {
            const padre = this.comentariosArbol[idxPadre];
            this.comentariosArbol[idxPadre] = {
              ...padre,
              respuestas: padre.respuestas.filter(r => r.id !== comentario.id),
              totalRespuestas: Math.max(0, (padre.totalRespuestas || 1) - 1)
            };
          }
        } else {
          // Es un comentario principal: quitarlo del árbol completo
          this.comentariosArbol = this.comentariosArbol.filter(c => c.id !== comentario.id);
        }
 
        this.totalComentarios = Math.max(0, this.totalComentarios - 1);
        this._toast('Comentario eliminado', 'info');
 
      } catch (err) {
        console.error('[POST] Error eliminando comentario:', err);
        this._toast(err.message || 'No se pudo eliminar el comentario', 'error');
      }
    },
 
    // ────────────────────────────────────────────────────────
    // TOGGLE LIKE en el post
    // Igual que en feed.js: Optimistic UI primero, luego confirma
    // ────────────────────────────────────────────────────────
    async toggleLike() {
      if (!this.post) return;
 
      // Guardamos estado anterior por si falla y hay que revertir
      const antesLiked = this.post.likedByCurrentUser;
      const antesCount = this.post.likeCount || 0;
 
      // Optimistic UI: actualizar visualmente antes de que responda el servidor
      this.post.likedByCurrentUser = !antesLiked;
      this.post.likeCount = antesLiked ? antesCount - 1 : antesCount + 1;
 
      try {
        const resp = await api.post(
          `${CONFIG.ENDPOINTS.POSTS}/${this.postId}/like`
        );
        // Sincronizamos con lo que devuelve el servidor
        this.post.likedByCurrentUser = resp.likedByCurrentUser;
        this.post.likeCount = resp.likeCount;
      } catch (err) {
        // Si falla, revertimos
        this.post.likedByCurrentUser = antesLiked;
        this.post.likeCount = antesCount;
        this._toast('No se pudo registrar el like', 'error');
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
        this._toast('¡Enlace copiado al portapapeles! 🔗', 'success');
      }
    },
 
    // ────────────────────────────────────────────────────────
    // UTILIDADES
    // ────────────────────────────────────────────────────────
 
    // Verifica si un comentario pertenece al usuario logueado
    // comparando el email que viene en el autor con el del localStorage
    esPropio(comentario) {
      if (!this.usuarioActual || !comentario.autor) return false;
      // El ComentarioResponse.AutorResponse tiene: id, nombre, fotoPerfil
      // El localStorage guarda: id, nombre, email
      // Comparamos por id si está disponible
      return comentario.autor.id?.toString() === this.usuarioActual.id?.toString();
    },
 
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
 
    _toast(mensaje, tipo = 'info') {
      window.dispatchEvent(new CustomEvent('toast', {
        detail: { message: mensaje, type: tipo }
      }));
    }
  };
}