/**
 * perfil.js — Componente Alpine para la página de perfil
 *
 * ¿Cómo detecta si es perfil propio o ajeno?
 * ---------------------------------------------
 * Funciona como cuando vas a ver una foto en Instagram:
 * - La URL trae el id del usuario a ver:  perfil.html?id=42
 * - Si NO hay id en la URL, asume que quieres ver TU propio perfil
 * - Si hay id pero es el TUYO, igual lo trata como perfil propio
 * - Si es un id DIFERENTE al tuyo, muestra el perfil ajeno
 */

function perfilApp() {
  return {
    // ── Estado general ──────────────────────────────────────
    loading: true,
    error: null,
    usuario: null,
    esPropioUsuario: false,

    // ── Posts ───────────────────────────────────────────────
    posts: [],
    loadingPosts: false,
    loadingMore: false,
    hayMasPosts: false,
    paginaActual: 0,
    TAMANO_PAGINA: 8,

    // ── Tabs ────────────────────────────────────────────────
    tabActivo: 'posts',

    // ── Capturas especiales y récords ───────────────────────
    topCapturas: [],   // Posts con imagen ordenados por likes
    records: [],       // Récords por especie (calculados del backend)

    // ── Seguir ──────────────────────────────────────────────
    siguiendo: false,

    // ── Modal edición ───────────────────────────────────────
    modalEdicion: false,
    guardando: false,
    editForm: {
      nombre: '',
      ubicacion: '',
      biografia: '',
      fotoPerfil: '',
      tagsRaw: '',   // tags como texto "trucha, mar, mosca"
    },

    // ────────────────────────────────────────────────────────
    // INIT — punto de entrada, lo primero que corre Alpine
    // ────────────────────────────────────────────────────────
    async init() {
      // 1. Verificar que el usuario esté logueado
      //    auth.js expone checkAuth() globalmente
      if (typeof checkAuth === 'function') {
        checkAuth(); // redirige a index.html si no hay sesión
      }

      // 2. Leer el ?id= de la URL
      //    Ejemplo: perfil.html?id=42  → idObjetivo = 42
      //             perfil.html        → idObjetivo = null (mi perfil)
      const params = new URLSearchParams(window.location.search);
      const idObjetivo = params.get('id');

      // 3. Obtener el usuario logueado desde localStorage
      const usuarioLogueado = this._getUsuarioLogueado();

      if (!usuarioLogueado) {
        this.error = 'No se encontró sesión activa.';
        this.loading = false;
        return;
      }

      // 4. Decidir qué perfil cargar
      //
      // El problema: el localStorage solo guarda { email, nombre }
      // no guarda el id numérico. Entonces no podemos comparar ids.
      //
      // Solución:
      // - Sin ?id= en la URL → es MI perfil → usamos el endpoint
      //   GET /api/usuarios/perfil-por-email?email=... para obtenerlo
      // - Con ?id=42 → es perfil ajeno → usamos GET /api/usuarios/42
      //
      // Para saber si el perfil ajeno es en realidad el nuestro,
      // comparamos el email que devuelve la API con el del localStorage.

      if (!idObjetivo) {
        // Mi propio perfil: cargamos por email
        this.esPropioUsuario = true;
        await this._cargarPerfilPropio(usuarioLogueado.email);
      } else {
        // Perfil de otro usuario por id numérico
        const idACargar = parseInt(idObjetivo);
        await this._cargarPerfil(idACargar);
        // Después de cargar, verificamos si coincide con nuestro email
        if (this.usuario && this.usuario.email === usuarioLogueado.email) {
          this.esPropioUsuario = true;
        }
      }
    },

    // ────────────────────────────────────────────────────────
    // CARGAR PERFIL PROPIO (sin id, usando el token JWT)
    // Usa GET /api/usuarios/yo — el backend lo identifica
    // por el token, no necesita id en la URL.
    // ────────────────────────────────────────────────────────
    async _cargarPerfilPropio(email) {
      try {
        this.loading = true;
        this.error = null;

        // GET /api/usuarios/yo → devuelve el perfil del usuario logueado
        // El backend lo saca del JWT, no del id de la URL
        const data = await api.get(`${CONFIG.ENDPOINTS.USUARIOS}/perfil?_t=${Date.now()}`);
        this.usuario = data;

        // Posts propios: usamos /mis-posts que también usa el JWT
        await this._cargarMisPosts();
        this._calcularRecords();
        this._calcularTopCapturas();

      } catch (err) {
        console.error('Error cargando perfil propio:', err);
        // Si /yo no existe en el backend, intentamos buscar por email
        try {
          const data = await api.get(
            `${CONFIG.ENDPOINTS.USUARIOS}/buscar?email=${encodeURIComponent(email)}`
          );
          this.usuario = data;
          await this._cargarPosts(data.id);
          this._calcularRecords();
          this._calcularTopCapturas();
        } catch (err2) {
          this.error = 'No se pudo cargar tu perfil. Intenta de nuevo.';
        }
      } finally {
        this.loading = false;
      }
    },

    // ────────────────────────────────────────────────────────
    // CARGAR PERFIL AJENO desde la API
    // ────────────────────────────────────────────────────────
    async _cargarPerfil(idUsuario) {
      try {
        this.loading = true;
        this.error = null;

        // GET /api/usuarios/{id}
        const data = await api.get(
          `${CONFIG.ENDPOINTS.USUARIOS}/${idUsuario}`
        );
        this.usuario = data;

        await this._cargarPosts(idUsuario);
        this._calcularRecords();
        this._calcularTopCapturas();

      } catch (err) {
        console.error('Error cargando perfil:', err);
        this.error = err.message || 'Error al cargar el perfil.';
      } finally {
        this.loading = false;
      }
    },

    // ────────────────────────────────────────────────────────
    // CARGAR MIS POSTS (perfil propio)
    // Usa GET /api/posts/mis-posts — el backend los filtra
    // por el usuario del JWT, no necesita id.
    // ────────────────────────────────────────────────────────
    async _cargarMisPosts() {
      try {
        this.loadingPosts = true;
        this.paginaActual = 0;

        // Este endpoint devuelve List<PostResponse> sin paginar
        const respuesta = await api.get(`${CONFIG.ENDPOINTS.POSTS}/mis-posts?_t=${Date.now()}`);

        // /mis-posts devuelve un array directo, no PaginatedResponse
        this.posts = Array.isArray(respuesta) ? respuesta : [];
        this.hayMasPosts = false; // sin paginación por ahora

      } catch (err) {
        console.error('Error cargando mis posts:', err);
        this.posts = [];
      } finally {
        this.loadingPosts = false;
      }
    },

    // ────────────────────────────────────────────────────────
    // CARGAR POSTS de un usuario ajeno (por id)
    // Usa GET /api/posts/usuario/{id} — el endpoint correcto
    // ────────────────────────────────────────────────────────
    async _cargarPosts(idUsuario) {
      try {
        this.loadingPosts = true;
        this.paginaActual = 0;

        // GET /api/posts/usuario/{id}?pagina=0&tamano=8
        const respuesta = await api.get(
          `${CONFIG.ENDPOINTS.POSTS}/usuario/${idUsuario}?pagina=0&tamano=${this.TAMANO_PAGINA}&_t=${Date.now()}`
        );

        this.posts = respuesta.contenido || respuesta.content || [];
        this.hayMasPosts = !respuesta.ultima && !respuesta.last;

      } catch (err) {
        console.error('Error cargando posts:', err);
        this.posts = [];
      } finally {
        this.loadingPosts = false;
      }
    },

    // ────────────────────────────────────────────────────────
    // CARGAR MÁS POSTS (paginación — solo perfil ajeno)
    // ────────────────────────────────────────────────────────
    async cargarMasPosts() {
      if (this.loadingMore || !this.hayMasPosts) return;

      try {
        this.loadingMore = true;
        this.paginaActual++;

        const idUsuario = this.usuario.id;
        const respuesta = await api.get(
          `${CONFIG.ENDPOINTS.POSTS}/usuario/${idUsuario}?pagina=${this.paginaActual}&tamano=${this.TAMANO_PAGINA}&_t=${Date.now()}`
        );

        const nuevos = respuesta.contenido || respuesta.content || [];
        this.posts = [...this.posts, ...nuevos];
        this.hayMasPosts = !respuesta.ultima && !respuesta.last;

      } catch (err) {
        console.error('Error cargando más posts:', err);
      } finally {
        this.loadingMore = false;
      }
    },

    // ────────────────────────────────────────────────────────
    // CALCULAR TOP CAPTURAS
    // Son los posts que tienen foto, ordenados por likeCount
    // ────────────────────────────────────────────────────────
    _calcularTopCapturas() {
      this.topCapturas = [...this.posts]
        .filter(p => p.fotoLink)
        .sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
        .slice(0, 12); // máximo 12 en el grid
    },

    // ────────────────────────────────────────────────────────
    // CALCULAR RÉCORDS
    // El backend no tiene endpoint de récords por especie todavía,
    // así que lo calculamos en el frontend a partir de los posts.
    // Buscamos patrones como "Trucha: 2.3kg" en el título/contenido.
    // ────────────────────────────────────────────────────────
    _calcularRecords() {
      // Regex que busca patrones tipo "trucha 2.3 kg" o "robalo: 5kg"
      const regex = /([a-záéíóúñ]+)[:\s]+(\d+(?:\.\d+)?)\s*kg/gi;
      const mapa = {}; // { especie: { pesoMaximo, fechaMejorCaptura } }

      for (const post of this.posts) {
        const texto = `${post.titulo || ''} ${post.contenido || ''}`;
        let match;

        while ((match = regex.exec(texto)) !== null) {
          const especie = this._capitalizar(match[1]);
          const peso = parseFloat(match[2]);

          if (!mapa[especie] || peso > mapa[especie].pesoMaximo) {
            mapa[especie] = {
              especie,
              pesoMaximo: peso,
              fechaMejorCaptura: post.fechaCreacion,
            };
          }
        }
      }

      // Ordenar por peso descendente y tomar top 5
      this.records = Object.values(mapa)
        .sort((a, b) => b.pesoMaximo - a.pesoMaximo)
        .slice(0, 5);
    },

    // ────────────────────────────────────────────────────────
    // TOGGLE LIKE en posts del perfil
    // Igual que en feed.js: Optimistic UI primero, luego API
    // ────────────────────────────────────────────────────────
    async toggleLike(post) {
      // Optimistic UI: actualizamos visualmente antes de esperar al servidor
      // Es como cuando le das un pulgar arriba en Instagram — la UI responde
      // de inmediato aunque el servidor tarde un poco
      const antesLiked = post.likedByCurrentUser;
      const antesCount = post.likeCount || 0;

      post.likedByCurrentUser = !antesLiked;
      post.likeCount = antesLiked ? antesCount - 1 : antesCount + 1;

      try {
        const resp = await api.post(
          `${CONFIG.ENDPOINTS.POSTS}/${post.id}/like`
        );
        // Sincronizamos con lo que devuelve el servidor
        post.likedByCurrentUser = resp.likedByCurrentUser;
        post.likeCount = resp.likeCount;
      } catch (err) {
        // Si falla, revertimos el cambio visual
        post.likedByCurrentUser = antesLiked;
        post.likeCount = antesCount;
        this._toast('No se pudo registrar el like', 'error');
      }
    },

    // ────────────────────────────────────────────────────────
    // COMPARTIR post (igual que en feed.js)
    // ────────────────────────────────────────────────────────
    async compartir(post) {
      const url = `${window.location.origin}/post.html?id=${post.id}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: post.titulo, url });
        } catch { /* usuario canceló */ }
      } else {
        await navigator.clipboard.writeText(url);
        this._toast('¡Enlace copiado al portapapeles! 🔗', 'success');
      }
    },

    // ────────────────────────────────────────────────────────
    // TOGGLE SEGUIR (perfil ajeno)
    // Por ahora hace toggle local. Cuando el backend tenga
    // un endpoint de "seguir", se conecta aquí.
    // ────────────────────────────────────────────────────────
    async toggleSeguir() {
      this.siguiendo = !this.siguiendo;
      // TODO: conectar con POST /api/usuarios/{id}/seguir
      // cuando el backend lo implemente
      const msg = this.siguiendo
        ? `Ahora sigues a ${this.usuario.nombre} 🎣`
        : `Dejaste de seguir a ${this.usuario.nombre}`;
      this._toast(msg, this.siguiendo ? 'success' : 'info');
    },

    // ────────────────────────────────────────────────────────
    // MODAL EDITAR PERFIL
    // ────────────────────────────────────────────────────────
    abrirEdicion() {
      // Pre-llenamos el formulario con los datos actuales
      this.editForm = {
        nombre: this.usuario.nombre || '',
        ubicacion: this.usuario.ubicacionPreferida || '',
        biografia: this.usuario.bio || '',
        fotoPerfil: this.usuario.fotoPerfil || '',
        tagsRaw: (this.usuario.tags || []).join(', '),
      };
      this.modalEdicion = true;
    },

    cerrarEdicion() {
      this.modalEdicion = false;
    },

    // Preview de foto nueva antes de subir
    onFotoChange(event) {
      const archivo = event.target.files[0];
      if (!archivo) return;

      if (archivo.size > 5 * 1024 * 1024) {
        this._toast('La imagen no puede pesar más de 5MB', 'error');
        return;
      }

      // Mostramos preview local inmediato
      const reader = new FileReader();
      reader.onload = (e) => { this.editForm.fotoPerfil = e.target.result; };
      reader.readAsDataURL(archivo);

      // Guardamos el archivo para subir luego
      this._archivoFoto = archivo;
    },

    async guardarPerfil() {
      if (this.guardando) return;

      try {
        this.guardando = true;

        // Si hay foto nueva, la subimos primero a Cloudinary
        let fotoUrl = this.editForm.fotoPerfil;
        if (this._archivoFoto) {
          fotoUrl = await this._subirFotoCloudinary(this._archivoFoto);
          this._archivoFoto = null;
        }

        // Construimos el body para PUT /api/usuarios/{id}
        const fotoOriginal = this.usuario.fotoPerfil || '';
        const body = {
          nombre: this.editForm.nombre,
          ubicacionPreferida: this.editForm.ubicacion,
          bio: this.editForm.biografia,
          tags: this.editForm.tagsRaw
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0),
          ...(fotoUrl !== fotoOriginal && fotoUrl ? { fotoPerfil: fotoUrl } : {})
        };

        const actualizado = await api.put(
          `${CONFIG.ENDPOINTS.USUARIOS}/perfil`,
          body
        );

        // Actualizamos el estado local con la respuesta del servidor
        this.usuario = { ...this.usuario, ...actualizado };

        // Actualizamos también el localStorage para que el header
        // y otros componentes vean el nombre/foto nuevos
        const usuarioLogueado = this._getUsuarioLogueado();
        if (usuarioLogueado) {
          localStorage.setItem(
            CONFIG.STORAGE.USER,
            JSON.stringify({ ...usuarioLogueado, ...actualizado })
          );
        }

        this.cerrarEdicion();
        this._toast('Perfil actualizado ✅', 'success');

      } catch (err) {
        console.error('Error guardando perfil:', err);
        this._toast(err.message || 'No se pudo guardar el perfil', 'error');
      } finally {
        this.guardando = false;
      }
    },

    // ────────────────────────────────────────────────────────
    // SUBIR FOTO A CLOUDINARY (igual que en create-post.js)
    // ────────────────────────────────────────────────────────
    async _subirFotoCloudinary(archivo) {
      const formData = new FormData();
      formData.append('file', archivo);
      formData.append('upload_preset', CONFIG.CLOUDINARY.UPLOAD_PRESET);

      const resp = await fetch(
        `https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY.CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );

      if (!resp.ok) throw new Error('Error al subir la imagen');
      const data = await resp.json();
      return data.secure_url;
    },

    // ────────────────────────────────────────────────────────
    // UTILIDADES
    // ────────────────────────────────────────────────────────

    // Leer usuario logueado desde localStorage
    _getUsuarioLogueado() {
      try {
        const raw = localStorage.getItem(CONFIG.STORAGE.USER);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },

    // Clase CSS según el nivel del pescador
    nivelClass(nivel) {
      if (!nivel) return 'principiante';
      return nivel.toLowerCase();
    },

    // Cuántos días lleva conectado el pelado
    diasActivo() {
      return this.usuario?.rachaActual || 0;
    },

    // Formato de número: 1200 → "1.2k"
    formatNum(num) {
      if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
      if (num >= 1_000) return (num / 1_000).toFixed(1) + 'k';
      return String(num);
    },

    // Formato de fecha relativa: "Hace 2 horas", "3 días"
    formatFecha(fechaISO) {
      if (!fechaISO) return '';
      const fecha = new Date(fechaISO);
      const ahora = new Date();
      const diff = Math.floor((ahora - fecha) / 1000); // en segundos

      if (diff < 60) return 'Hace un momento';
      if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
      if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
      if (diff < 2592000) return `Hace ${Math.floor(diff / 86400)} días`;

      return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
    },

    // Truncar texto largo
    truncar(texto, max) {
      if (!texto) return '';
      return texto.length > max ? texto.slice(0, max) + '…' : texto;
    },

    // Capitalizar primera letra
    _capitalizar(str) {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    // Emitir toast igual que en el resto del proyecto
    _toast(mensaje, tipo = 'info') {
      window.dispatchEvent(new CustomEvent('toast', {
        detail: { mensaje, tipo }
      }));
    },

    // Logout — delega a auth.js
    logout() {
      if (typeof logout === 'function') {
        logout();
      } else {
        localStorage.clear();
        window.location.href = 'index.html';
      }
    },
  };
}
