/**
 * Utilidades compartidas entre páginas
 */

const Utils = {
  // Debounce para búsquedas/scroll
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Formatear números (likes, etc)
  formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  },

  // Validar email
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  // Sanitizar input básico
  sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  },

  // Guardar en localStorage con expiración
  setWithExpiry(key, value, ttlMinutes) {
    const now = new Date();
    const item = {
      value: value,
      expiry: now.getTime() + (ttlMinutes * 60 * 1000)
    };
    localStorage.setItem(key, JSON.stringify(item));
  },
  // Theme toggle
  initTheme() {
    const saved = localStorage.getItem('hooked_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('hooked_theme', next);
    return next;
  },

  getThemeIcon() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    return current === 'dark' ? '☀️' : '🌙';
  },

  confirm(opciones) {
    return new Promise((resolve) => {
      // Crear overlay
      const overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';

      const icono = opciones.icono || '⚠️';
      const titulo = opciones.titulo || '¿Confirmar acción?';
      const mensaje = opciones.mensaje || '';
      const btnOk = opciones.btnOk || 'Confirmar';
      const btnCancel = opciones.btnCancel || 'Cancelar';
      const peligro = opciones.peligro || false;

      overlay.innerHTML = `
      <div class="confirm-card">
        <div class="confirm-icon">${icono}</div>
        <h3 class="confirm-title">${titulo}</h3>
        ${mensaje ? `<p class="confirm-message">${mensaje}</p>` : ''}
        <div class="confirm-actions">
          <button class="btn btn-secondary btn-sm" id="confirm-cancel">${btnCancel}</button>
          <button class="btn ${peligro ? 'btn-danger' : 'btn-primary'} btn-sm" id="confirm-ok">${btnOk}</button>
        </div>
      </div>
    `;

      document.body.appendChild(overlay);

      const cerrar = (resultado) => {
        overlay.remove();
        resolve(resultado);
      };

      overlay.querySelector('#confirm-ok').addEventListener('click', () => cerrar(true));
      overlay.querySelector('#confirm-cancel').addEventListener('click', () => cerrar(false));
      // Click fuera cierra como cancelar
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cerrar(false);
      });
    });
  },

  // Leer de localStorage con expiración
  getWithExpiry(key) {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;

    const item = JSON.parse(itemStr);
    const now = new Date();

    if (now.getTime() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return item.value;
  }
};

// Exponer globalmente
window.Utils = Utils;