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

    // ── Estado de comentarios ────────────────────────────────
    loadingComentarios: false,
    loadingMas: false,
    comentariosArbol: [],
    totalComentarios: 0,
    paginaComentarios: 0,
    TAMANO_COMENTARIOS: 10,
    hayMasComentarios: false,

    // ── Estado formularios ───────────────────────────────────
    nuevoComentario: '',
    enviandoComentario: false,
    respondiendo: null,
    textoRespuesta: '',
    enviandoRespuesta: false,

    // ── Estado modal de edición ──────────────────────────────
    // Piensa en esto como un cajón que se abre cuando quieres editar:
    // - modalEdicionAbierto: ¿está el cajón abierto?
    // - comentarioEnEdicion: ¿qué papel hay dentro del cajón?
    // - textoEdicion: lo que estás escribiendo en ese papel
    modalEdicionAbierto: false,
    comentarioEnEdicion: null,   // guarda el objeto completo del comentario
    textoEdicion: '',
    enviandoEdicion: false,

    // ── Estado modal de confirmación de eliminación ──────────
    modalEliminarAbierto: false,
    comentarioAEliminar: null,   // guardamos cuál comentario quiere borrar
    eliminando: false,

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
        console.log('[POST] usuarioActual cargado:', this.usuarioActual);
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

        this.comentariosArbol = await this._construirArbol(principales);

      } catch (err) {
        console.error('[POST] Error cargando comentarios:', err);
      } finally {
        this.loadingComentarios = false;
      }
    },

    // ────────────────────────────────────────────────────────
    // CONSTRUIR ÁRBOL
    // ────────────────────────────────────────────────────────
    async _construirArbol(principales) {
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
          comentarioPadreId: null
        });

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
        this.respondiendo = null;
        this.textoRespuesta = '';
      } else {
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
          comentarioPadreId: comentarioPadreId
        });

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
    // ABRIR MODAL DE EDICIÓN
    //
    // Imagina que abrirEdicion() es como sacar un papel de un
    // archivero: guardas cuál papel es (comentarioEnEdicion)
    // y escribes una copia en el bloc de notas (textoEdicion).
    // Si cancelas, tiras el bloc. Si guardas, archivas el cambio.
    // ────────────────────────────────────────────────────────
    abrirEdicion(comentario) {
      this.comentarioEnEdicion = comentario;
      this.textoEdicion = comentario.contenido;
      this.modalEdicionAbierto = true;
    },

    cerrarEdicion() {
      this.modalEdicionAbierto = false;
      // Pequeño delay para que la animación de cierre termine antes de limpiar
      setTimeout(() => {
        this.comentarioEnEdicion = null;
        this.textoEdicion = '';
      }, 200);
    },

    // ────────────────────────────────────────────────────────
    // GUARDAR EDICIÓN
    //
    // Llama a PUT /api/comentarios/{id} con el nuevo texto.
    // Luego actualiza el árbol local SIN recargar toda la página,
    // como editar una nota Post-it en tu escritorio sin tirar
    // todas las demás notas.
    // ────────────────────────────────────────────────────────
    async guardarEdicion() {
      if (!this.textoEdicion.trim() || this.enviandoEdicion) return;

      // Si el texto no cambió, simplemente cerramos sin llamar al servidor
      if (this.textoEdicion.trim() === this.comentarioEnEdicion.contenido) {
        this.cerrarEdicion();
        return;
      }

      try {
        this.enviandoEdicion = true;

        const actualizado = await api.put(
          `${CONFIG.ENDPOINTS.COMENTARIOS}/${this.comentarioEnEdicion.id}`,
          { contenido: this.textoEdicion.trim() }
        );

        // ── Actualizar el árbol local ──
        // Dos casos: comentario principal o respuesta anidada

        if (this.comentarioEnEdicion.comentarioPadreId) {
          // CASO 1: Es una respuesta (tiene padre)
          // Tenemos que buscar al padre primero, luego a la respuesta dentro de él
          const idxPadre = this.comentariosArbol.findIndex(
            c => c.id === this.comentarioEnEdicion.comentarioPadreId
          );
          if (idxPadre !== -1) {
            const padre = this.comentariosArbol[idxPadre];
            this.comentariosArbol[idxPadre] = {
              ...padre,
              respuestas: padre.respuestas.map(r =>
                r.id === this.comentarioEnEdicion.id
                  ? { ...r, contenido: actualizado.contenido }
                  : r
              )
            };
          }
        } else {
          // CASO 2: Es un comentario principal (sin padre)
          const idx = this.comentariosArbol.findIndex(
            c => c.id === this.comentarioEnEdicion.id
          );
          if (idx !== -1) {
            this.comentariosArbol[idx] = {
              ...this.comentariosArbol[idx],
              contenido: actualizado.contenido
            };
          }
        }

        this.cerrarEdicion();
        this._toast('Comentario actualizado ✏️', 'success');

      } catch (err) {
        console.error('[POST] Error editando comentario:', err);
        this._toast(err.message || 'No se pudo editar el comentario', 'error');
      } finally {
        this.enviandoEdicion = false;
      }
    },

    // ────────────────────────────────────────────────────────
    // ELIMINAR COMENTARIO O RESPUESTA
    // ────────────────────────────────────────────────────────
    // Abre el modal de confirmación (reemplaza al confirm() nativo)
    confirmarEliminar(comentario) {
      this.comentarioAEliminar = comentario;
      this.modalEliminarAbierto = true;
    },

    cerrarEliminar() {
      this.modalEliminarAbierto = false;
      setTimeout(() => {
        this.comentarioAEliminar = null;
      }, 200);
    },

    async eliminarComentario() {
      if (!this.comentarioAEliminar || this.eliminando) return;

      try {
        this.eliminando = true;
        const comentario = this.comentarioAEliminar;

        await api.delete(`${CONFIG.ENDPOINTS.COMENTARIOS}/${comentario.id}`);

        if (comentario.comentarioPadreId) {
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
          this.comentariosArbol = this.comentariosArbol.filter(
            c => c.id !== comentario.id
          );
        }

        this.totalComentarios = Math.max(0, this.totalComentarios - 1);
        this.cerrarEliminar();
        this._toast('Comentario eliminado', 'info');

      } catch (err) {
        console.error('[POST] Error eliminando comentario:', err);
        this._toast(err.message || 'No se pudo eliminar el comentario', 'error');
      } finally {
        this.eliminando = false;
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
    esPropio(comentario) {
      if (!this.usuarioActual || !comentario.autor) return false;
      console.log('[PROPIO] autor.id:', comentario.autor.id, 'tipo:', typeof comentario.autor.id);
      console.log('[PROPIO] usuarioActual.id:', this.usuarioActual.id, 'tipo:', typeof this.usuarioActual.id);
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