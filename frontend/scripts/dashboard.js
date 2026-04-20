// scripts/dashboard.js
const token = localStorage.getItem('token');
if (!token) {
  window.location = 'login.html';
}

// Check user role from token
const payload = JSON.parse(atob(token.split('.')[1]));
const userRole = payload.role;

// Barber dashboard functionality
if (userRole === 'barber') {
  // Shop management
  const shopForm = document.getElementById('shopForm');
  if (shopForm) {
    shopForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('shop-name').value;
      const address = document.getElementById('shop-address').value;
      const city = document.getElementById('shop-city').value;
      const state = document.getElementById('shop-state').value;

      try {
        const res = await fetch('https://barber-1-ovpr.onrender.com/api/shop', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ name, address, city, state })
        });
        const data = await res.json();
        if (res.ok) {
          alert('Shop saved successfully!');
          loadShop(); // Refresh shop info
        } else {
          alert(data.message || 'Error saving shop');
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Error saving shop');
      }
    });
  }

  // Service management
  const serviceForm = document.getElementById('serviceForm');
  if (serviceForm) {
    serviceForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('service-name').value;
      const price = parseFloat(document.getElementById('service-price').value);
      const duration_minutes = parseInt(document.getElementById('service-duration').value);

      try {
        const res = await fetch('https://barber-1-ovpr.onrender.com/api/services', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ name, price, duration_minutes })
        });
        const data = await res.json();
        if (res.ok) {
          alert('Service added successfully!');
          loadServices(); // Refresh services list
          // Clear form
          document.getElementById('service-name').value = '';
          document.getElementById('service-price').value = '';
          document.getElementById('service-duration').value = '';
        } else {
          alert(data.message || 'Error adding service');
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Error adding service');
      }
    });
  }

  // Load barber data
  loadShop();
  loadServices();
  loadAppointments();

} else if (userRole === 'client') {
  // Client dashboard - redirect to booking page or show client-specific content
  window.location = 'index.html';
}

// Load shop info for barber
async function loadShop() {
  try {
    const res = await fetch('https://barber-1-ovpr.onrender.com/api/shop', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      const shop = await res.json();
      document.getElementById('shop-name').value = shop.name || '';
      document.getElementById('shop-address').value = shop.address || '';
      document.getElementById('shop-city').value = shop.city || '';
      document.getElementById('shop-state').value = shop.state || '';
    } else if (res.status === 404) {
      // No shop yet - form will be empty
    }
  } catch (error) {
    console.error('Error loading shop:', error);
  }
}

// Load services for barber
async function loadServices() {
  try {
    const res = await fetch('https://barber-1-ovpr.onrender.com/api/services', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      const services = await res.json();
      const list = document.getElementById('services-list');
      if (list) {
        list.innerHTML = '';
        services.forEach(s => {
          const li = document.createElement('li');
          li.textContent = `${s.name} - $${s.price} (${s.duration_minutes} min)`;
          list.appendChild(li);
        });
      }
    }
  } catch (error) {
    console.error('Error loading services:', error);
  }
}

// Load appointments for barber
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
            <strong>${a.service_name}</strong> - ${a.client_name}<br>
            ${new Date(a.start_time).toLocaleString()} - ${new Date(a.end_time).toLocaleString()}<br>
            Status: ${a.status}
            ${a.status === 'booked' ? `<button onclick="updateAppointmentStatus(${a.id}, 'done')">Mark Done</button> <button onclick="cancelAppointment(${a.id})">Cancel</button>` : ''}
          `;
          list.appendChild(li);
        });
      }
    }
  } catch (error) {
    console.error('Error loading appointments:', error);
  }
}

// Update appointment status (barber only)
async function updateAppointmentStatus(appointmentId, status) {
  try {
    const res = await fetch(`https://barber-1-ovpr.onrender.com/api/appointments/${appointmentId}/cancel`, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (res.ok) {
      alert(`Appointment marked as ${status}`);
      loadAppointments(); // Refresh list
    } else {
      alert(data.message || 'Update failed');
    }
  } catch (error) {
    console.error('Error updating:', error);
    alert('Update failed');
  }
}

// Cancel appointment (barber)
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
