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
