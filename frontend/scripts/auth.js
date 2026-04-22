// scripts/auth.js
// Handles login/register form submissions, stores JWT in localStorage

async function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;
  const submitBtn = event.target.querySelector('button[type="submit"]');
  
  // Validation
  if (!AuthUtils.validateName(name)) {
    AuthUtils.showError('Name must be at least 2 characters');
    return;
  }
  
  if (!AuthUtils.validateEmail(email)) {
    AuthUtils.showError('Please enter a valid email address');
    return;
  }
  
  if (!AuthUtils.validatePassword(password)) {
    AuthUtils.showError('Password must be at least 6 characters');
    return;
  }
  
  AuthUtils.setLoading(submitBtn, true);
  
  try {
    try {
      const data = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role })
      });
      AuthUtils.showSuccess('Registered successfully! Redirecting to login...');
      setTimeout(() => window.location = 'login.html', 1500);
    } catch (err) {
      AuthUtils.showError(err.message || 'Registration failed');
    }
  } catch (error) {
    console.error('Error:', error);
    AuthUtils.showError('Registration failed. Please try again.');
  } finally {
    AuthUtils.setLoading(submitBtn, false);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const submitBtn = event.target.querySelector('button[type="submit"]');
  
  // Validation
  if (!AuthUtils.validateEmail(email)) {
    AuthUtils.showError('Please enter a valid email address');
    return;
  }
  
  if (!password) {
    AuthUtils.showError('Password is required');
    return;
  }
  
  AuthUtils.setLoading(submitBtn, true);
  
  try {
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      AuthUtils.setToken(data.token);
      AuthUtils.showSuccess('Login successful! Redirecting...');
      // Redirect based on role
      const userRole = AuthUtils.getUserRole();
      setTimeout(() => {
        if (userRole === 'barber') {
          window.location = 'barber-dashboard.html';
        } else {
          window.location = 'index.html';
        }
      }, 1000);
    } catch (err) {
      AuthUtils.showError(err.message || 'Login failed');
    }
  } catch (error) {
    console.error('Error:', error);
    AuthUtils.showError('Login failed. Please try again.');
  } finally {
    AuthUtils.setLoading(submitBtn, false);
  }
}

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

