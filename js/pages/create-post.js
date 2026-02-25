/**
 * Lógica de la página Crear Post
 */

document.addEventListener('alpine:init', () => {
  
  Alpine.data('createPost', () => ({
    // Formulario
    form: {
      titulo: '',
      contenido: '',
      categoria_id: ''
    },
    
    // Estado
    imagen: null,
    imagePreview: null,
    categorias: [],
    isLoading: false,

    // Computed
    get canSubmit() {
      return this.form.titulo.trim().length > 0 && !this.isLoading;
    },

    // Inicialización
    async init() {
      // Verificar autenticación
      const token = localStorage.getItem(CONFIG.STORAGE.TOKEN);
      if (!token) {
        window.location.href = 'index.html';
        return;
      }
      
      // Cargar categorías
      try {
        this.categorias = await api.get(CONFIG.ENDPOINTS.CATEGORIAS);
      } catch (err) {
        console.error('Error cargando categorías:', err);
        this.showToast('Error al cargar categorías', 'error');
      }
    },

    // Manejar selección de imagen
    handleImageSelect(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      // Validar tamaño (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        this.showToast('La imagen debe ser menor a 5MB', 'error');
        event.target.value = '';
        return;
      }
      
      // Validar tipo
      if (!file.type.startsWith('image/')) {
        this.showToast('El archivo debe ser una imagen', 'error');
        event.target.value = '';
        return;
      }
      
      this.imagen = file;
      
      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    // Eliminar imagen seleccionada
    removeImage() {
      this.imagen = null;
      this.imagePreview = null;
      // Resetear input file
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
    },

    // Enviar post
    async submitPost() {
      if (!this.canSubmit) return;
      
      this.isLoading = true;
      
      try {
        const formData = new FormData();
        formData.append('titulo', this.form.titulo.trim());
        
        if (this.form.contenido.trim()) {
          formData.append('contenido', this.form.contenido.trim());
        }
        
        if (this.form.categoria_id) {
          formData.append('categoria_id', this.form.categoria_id);
        }
        
        if (this.imagen) {
          formData.append('imagen', this.imagen);
        }
        
        await api.postFormData(CONFIG.ENDPOINTS.POSTS, formData);
        
        this.showToast('¡Publicación creada! 🎣', 'success');
        
        // Redirigir al feed después de 1 segundo
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

    // Toast helper
    showToast(message, type = 'info') {
      window.dispatchEvent(new CustomEvent('toast', { 
        detail: { message, type } 
      }));
    }
  }));

});