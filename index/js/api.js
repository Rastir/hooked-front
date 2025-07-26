const API_BASE = "http://localhost:8080/api";

// ================ FUNCIÓN BASE ================
function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem("jwt");
  const headers = options.headers || {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(API_BASE + endpoint, { ...options, headers })
    .then(async resp => {
      if (!resp.ok) {
        let errorMsg = await resp.text();
        throw new Error(errorMsg || `HTTP ${resp.status}`);
      }
      return resp.json();
    });
}

// ================ AUTENTICACIÓN ================
function loginApi(email, password) {
  return apiFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
}

function registerApi(nombre, email, contrasena) {
  return apiFetch("/auth/registro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, email, contrasena })
  });
}

// ================ POSTS ================
function getPosts() {
  return apiFetch("/posts");
}

function getPostById(id) {
  return apiFetch(`/posts/${id}`);
}

function createPost(titulo, contenido, categoriaId, fotoLink = null) {
  const body = { titulo, contenido, categoriaId };
  if (fotoLink) body.fotoLink = fotoLink;
  
  return apiFetch("/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function updatePost(id, data) {
  return apiFetch(`/posts/${id}`, {
    method: "PUT", 
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
}

function deletePost(id) {
  return apiFetch(`/posts/${id}`, { method: "DELETE" });
}

function getMyPosts() {
  return apiFetch("/posts/mis-posts");
}

function getPostsByUser(userId) {
  return apiFetch(`/posts/usuario/${userId}`);
}

function getPostsByCategory(categoryId) {
  return apiFetch(`/posts/categoria/${categoryId}`);
}

// ================ LIKES ================  
function likePost(postId) {
  return apiFetch(`/posts/${postId}/like`, { method: "POST" });
}

function unlikePost(postId) {
  return apiFetch(`/posts/${postId}/like`, { method: "DELETE" });
}

// ================ CATEGORÍAS ================
function getCategories() {
  return apiFetch("/categorias");
}

function getCategoryById(id) {
  return apiFetch(`/categorias/${id}`);
}

function createCategory(nombre, descripcion) {
  return apiFetch("/categorias", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, descripcion })
  });
}

function updateCategory(id, data) {
  return apiFetch(`/categorias/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
}

function deleteCategory(id) {
  return apiFetch(`/categorias/${id}`, { method: "DELETE" });
}

function getCategoryPosts(categoryId) {
  return apiFetch(`/categorias/${categoryId}/posts`);
}

function searchCategories(nombre) {
  return apiFetch(`/categorias/buscar?nombre=${encodeURIComponent(nombre)}`);
}

function getCategoryStats() {
  return apiFetch("/categorias/stats");
}

// ================ USUARIOS ================
function getUsers() {
  return apiFetch("/usuarios");
}

function getUserByEmail(email) {
  return apiFetch(`/usuarios/${encodeURIComponent(email)}`);
}

function createUser(nombre, email, contrasena) {
  return apiFetch("/usuarios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, email, contrasena })
  });
}