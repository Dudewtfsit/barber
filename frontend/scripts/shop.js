// scripts/shop.js
if (!AuthUtils.isLoggedIn()) {
  window.location = 'login.html';
}

// Check user role from token
const userRole = AuthUtils.getUserRole();

if (userRole !== 'barber') {
  window.location = 'index.html'; // Redirect clients to booking page
}

// Load shop info on page load
async function loadShop() {
  try {
    const res = await fetch('https://barber-1-ovpr.onrender.com/api/shop', {
      headers: { 'Authorization': 'Bearer ' + AuthUtils.getToken() }
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

// Save shop info
document.getElementById('save-shop').addEventListener('click', async () => {
  const body = {
    name: document.getElementById('shop-name').value,
    address: document.getElementById('shop-address').value,
    city: document.getElementById('shop-city').value,
    state: document.getElementById('shop-state').value,
  };

  try {
    const res = await fetch('https://barber-1-ovpr.onrender.com/api/shop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AuthUtils.getToken() },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) {
      AuthUtils.showSuccess('Shop saved successfully!');
    } else {
      AuthUtils.showError(data.message || 'Error saving shop');
    }
  } catch (error) {
    console.error('Error:', error);
    AuthUtils.showError('Error saving shop');
  }
});

// Load services
async function loadServices() {
  try {
    const res = await fetch('https://barber-1-ovpr.onrender.com/api/services', {
      headers: { 'Authorization': 'Bearer ' + AuthUtils.getToken() }
    });
    if (res.ok) {
      const services = await res.json();
      const list = document.getElementById('services-list');
      if (list) {
        list.innerHTML = '';
        services.forEach(s => {
          const li = document.createElement('li');
          li.textContent = `${s.name} – $${s.price} (${s.duration_minutes} min)`;
          list.appendChild(li);
        });
      }
    }
  } catch (error) {
    console.error('Error loading services:', error);
  }
}

// Add service
document.getElementById('add-service').addEventListener('click', async () => {
  const body = {
    name: document.getElementById('service-name').value,
    price: parseFloat(document.getElementById('service-price').value),
    duration_minutes: parseInt(document.getElementById('service-duration').value)
  };

  if (!body.name || !body.price || !body.duration_minutes) {
    AuthUtils.showError('Please fill in all service fields');
    return;
  }

  try {
    const res = await fetch('https://barber-1-ovpr.onrender.com/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AuthUtils.getToken() },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) {
      AuthUtils.showSuccess('Service added successfully!');
      loadServices(); // Refresh list
      // Clear form
      document.getElementById('service-name').value = '';
      document.getElementById('service-price').value = '';
      document.getElementById('service-duration').value = '';
    } else {
      AuthUtils.showError(data.message || 'Error adding service');
    }
  } catch (error) {
    console.error('Error:', error);
    AuthUtils.showError('Error adding service');
  }
});

// Load appointments
async function loadAppointments() {
  try {
    const res = await fetch('https://barber-1-ovpr.onrender.com/api/appointments', {
      headers: { 'Authorization': 'Bearer ' + AuthUtils.getToken() }
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

// Update appointment status
async function updateAppointmentStatus(appointmentId, status) {
  try {
    const res = await fetch(`https://barber-1-ovpr.onrender.com/api/appointments/${appointmentId}/cancel`, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + AuthUtils.getToken() },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (res.ok) {
      AuthUtils.showSuccess(`Appointment marked as ${status}`);
      loadAppointments(); // Refresh list
    } else {
      AuthUtils.showError(data.message || 'Update failed');
    }
  } catch (error) {
    console.error('Error updating:', error);
    AuthUtils.showError('Update failed');
  }
}

// Cancel appointment
async function cancelAppointment(appointmentId) {
  if (!confirm('Are you sure you want to cancel this appointment?')) return;

  try {
    const res = await fetch(`https://barber-1-ovpr.onrender.com/api/appointments/${appointmentId}/cancel`, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + AuthUtils.getToken() }
    });
    const data = await res.json();
    if (res.ok) {
      AuthUtils.showSuccess('Appointment cancelled successfully');
      loadAppointments(); // Refresh list
    } else {
      AuthUtils.showError(data.message || 'Cancellation failed');
    }
  } catch (error) {
    console.error('Error cancelling:', error);
    AuthUtils.showError('Cancellation failed');
  }
}

// Initialize page
loadShop();
loadServices();
loadAppointments();
