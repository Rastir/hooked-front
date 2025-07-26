function login(email, password) {
  return loginApi(email, password)
    .then(data => {
      if (data.token) {
        localStorage.setItem("jwt", data.token);
        localStorage.setItem("user_nombre", data.nombre);
        localStorage.setItem("user_email", data.email);
        return true;
      }
      throw new Error("Login incorrecto");
    });
}

function logout() {
  localStorage.removeItem("jwt");
  localStorage.removeItem("user_nombre");
  localStorage.removeItem("user_email");
}

function isAuthenticated() {
  return !!localStorage.getItem("jwt");
}

//Create
function register(nombre, email, contrasena) {
  return registerApi(nombre, email, contrasena)
    .then(data => {
      if (data.token) {
        localStorage.setItem("jwt", data.token);
        localStorage.setItem("user_nombre", data.nombre);
        localStorage.setItem("user_email", data.email);
        return true;
      }
      throw new Error("Registro fallido");
    });
}