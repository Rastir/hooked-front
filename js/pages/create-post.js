/**
 * Lógica de la página Crear Post - CON CLOUDINARY
 */

document.addEventListener('alpine:init', () => {
  
  Alpine.data('createPost', () => ({
    // Formulario
    form: {
      titulo: '',
      contenido: '',
      categoriaId: '' // ← CAMBIO: camelCase en lugar de categoria_id
    },
    
    // Estado
    imagen: null,
    imagePreview: null,
    categorias: [],
    isLoading: false,
    uploadingImage: false,
    fotoLink: '',

    // Computed
    get canSubmit() {
      // ← CAMBIO: Validaciones del backend
      const tituloValido = this.form.titulo.trim().length > 0;
      const contenidoValido = this.form.contenido.trim().length >= 10; // Mínimo 10 caracteres
      const categoriaValida = this.form.categoriaId !== ''; // No puede estar vacío
      
      return tituloValido && contenidoValido && categoriaValida && !this.isLoading && !this.uploadingImage;
    },

    // Inicialización
    async init() {
      const token = localStorage.getItem(CONFIG.STORAGE.TOKEN);
      if (!token) {
        window.location.href = 'index.html';
        return;
      }
      
      try {
        this.categorias = await api.get(CONFIG.ENDPOINTS.CATEGORIAS);
      } catch (err) {
        console.error('Error cargando categorías:', err);
        this.showToast('Error al cargar categorías', 'error');
      }
    },

    handleImageSelect(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      if (file.size > 5 * 1024 * 1024) {
        this.showToast('La imagen debe ser menor a 5MB', 'error');
        event.target.value = '';
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        this.showToast('El archivo debe ser una imagen', 'error');
        event.target.value = '';
        return;
      }
      
      this.imagen = file;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    removeImage() {
      this.imagen = null;
      this.imagePreview = null;
      this.fotoLink = '';
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
    },

    async uploadToCloudinary() {
      if (!this.imagen) return null;
      
      this.uploadingImage = true;
      console.log('[CREATE] Subiendo imagen a Cloudinary...');
      
      const formData = new FormData();
      formData.append('file', this.imagen);
      formData.append('upload_preset', CONFIG.CLOUDINARY.UPLOAD_PRESET);
      formData.append('folder', 'hooked_posts');
      
      try {
        const response = await fetch(
          `${CONFIG.CLOUDINARY.API_URL}/${CONFIG.CLOUDINARY.CLOUD_NAME}/image/upload`,
          {
            method: 'POST',
            body: formData
          }
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('[CREATE] Error Cloudinary:', errorData);
          throw new Error(errorData.error?.message || 'Error subiendo imagen');
        }
        
        const data = await response.json();
        console.log('[CREATE] Imagen subida exitosamente:', data.secure_url);
        
        return data.secure_url;
        
      } catch (err) {
        console.error('[CREATE] Error subiendo a Cloudinary:', err);
        throw new Error('No se pudo subir la imagen. Intenta de nuevo.');
      } finally {
        this.uploadingImage = false;
      }
    },

    async submitPost() {
      if (!this.canSubmit) {
        // ← NUEVO: Mostrar qué falta
        if (this.form.contenido.trim().length < 10) {
          this.showToast('La descripción debe tener al menos 10 caracteres', 'error');
        } else if (!this.form.categoriaId) {
          this.showToast('Debes seleccionar una categoría', 'error');
        }
        return;
      }
      
      this.isLoading = true;
      
      try {
        if (this.imagen) {
          this.fotoLink = await this.uploadToCloudinary();
        }
        
        // ← CAMBIO: Payload con camelCase exacto como espera el backend
        const postData = {
          titulo: this.form.titulo.trim(),
          contenido: this.form.contenido.trim(),
          categoriaId: parseInt(this.form.categoriaId), // ← camelCase y como número
          fotoLink: this.fotoLink || null // ← camelCase (fotoLink, no foto_link)
        };
        
        console.log('[CREATE] Enviando post al backend:', postData);
        
        await api.post(CONFIG.ENDPOINTS.POSTS, postData);
        
        this.showToast('¡Publicación creada! 🎣', 'success');
        
        setTimeout(() => {
          window.location.href = 'feed.html';
        }, 1000);
        
      } catch (err) {
        console.error('Error creando post:', err);
        this.showToast(err.message || 'Error al crear publicación', 'error');
      } finally {
        this.isLoading = false;
      }
    },

    showToast(message, type = 'info') {
      window.dispatchEvent(new CustomEvent('toast', { 
        detail: { message, type } 
      }));
    }
  }));

});