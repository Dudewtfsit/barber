// scripts/auth.js
// Handles login/register form submissions, stores JWT in localStorage

async function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;
  const res = await fetch('https://barber-1-ovpr.onrender.com/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role })
  });
  const data = await res.json();
  if (res.ok) {
    alert('Registered successfully! Please login.');
    window.location = 'login.html';
  } else {
    alert(data.message || 'Registration failed');
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const res = await fetch('https://barber-1-ovpr.onrender.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (res.ok) {
    AuthUtils.setToken(data.token);
    alert('Login successful');
    // Redirect based on role
    const userRole = AuthUtils.getUserRole();
    if (userRole === 'barber') {
      window.location = 'barber-dashboard.html';
    } else {
      window.location = 'index.html';
    }
  } else {
    alert(data.message || 'Login failed');
  }
}

if (window.location.pathname.endsWith('register.html')) {

if (window.location.pathname.endsWith('register.html')) {
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
}

if (window.location.pathname.endsWith('login.html')) {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
}

