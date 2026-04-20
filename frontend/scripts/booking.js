// scripts/booking.js
const token = localStorage.getItem('token');
if (!token) {
  window.location = 'login.html';
}

// Load shops for clients to browse and book
async function loadShops() {
  try {
    const res = await fetch('https://barber-1-ovpr.onrender.com/api/public/shops');
    if (res.ok) {
      const shops = await res.json();
      const list = document.getElementById('shops-list');
      if (list) {
        list.innerHTML = '';
        shops.forEach(shop => {
          const div = document.createElement('div');
          div.className = 'shop-item';
          div.innerHTML = `
            <h3>${shop.name}</h3>
            <p>${shop.address}, ${shop.city}, ${shop.state}</p>
            <button class="btn" onclick="selectShop(${shop.id}, '${shop.name}')">View Services</button>
          `;
          list.appendChild(div);
        });
      }
    } else {
      console.error('Error loading shops');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Show services for selected shop
async function selectShop(shopId, shopName) {
  try {
    const res = await fetch(`https://barber-1-ovpr.onrender.com/api/services/${shopId}`);
    if (res.ok) {
      const services = await res.json();
      const servicesDiv = document.getElementById('services-list');
      if (servicesDiv) {
        servicesDiv.innerHTML = `<h2>Services at ${shopName}</h2>`;
        services.forEach(service => {
          const div = document.createElement('div');
          div.className = 'service-item';
          div.innerHTML = `
            <h4>${service.name}</h4>
            <p>$${service.price} - ${service.duration_minutes} minutes</p>
            <button class="btn" onclick="bookService(${shopId}, ${service.id}, '${service.name}', ${service.price})">Book Now</button>
          `;
          servicesDiv.appendChild(div);
        });
      }
    }
  } catch (error) {
    console.error('Error loading services:', error);
  }
}

// Book a service
async function bookService(shopId, serviceId, serviceName, price) {
  const date = prompt(`Book ${serviceName} ($${price}) - Enter date (YYYY-MM-DD):`);
  if (!date) return;

  const time = prompt('Enter time (HH:MM):');
  if (!time) return;

  const startTime = `${date}T${time}:00`;

  try {
    const res = await fetch('https://barber-1-ovpr.onrender.com/api/book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ shopId, serviceId, startTime })
    });
    const data = await res.json();
    if (res.ok) {
      alert('Appointment booked successfully!');
      window.location = 'dashboard.html'; // Redirect to client dashboard
    } else {
      alert(data.message || 'Booking failed');
    }
  } catch (error) {
    console.error('Error booking:', error);
    alert('Booking failed');
  }
}

// Load appointments for client
async function loadAppointments() {
  try {
    const res = await fetch('https://barber-1-ovpr.onrender.com/api/appointments', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      const appointments = await res.json();
      const list = document.getElementById('appointments-list');
      if (list) {
        list.innerHTML = '';
        appointments.forEach(a => {
          const li = document.createElement('li');
          li.innerHTML = `
            <strong>${a.service_name}</strong> at ${a.shop_name}<br>
            ${new Date(a.start_time).toLocaleString()} - ${new Date(a.end_time).toLocaleString()}<br>
            Status: ${a.status}
            ${a.status === 'booked' ? `<button onclick="cancelAppointment(${a.id})">Cancel</button>` : ''}
          `;
          list.appendChild(li);
        });
      }
    }
  } catch (error) {
    console.error('Error loading appointments:', error);
  }
}

// Cancel appointment
async function cancelAppointment(appointmentId) {
  if (!confirm('Are you sure you want to cancel this appointment?')) return;

  try {
    const res = await fetch(`https://barber-1-ovpr.onrender.com/api/appointments/${appointmentId}/cancel`, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    if (res.ok) {
      alert('Appointment cancelled successfully');
      loadAppointments(); // Refresh list
    } else {
      alert(data.message || 'Cancellation failed');
    }
  } catch (error) {
    console.error('Error cancelling:', error);
    alert('Cancellation failed');
  }
}

// Initialize based on current page
if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
  loadShops();
}

if (window.location.pathname.endsWith('dashboard.html')) {
  loadAppointments();
}
