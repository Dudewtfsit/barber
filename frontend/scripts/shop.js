// scripts/shop.js
const token = localStorage.getItem('token');
if (!token) window.location = 'login.html';

// Load shop info on page load
async function loadShop() {
  const res = await fetch('http://localhost:3002/api/shop', {
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
  const res = await fetch('http://localhost:3002/api/shop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify(body)
  });
  alert((await res.json()).message);
};

// Load services
async function loadServices() {
  const res = await fetch('http://localhost:3002/api/services', {
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
  const res = await fetch('http://localhost:3002/api/services', {
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
