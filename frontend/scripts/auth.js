// scripts/auth.js
// Handles login/register form submissions, stores JWT in localStorage
const token = localStorage.getItem('token');

async function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;
  const res = await fetch('https://barber-1-ovpr.onrender.com/api/auth/register', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
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
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (res.ok) {
    localStorage.setItem('token', data.token);
    alert('Login successful');
    window.location = 'index.html';
  } else {
    alert(data.message || 'Login failed');
  }
}

if (window.location.pathname.endsWith('register.html')) {
  document.getElementById('registerForm').addEventListener('submit', handleRegister);
}
if (window.location.pathname.endsWith('login.html')) {
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
}
// scripts/booking.js
if (!token && window.location.pathname.endsWith('index.html')) {
  window.location = 'login.html';
}

if (window.location.pathname.endsWith('index.html')) {
  loadShops();
}
// scripts/dashboard.js
if (!token && window.location.pathname.endsWith('dashboard.html')) {
  window.location = 'login.html';
}

if (window.location.pathname.endsWith('dashboard.html')) {
  document.getElementById('shopForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('shop-name').value;
    const address = document.getElementById('shop-address').value;
    const city = document.getElementById('shop-city').value;
    const state = document.getElementById('shop-state').value;
    const res = await fetch('https://barber-1-ovpr.onrender.com/api/shop', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ name, address, city, state })
    });
    const data = await res.json();
    alert(data.message);
  });

  document.getElementById('serviceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('service-name').value;
    const price = parseFloat(document.getElementById('service-price').value);
    const duration_minutes = parseInt(document.getElementById('service-duration').value);
    const res = await fetch('https://barber-1-ovpr.onrender.com/api/services', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ name, price, duration_minutes })
    });
    if (res.ok) {
      loadServices();
    } else {
      alert('Error adding service');
    }
  });

  loadServices();
  loadAppointments();
}
// scripts/shop.js
if (!token && window.location.pathname.endsWith('shop.html')) window.location = 'login.html';

// Load shop info on page load
async function loadShop() {
  const res = await fetch('https://barber-1-ovpr.onrender.com/api/shop', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (res.ok) {
    const shop = await res.json();
    document.getElementById('shop-name').value = shop.name || '';
    // ... address, city, state similarly
  }
}
document.getElementById('save-shop').onclick = async () => {
  const body = {
    name: document.getElementById('shop-name').value,
    address: document.getElementById('shop-address').value,
    city: document.getElementById('shop-city').value,
    state: document.getElementById('shop-state').value,
  };
  const res = await fetch('https://barber-1-ovpr.onrender.com/api/shop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify(body)
  });
  alert((await res.json()).message);
};

// Load services
async function loadServices() {
  const res = await fetch('https://barber-6bvh.onrender.com/api/services', {
    headers: { 'Authorization': 'Bearer ' + token }
if (window.location.pathname.endsWith('shop.html')) {
  // Load shop info on page load
  async function loadShop() {
    const res = await fetch('https://barber-1-ovpr.onrender.com/api/shop', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      const shop = await res.json();
      document.getElementById('shop-name').value = shop.name || '';
      // ... address, city, state similarly
    }
  }
  document.getElementById('save-shop').onclick = async () => {
    const body = {
      name: document.getElementById('shop-name').value,
      address: document.getElementById('shop-address').value,
      city: document.getElementById('shop-city').value,
      state: document.getElementById('shop-state').value,
    };
    const res = await fetch('https://barber-1-ovpr.onrender.com/api/shop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(body)
    });
    alert((await res.json()).message);
  };

  loadShop();
}  alert((await res.json()).message);
  }
};

loadShop();
loadServices();
// scripts/utils.js
// Helper functions (e.g. fetch wrapper)
async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('token');
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
