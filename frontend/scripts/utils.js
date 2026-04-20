// scripts/utils.js
// Helper functions and utilities

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

// API fetch wrapper
async function apiFetch(url, options = {}) {
  const token = getToken();
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': 'Bearer ' + token })
    }
  };
  const res = await fetch(url, { ...defaultOptions, ...options });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

// Logout function
function logout() {
  removeToken();
  window.location = 'index.html';
}

// Export functions (for potential future modularization)
window.AuthUtils = {
  getToken,
  setToken,
  removeToken,
  getUserFromToken,
  isLoggedIn,
  getUserRole,
  logout
};
