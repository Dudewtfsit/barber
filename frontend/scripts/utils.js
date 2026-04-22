// scripts/utils.js
// Helper functions and utilities

// API base (configurable via window.API_BASE). Defaults to localhost backend for dev.
const API_BASE = window.API_BASE || (location.hostname === 'localhost' ? 'http://localhost:3002' : window.location.origin);

// Token management
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
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch (error) {
    console.error('Invalid token:', error);
    return null;
  }
}

function isLoggedIn() {
  return !!getToken();
}

function getUserRole() {
  const user = getUserFromToken();
  return user ? user.role : null;
}

// API fetch wrapper: prepends API_BASE for relative paths
async function apiFetch(url, options = {}) {
  const token = getToken();
  const resolvedUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': 'Bearer ' + token })
    }
  };
  const res = await fetch(resolvedUrl, { ...defaultOptions, ...options });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`API error: ${res.status} ${text}`);
    err.status = res.status;
    throw err;
  }
  // Try to parse JSON, but return text if not JSON
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return res.text();
}

// Logout function
function logout() {
  removeToken();
  window.location = 'index.html';
}

// Input validation
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password) {
  // At least 6 characters
  return password.length >= 6;
}

function validateName(name) {
  return name.trim().length >= 2;
}

// Notification helpers
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.zIndex = '9999';
  notification.style.padding = '15px 20px';
  notification.style.borderRadius = '4px';
  notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  notification.style.maxWidth = '400px';
  notification.style.wordWrap = 'break-word';
  
  if (type === 'success') {
    notification.style.backgroundColor = '#28a745';
    notification.style.color = 'white';
  } else if (type === 'error') {
    notification.style.backgroundColor = '#dc3545';
    notification.style.color = 'white';
  } else if (type === 'warning') {
    notification.style.backgroundColor = '#ffc107';
    notification.style.color = '#333';
  } else {
    notification.style.backgroundColor = '#17a2b8';
    notification.style.color = 'white';
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

// Loading state helpers
function setLoading(element, isLoading) {
  if (isLoading) {
    element.disabled = true;
    element.dataset.originalText = element.textContent;
    element.innerHTML = '<span style="display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-radius: 50%; border-top-color: white; animation: spin 0.8s linear infinite; margin-right: 8px;"></span>Loading...';
  } else {
    element.disabled = false;
    element.textContent = element.dataset.originalText || 'Submit';
  }
}

// Export functions (for potential future modularization)
window.AuthUtils = {
  getToken,
  setToken,
  removeToken,
  getUserFromToken,
  isLoggedIn,
  getUserRole,
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
