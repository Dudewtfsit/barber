async function handleRegister(event) {
  event.preventDefault();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;
  const submitBtn = event.target.querySelector('button[type="submit"]');

  if (!AuthUtils.validateName(name)) {
    AuthUtils.showError('Name must be at least 2 characters.');
    return;
  }

  if (!AuthUtils.validateEmail(email)) {
    AuthUtils.showError('Please enter a valid email address.');
    return;
  }

  if (!AuthUtils.validatePassword(password)) {
    AuthUtils.showError('Password must be at least 6 characters.');
    return;
  }

  AuthUtils.setLoading(submitBtn, true, 'Creating account...');

  try {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role })
    });

    if (data.token) {
      AuthUtils.setToken(data.token);
    }

    AuthUtils.showSuccess('Account created. Redirecting...');
    setTimeout(() => {
      window.location = role === 'barber' ? 'barber-dashboard.html' : 'booking.html';
    }, 900);
  } catch (error) {
    AuthUtils.showError(error.message || 'Registration failed.');
  } finally {
    AuthUtils.setLoading(submitBtn, false);
  }
}

async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const submitBtn = event.target.querySelector('button[type="submit"]');

  if (!AuthUtils.validateEmail(email)) {
    AuthUtils.showError('Please enter a valid email address.');
    return;
  }

  if (!password) {
    AuthUtils.showError('Password is required.');
    return;
  }

  AuthUtils.setLoading(submitBtn, true, 'Signing in...');

  try {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    AuthUtils.setToken(data.token);
    const userRole = AuthUtils.getUserRole();
    AuthUtils.showSuccess('Login successful. Redirecting...');

    setTimeout(() => {
      window.location = userRole === 'barber' ? 'barber-dashboard.html' : 'dashboard.html';
    }, 800);
  } catch (error) {
    AuthUtils.showError(error.message || 'Login failed.');
  } finally {
    AuthUtils.setLoading(submitBtn, false);
  }
}

if (window.location.pathname.endsWith('register.html')) {
  document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
}

if (window.location.pathname.endsWith('login.html')) {
  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
}
