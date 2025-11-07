// Small helpers and DOM utils
const qs = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const show = (el) => el && el.classList.remove('hidden');
const hide = (el) => el && el.classList.add('hidden');

// Toast notifications
function showToast(message, type = 'success') {
  const toast = qs('#toast');
  const msg = qs('#toast-message');
  const icon = qs('#toast-icon');
  if (!toast || !msg || !icon) return;

  msg.textContent = message;
  icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle';

  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 3000);
}

// Scroll helper
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// Query builder
function toQuery(params = {}) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (entries.length === 0) return '';
  const usp = new URLSearchParams(entries);
  return `?${usp.toString()}`;
}

// Simple storage wrapper
const storage = {
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
  get(key, fallback = null) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  remove(key) { localStorage.removeItem(key); }
};

// GPS/Geolocation helper
function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }
    
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000, // 10 seconds
      maximumAge: 300000 // 5 minutes
    };
    
    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      { ...defaultOptions, ...options }
    );
  });
}

