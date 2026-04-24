const API_BASE = window.API_BASE || (
  location.hostname === 'localhost'
    ? 'http://localhost:3002'
    : 'https://barber-1-ovpr.onrender.com'
);

function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function removeToken() {
  localStorage.removeItem('token');
}

function getUserFromToken() {
  const token = getToken();
  if (!token) return null;

  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (error) {
    console.error('Invalid token:', error);
    return null;
  }
}

function isLoggedIn() {
  return Boolean(getToken());
}

function getUserRole() {
  const user = getUserFromToken();
  return user ? user.role : null;
}

function getUserDisplayName() {
  const user = getUserFromToken();
  return user ? (user.name || user.email || 'Guest') : 'Guest';
}

async function apiFetch(url, options = {}) {
  const token = getToken();
  const resolvedUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(resolvedUrl, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : await response.text().catch(() => '');

  if (!response.ok) {
    const message = payload && typeof payload === 'object'
      ? (payload.message || payload.error || 'Request failed')
      : (payload || `Request failed with status ${response.status}`);
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function logout() {
  removeToken();
  window.location = 'index.html';
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return String(password || '').length >= 6;
}

function validateName(name) {
  return String(name || '').trim().length >= 2;
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.zIndex = '9999';
  notification.style.padding = '15px 20px';
  notification.style.borderRadius = '14px';
  notification.style.boxShadow = '0 16px 40px rgba(15, 23, 42, 0.18)';
  notification.style.maxWidth = '360px';
  notification.style.wordWrap = 'break-word';

  if (type === 'success') {
    notification.style.backgroundColor = '#0f766e';
    notification.style.color = '#f0fdfa';
  } else if (type === 'error') {
    notification.style.backgroundColor = '#b91c1c';
    notification.style.color = '#fef2f2';
  } else if (type === 'warning') {
    notification.style.backgroundColor = '#facc15';
    notification.style.color = '#422006';
  } else {
    notification.style.backgroundColor = '#0f172a';
    notification.style.color = '#f8fafc';
  }

  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 4000);
}

function showSuccess(message) {
  showNotification(message, 'success');
}

function showError(message) {
  showNotification(message, 'error');
}

function showWarning(message) {
  showNotification(message, 'warning');
}

function setLoading(element, isLoading, loadingText = 'Loading...') {
  if (!element) return;

  if (isLoading) {
    element.disabled = true;
    element.dataset.originalText = element.textContent;
    element.innerHTML = `<span class="button-spinner"></span>${loadingText}`;
    return;
  }

  element.disabled = false;
  element.textContent = element.dataset.originalText || 'Submit';
}

window.API_BASE = API_BASE;
window.apiFetch = apiFetch;
window.AuthUtils = {
  getToken,
  setToken,
  removeToken,
  getUserFromToken,
  getUserRole,
  getUserDisplayName,
  isLoggedIn,
  logout,
  validateEmail,
  validatePassword,
  validateName,
  showNotification,
  showSuccess,
  showError,
  showWarning,
  setLoading
};
