/**
 * comentarios-mixin.js — Lógica compartida de comentarios
 *
 * ¿Qué es un "mixin" aquí?
 * ─────────────────────────
 * Es una función que regresa un pedazo de objeto (estado + métodos)
 * listo para "mezclarse" dentro de un Alpine.data() con el operador
 * spread (...). Piensa en él como una receta de cocina escrita en
 * una tarjeta: cualquier cocina (feedApp, postApp) puede usarla,
 * cada quien con sus propios ingredientes extra alrededor.
 *
 * CÓMO SE USA:
 *
 *   Alpine.data('feedApp', () => ({
 *     ...ComentariosMixin(),   // ← aquí se mezcla la receta
 *     posts: [],
 *     // ...el resto de feedApp
 *   }));
 *
 * REQUISITOS para quien use este mixin:
 * - Debe tener `this.user` o `this.usuarioActual` con el usuario logueado
 *   (el mixin revisa ambos nombres, para no forzarte a renombrar eso).
 * - Si quiere reaccionar cuando se crea/elimina un comentario (por
 *   ejemplo, para actualizar un contador en otro lado, como
 *   post.comentarios_count en el feed), puede definir un método
 *   opcional `_onCambioComentarios(delta)` — el mixin lo llama con
 *   +1 al crear y -1 al eliminar, si existe.
 *
 * ESTADO que aporta este mixin (nivel superior del componente):
 *   comentarios          → array de comentarios principales (con sus respuestas anidadas)
 *   totalComentarios      → contador total
 *   loadingComentarios    → true mientras se carga la primera página
 *   loadingMasComentarios → true mientras se carga "cargar más"
 *   hayMasComentarios     → si hay más páginas
 *   paginaComentarios     → página actual (para paginación)
 *   comentarioEditando    → el comentario que se está editando ahora mismo (o null)
 *   textoEditando         → el texto que se está escribiendo en la edición
 *   enviandoComentario    → true mientras se publica un comentario/respuesta
 *   enviandoEdicion       → true mientras se guarda una edición
 */
function ComentariosMixin() {
  return {
 
    // ── Estado ────────────────────────────────────────────────
    comentarios: [],
    totalComentarios: 0,
    loadingComentarios: false,
    loadingMasComentarios: false,
    hayMasComentarios: false,
    paginaComentarios: 0,
    comentarioEditando: null,
    textoEditando: '',
    enviandoComentario: false,
    enviandoEdicion: false,
 
    // ────────────────────────────────────────────────────────
    // CARGAR COMENTARIOS PRINCIPALES (primera página)
    // ────────────────────────────────────────────────────────
    async cargarComentarios(postId, { tamano = 20 } = {}) {
      this.loadingComentarios = true;
      this.paginaComentarios = 0;
      try {
        const res = await api.get(
          `${CONFIG.ENDPOINTS.COMENTARIOS}/post/${postId}/principales?pagina=0&tamano=${tamano}&_t=${Date.now()}`
        );
        const contenido = res.contenido || res.content || [];
        this.comentarios = contenido.map(c => this._prepararComentario(c));
        this.totalComentarios = res.totalElementos ?? res.totalElements ?? contenido.length;
        this.hayMasComentarios = !(res.esUltimaPagina ?? res.last ?? true);
      } catch (err) {
        console.error('[COMENTARIOS] Error cargando:', err);
        this.comentarios = [];
      } finally {
        this.loadingComentarios = false;
      }
    },
 
    // ────────────────────────────────────────────────────────
    // CARGAR MÁS COMENTARIOS (paginación — "Cargar más")
    // ────────────────────────────────────────────────────────
    async cargarMasComentarios(postId, tamano = 10) {
      if (this.loadingMasComentarios || !this.hayMasComentarios) return;
      this.loadingMasComentarios = true;
      this.paginaComentarios++;
      try {
        const res = await api.get(
          `${CONFIG.ENDPOINTS.COMENTARIOS}/post/${postId}/principales?pagina=${this.paginaComentarios}&tamano=${tamano}&_t=${Date.now()}`
        );
        const contenido = res.contenido || res.content || [];
        this.comentarios = [...this.comentarios, ...contenido.map(c => this._prepararComentario(c))];
        this.hayMasComentarios = !(res.esUltimaPagina ?? res.last ?? true);
      } catch (err) {
        console.error('[COMENTARIOS] Error cargando más:', err);
        this._toastComentarios('No se pudieron cargar más comentarios', 'error');
      } finally {
        this.loadingMasComentarios = false;
      }
    },
 
    // ────────────────────────────────────────────────────────
    // Prepara un comentario recién llegado del backend, agregando
    // las "banderas" de lazy load (igual que etiquetar un cajón
    // como "cerrado, sin abrir todavía").
    // ────────────────────────────────────────────────────────
    _prepararComentario(c) {
      return {
        ...c,
        respuestasCount: c.totalRespuestas ?? c.respuestasCount ?? 0,
        respuestas: [],
        _respuestasCargadas: false,
        _cargandoRespuestas: false,
        _menuAbierto: false,
      };
    },
 
    // ────────────────────────────────────────────────────────
    // CARGAR RESPUESTAS DE UN COMENTARIO (lazy load, bajo demanda)
    // ────────────────────────────────────────────────────────
    async cargarRespuestas(comentario) {
      if (comentario._cargandoRespuestas || comentario._respuestasCargadas) return;
      comentario._cargandoRespuestas = true;
      try {
        const res = await api.get(
          `${CONFIG.ENDPOINTS.COMENTARIOS}/${comentario.id}/respuestas?pagina=0&tamano=50&_t=${Date.now()}`
        );
        const respuestas = res.contenido || res.content || res || [];
        comentario.respuestas = respuestas.map(r => ({ ...r, _menuAbierto: false }));
        comentario._respuestasCargadas = true;
      } catch (err) {
        console.error('[COMENTARIOS] Error cargando respuestas:', err);
        this._toastComentarios('No se pudieron cargar las respuestas', 'error');
      } finally {
        comentario._cargandoRespuestas = false;
      }
    },
 
    // ────────────────────────────────────────────────────────
    // ENVIAR COMENTARIO NUEVO O RESPUESTA
    //
    // comentarioPadreId en null = comentario principal (nivel 1)
    // comentarioPadreId con valor = respuesta (nivel 2)
    // ────────────────────────────────────────────────────────
    async enviarComentario(postId, contenido, comentarioPadreId = null) {
      const texto = (contenido ?? '').trim();
      if (!texto || this.enviandoComentario) return null;
 
      try {
        this.enviandoComentario = true;
        const creado = await api.post(CONFIG.ENDPOINTS.COMENTARIOS, {
          contenido: texto,
          postId,
          comentarioPadreId,
        });
 
        if (comentarioPadreId) {
          // Es una respuesta: se agrega al array de respuestas de su padre
          const idx = this.comentarios.findIndex(c => c.id === comentarioPadreId);
          if (idx !== -1) {
            const padre = this.comentarios[idx];
            this.comentarios[idx] = {
              ...padre,
              respuestas: [...(padre.respuestas || []), { ...creado, _menuAbierto: false }],
              respuestasCount: (padre.respuestasCount || 0) + 1,
            };
          }
        } else {
          // Es un comentario principal: se agrega al inicio de la lista
          const nuevo = this._prepararComentario(creado);
          nuevo._respuestasCargadas = true; // recién creado, no tiene nada que cargar
          this.comentarios = [nuevo, ...this.comentarios];
        }
 
        this.totalComentarios++;
        this._onCambioComentarios?.(1);
        this._toastComentarios(
          comentarioPadreId ? 'Respuesta publicada ↩' : 'Comentario publicado 💬',
          'success'
        );
        return creado;
      } catch (err) {
        this._toastComentarios(err.message || 'No se pudo publicar el comentario', 'error');
        return null;
      } finally {
        this.enviandoComentario = false;
      }
    },
 
    // ────────────────────────────────────────────────────────
    // EDICIÓN INLINE
    // ────────────────────────────────────────────────────────
    editarComentario(comentario) {
      this.comentarioEditando = comentario;
      this.textoEditando = comentario.contenido;
    },
 
    cancelarEdicion() {
      this.comentarioEditando = null;
      this.textoEditando = '';
    },
 
    async guardarEdicion() {
      const comentario = this.comentarioEditando;
      if (!comentario || !this.textoEditando.trim()) return;
 
      if (this.textoEditando.trim() === comentario.contenido) {
        this.cancelarEdicion();
        return;
      }
 
      try {
        this.enviandoEdicion = true;
        const actualizado = await api.put(
          `${CONFIG.ENDPOINTS.COMENTARIOS}/${comentario.id}`,
          { contenido: this.textoEditando.trim() }
        );
 
        if (comentario.comentarioPadreId) {
          // Es una respuesta: buscar al padre y actualizar la respuesta adentro
          const idxPadre = this.comentarios.findIndex(c => c.id === comentario.comentarioPadreId);
          if (idxPadre !== -1) {
            const padre = this.comentarios[idxPadre];
            this.comentarios[idxPadre] = {
              ...padre,
              respuestas: padre.respuestas.map(r =>
                r.id === comentario.id ? { ...r, contenido: actualizado.contenido } : r
              ),
            };
          }
        } else {
          // Es un comentario principal
          const idx = this.comentarios.findIndex(c => c.id === comentario.id);
          if (idx !== -1) {
            this.comentarios[idx] = { ...this.comentarios[idx], contenido: actualizado.contenido };
          }
        }
 
        this.cancelarEdicion();
        this._toastComentarios('Comentario actualizado ✏️', 'success');
      } catch (err) {
        this._toastComentarios('No se pudo editar el comentario', 'error');
      } finally {
        this.enviandoEdicion = false;
      }
    },
 
    // ────────────────────────────────────────────────────────
    // ELIMINAR COMENTARIO O RESPUESTA
    // ────────────────────────────────────────────────────────
    async eliminarComentario(comentario) {
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
 
        if (comentario.comentarioPadreId) {
          // Es una respuesta: quitarla del array de su padre
          const idxPadre = this.comentarios.findIndex(c => c.id === comentario.comentarioPadreId);
          if (idxPadre !== -1) {
            const padre = this.comentarios[idxPadre];
            this.comentarios[idxPadre] = {
              ...padre,
              respuestas: padre.respuestas.filter(r => r.id !== comentario.id),
              respuestasCount: Math.max(0, (padre.respuestasCount || 1) - 1),
            };
          }
        } else {
          // Es un comentario principal: quitarlo de la lista
          this.comentarios = this.comentarios.filter(c => c.id !== comentario.id);
        }
 
        this.totalComentarios = Math.max(0, this.totalComentarios - 1);
        this._onCambioComentarios?.(-1);
        this._toastComentarios('Comentario eliminado', 'info');
      } catch (err) {
        this._toastComentarios('No se pudo eliminar el comentario', 'error');
      }
    },
 
    // ────────────────────────────────────────────────────────
    // ¿Es este comentario del usuario logueado?
    // Revisa this.user (nombre usado en feedApp) o this.usuarioActual
    // (nombre usado en postApp), lo que exista.
    // ────────────────────────────────────────────────────────
    esPropio(comentario) {
      const usuario = this.user ?? this.usuarioActual;
      if (!usuario || !comentario?.autor) return false;
      return comentario.autor.id?.toString() === usuario.id?.toString();
    },
 
    // ────────────────────────────────────────────────────────
    _toastComentarios(mensaje, tipo = 'info') {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: mensaje, type: tipo } }));
    },
  };
}
 