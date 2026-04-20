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
