// ================ ELEMENTOS DOM ================
const views = {
  posts: document.getElementById('posts-view'),
  auth: document.getElementById('auth-view'),
  createPost: document.getElementById('create-post-view')
};

const postsContainer = document.getElementById('posts-container');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const btnCreatePost = document.getElementById('btn-create-post');
const btnPosts = document.getElementById('btn-posts');
const userInfo = document.getElementById('user-info');

// Elementos de formularios
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubmit = document.getElementById('auth-submit');
const authMsg = document.getElementById('auth-msg');
const authToggleText = document.getElementById('auth-toggle-text');
const authToggleLink = document.getElementById('auth-toggle-link');
const nombreInput = document.getElementById('nombre');

const createPostForm = document.getElementById('create-post-form');
const createPostMsg = document.getElementById('create-post-msg');
const cancelPostBtn = document.getElementById('cancel-post');

// Estado de la aplicación
let lastPosts = [];
let userLikes = new Set();
let isLoginMode = true;

// ================ SISTEMA DE NAVEGACIÓN ================
function showView(viewName) {
  Object.values(views).forEach(view => view.style.display = 'none');
  views[viewName].style.display = 'block';
}

function renderNavbar() {
  if (isAuthenticated()) {
    btnLogin.style.display = "none";
    btnLogout.style.display = "inline";
    btnCreatePost.style.display = "inline";
    userInfo.textContent = localStorage.getItem("user_nombre") || "usuario";
  } else {
    btnLogin.style.display = "inline";
    btnLogout.style.display = "none";
    btnCreatePost.style.display = "none";
    userInfo.textContent = "";
  }
}

// ================ FUNCIONES DE AUTENTICACIÓN ================
function showAuthForm(loginMode = true) {
  isLoginMode = loginMode;
  
  if (loginMode) {
    authTitle.textContent = "Login";
    authSubmit.textContent = "Ingresar";
    nombreInput.style.display = "none";
    nombreInput.required = false;
    authToggleText.textContent = "¿No tienes cuenta?";
    authToggleLink.textContent = "Crear una";
  } else {
    authTitle.textContent = "Registro";
    authSubmit.textContent = "Crear cuenta";
    nombreInput.style.display = "block";
    nombreInput.required = true;
    authToggleText.textContent = "¿Ya tienes cuenta?";
    authToggleLink.textContent = "Login";
  }
  
  // Limpiar formulario y mensajes
  authForm.reset();
  authMsg.textContent = "";
  
  showView('auth');
}

function handleAuth(e) {
  e.preventDefault();
  
  const nombre = nombreInput.value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  
  authMsg.textContent = "";
  
  const authPromise = isLoginMode 
    ? login(email, password)
    : register(nombre, email, password);
  
  authPromise
    .then(() => {
      renderNavbar();
      userLikes.clear();
      loadPosts();
      showView('posts');
    })
    .catch(err => {
      authMsg.textContent = err.message || "Error en autenticación.";
    });
}

// ================ FUNCIONES DE POSTS ================
function loadPosts() {
  postsContainer.innerHTML = `<p>Cargando posts...</p>`;
  
  getPosts()
    .then(posts => {
      lastPosts = posts;
      if (!posts || posts.length === 0) {
        postsContainer.innerHTML = `<p>No hay posts aún. ¡Sé el primero en publicar!</p>`;
        return;
      }
      
      renderPosts(posts);
    })
    .catch(err => {
      postsContainer.innerHTML = `<p style="color:red;">Error al cargar los posts.<br>${err.message}</p>`;
    });
}

function renderPosts(posts) {
  const template = document.getElementById('post-template');
  postsContainer.innerHTML = '';
  
  posts.forEach(post => {
    const postElement = template.content.cloneNode(true);
    
    // Llenar datos del post
    postElement.querySelector('.post-title').textContent = post.titulo;
    postElement.querySelector('.post-content').textContent = 
      (post.contenido || '').substring(0, 110) + '...';
    
    // Imagen (si existe)
    const img = postElement.querySelector('.post-image');
    if (post.fotoLink) {
      img.src = post.fotoLink;
      img.style.display = 'block';
    }
    
    // Información del footer
    postElement.querySelector('.like-count').textContent = post.likeCount || 0;
    postElement.querySelector('.post-author').textContent = 
      `por ${post.autor ? post.autor.nombre : 'anónimo'}`;
    postElement.querySelector('.post-category').textContent = 
      post.categoria ? post.categoria.nombre : 'Sin categoría';
    
    // Configurar botón de like
    const likeBtn = postElement.querySelector('.like-btn');
    likeBtn.dataset.id = post.id;
    
    // Estado visual del like
    if (userLikes.has(post.id)) {
      likeBtn.style.color = '#C70039';
      likeBtn.style.fontWeight = 'bold';
    }
    
    // Event listener para like
    likeBtn.onclick = handleLike;
    
    postsContainer.appendChild(postElement);
  });
}

function handleLike(e) {
  const postId = parseInt(e.currentTarget.dataset.id);
  
  if (!isAuthenticated()) {
    alert("Debes iniciar sesión para dar like.");
    return;
  }

  const btn = e.currentTarget;
  const countSpan = btn.querySelector('.like-count');
  const currentCount = parseInt(countSpan.textContent);
  
  // Deshabilitar botón durante la operación
  btn.disabled = true;
  const originalColor = btn.style.color;
  const originalWeight = btn.style.fontWeight;

  // Función para actualizar UI
  function updateLikeUI(isLiked, count) {
    countSpan.textContent = count;
    btn.style.color = isLiked ? '#C70039' : '#666';
    btn.style.fontWeight = isLiked ? 'bold' : 'normal';
    
    if (isLiked) {
      userLikes.add(postId);
    } else {
      userLikes.delete(postId);
    }
    btn.disabled = false;
  }

  // Función para restaurar estado original
  function restoreOriginal() {
    countSpan.textContent = currentCount;
    btn.style.color = originalColor;
    btn.style.fontWeight = originalWeight;
    btn.disabled = false;
  }

  // Primero intenta dar like (POST)
  console.log('Intentando dar like a post:', postId);
  
  likePost(postId)
    .then(() => {
      console.log('✅ Like agregado exitosamente');
      updateLikeUI(true, currentCount + 1);
    })
    .catch(error => {
      console.log('❌ Error al dar like:', error.message);
      
      // Si falla, intenta quitar like (DELETE)
      console.log('🔄 Intentando quitar like...');
      
      unlikePost(postId)
        .then(() => {
          console.log('✅ Like removido exitosamente');
          updateLikeUI(false, currentCount - 1);
        })
        .catch(error2 => {
          console.log('❌ Error al quitar like:', error2.message);
          restoreOriginal();
          alert('Error al procesar like. Intenta de nuevo.');
        });
    });
}

// ================ FUNCIONES DE CREAR POST ================
function showCreatePostForm() {
  if (!isAuthenticated()) {
    alert("Debes iniciar sesión para crear un post.");
    return;
  }

  // Cargar categorías
  getCategories()
    .then(categories => {
      const categorySelect = document.getElementById('categoria');
      categorySelect.innerHTML = '<option value="">Selecciona una categoría</option>';
      
      categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.nombre;
        categorySelect.appendChild(option);
      });
      
      // Limpiar formulario y mostrar vista
      createPostForm.reset();
      createPostMsg.textContent = "";
      showView('createPost');
    })
    .catch(err => {
      alert("Error al cargar categorías: " + err.message);
    });
}

function handleCreatePost(e) {
  e.preventDefault();
  
  const titulo = document.getElementById("titulo").value.trim();
  const contenido = document.getElementById("contenido").value.trim();
  const categoriaId = parseInt(document.getElementById("categoria").value);
  const fotoLink = document.getElementById("fotoLink").value.trim() || null;
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  
  // Validaciones frontend
  if (titulo.length < 5) {
    createPostMsg.textContent = "El título debe tener al menos 5 caracteres";
    return;
  }
  
  if (contenido.length < 10) {
    createPostMsg.textContent = "El contenido debe tener al menos 10 caracteres";
    return;
  }
  
  if (!categoriaId) {
    createPostMsg.textContent = "Debes seleccionar una categoría";
    return;
  }
  
  // Deshabilitar botón durante envío
  submitBtn.disabled = true;
  submitBtn.textContent = "Publicando...";
  createPostMsg.textContent = "";
  
  // Enviar al backend
  createPost(titulo, contenido, categoriaId, fotoLink)
    .then(response => {
      console.log("✅ Post creado exitosamente:", response);
      
      // Mostrar mensaje de éxito
      createPostMsg.style.color = "green";
      createPostMsg.textContent = "¡Post publicado exitosamente!";
      
      // Volver a la lista de posts después de 1.5 segundos
      setTimeout(() => {
        loadPosts();
        showView('posts');
      }, 1500);
    })
    .catch(err => {
      console.log("❌ Error al crear post:", err.message);
      createPostMsg.style.color = "red";
      createPostMsg.textContent = "Error al crear post: " + err.message;
      
      // Restaurar botón
      submitBtn.disabled = false;
      submitBtn.textContent = "🎣 Publicar Post";
    });
}

// ================ EVENT LISTENERS ================
btnLogin.onclick = () => showAuthForm(true);
btnLogout.onclick = () => {
  logout();
  userLikes.clear();
  renderNavbar();
  loadPosts();
  showView('posts');
};
btnPosts.onclick = () => {
  loadPosts();
  showView('posts');
};
btnCreatePost.onclick = () => showCreatePostForm();

// Formularios
authForm.onsubmit = handleAuth;
authToggleLink.onclick = (e) => {
  e.preventDefault();
  showAuthForm(!isLoginMode);
};

createPostForm.onsubmit = handleCreatePost;
cancelPostBtn.onclick = () => {
  loadPosts();
  showView('posts');
};

// ================ INICIALIZACIÓN ================
window.onload = () => {
  renderNavbar();
  loadPosts();
  showView('posts');
};