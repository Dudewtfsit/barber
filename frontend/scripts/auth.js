// scripts/auth.js
// Handles login/register form submissions, stores JWT in localStorage
async function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;
  const res = await fetch('https://barber-6bvh.onrender.com/api/auth/register', {
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
  const res = await fetch('https://barber-6bvh.onrender.com/api/auth/login', {
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
const token = localStorage.getItem('token');
if (!token) {
  window.location = 'login.html';
}

async function loadShops() {
  const res = await fetch('https://barber-6bvh.onrender.com/api/public/shops');
  if (res.ok) {
    const shops = await res.json();
    const list = document.getElementById('shops-list');
    shops.forEach(shop => {
      const div = document.createElement('div');
      div.className = 'shop-item';
      div.innerHTML = `
        <h3>${shop.name}</h3>
        <p>${shop.address}, ${shop.city}, ${shop.state}</p>
        <button class="btn" onclick="bookAppointment(${shop.id})">Book Here</button>
      `;
      list.appendChild(div);
    });
  }
}

async function bookAppointment(shopId) {
  const date = prompt('Enter date (YYYY-MM-DD):');
  if (!date) return;
  const time = prompt('Enter time (HH:MM):');
  if (!time) return;
  const startTime = `${date}T${time}:00`;
  // Assume serviceId=1 for simplicity
  const serviceId = 1;
  const res = await fetch('https://barber-6bvh.onrender.com/api/book', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ shopId, serviceId, startTime })
  });
  const data = await res.json();
  alert(data.message);
}

loadShops();
// scripts/dashboard.js
const token = localStorage.getItem('token');
if (!token) {
  window.location = 'login.html';
}

document.getElementById('shopForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('shop-name').value;
  const address = document.getElementById('shop-address').value;
  const city = document.getElementById('shop-city').value;
  const state = document.getElementById('shop-state').value;
  const res = await fetch('https://barber-6bvh.onrender.com/api/shop', {
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
  const res = await fetch('https://barber-6bvh.onrender.com/api/services', {
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

async function loadServices() {
  const res = await fetch('https://barber-6bvh.onrender.com/api/services', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (res.ok) {
    const services = await res.json();
    const list = document.getElementById('services-list');
    list.innerHTML = '';
    services.forEach(s => {
      const li = document.createElement('li');
      li.textContent = `${s.name} - $${s.price} (${s.duration_minutes} min)`;
      list.appendChild(li);
    });
  }
}

async function loadAppointments() {
  const res = await fetch('https://barber-6bvh.onrender.com/api/appointments', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (res.ok) {
    const appointments = await res.json();
    const list = document.getElementById('appointments-list');
    list.innerHTML = '';
    appointments.forEach(a => {
      const li = document.createElement('li');
      li.textContent = `${a.client_name} - ${a.service_name} on ${new Date(a.start_time).toLocaleString()}`;
      list.appendChild(li);
    });
  }
}

loadServices();
loadAppointments();
// scripts/shop.js
const token = localStorage.getItem('token');
if (!token) window.location = 'login.html';

// Load shop info on page load
async function loadShop() {
  const res = await fetch('https://barber-6bvh.onrender.com/api/shop', {
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
  const res = await fetch('https://barber-6bvh.onrender.com/api/shop', {
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
  });
  const services = await res.json();
  const list = document.getElementById('services-list');
  list.innerHTML = '';
  services.forEach(s => {
    const li = document.createElement('li');
    li.textContent = `${s.name} – $${s.price} (${s.duration_minutes} min)`;
    list.appendChild(li);
  });
}
document.getElementById('add-service').onclick = async () => {
  const body = {
    name: document.getElementById('service-name').value,
    price: parseFloat(document.getElementById('service-price').value),
    duration_minutes: parseInt(document.getElementById('service-duration').value)
  };
  const res = await fetch('https://barber-6bvh.onrender.com/api/services', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify(body)
  });
  if (res.ok) {
    loadServices();
  } else {
    alert((await res.json()).message);
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
