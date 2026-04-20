// scripts/dashboard.js
if (!AuthUtils.isLoggedIn()) {
  window.location = 'login.html';
}

// Check user role from token
const userRole = AuthUtils.getUserRole();

// Update navigation based on authentication status
function updateNavigation() {
  const navLinks = document.getElementById('nav-links');
  const loginLink = document.getElementById('login-link');
  const registerLink = document.getElementById('register-link');
  const logoutLink = document.getElementById('logout-link');
  const dashboardLink = document.getElementById('dashboard-link');

  if (AuthUtils.isLoggedIn()) {
    loginLink.style.display = 'none';
    registerLink.style.display = 'none';
    logoutLink.style.display = 'inline';
    dashboardLink.style.display = 'inline';

    if (userRole === 'barber') {
      dashboardLink.textContent = 'Barber Dashboard';
    } else {
      dashboardLink.textContent = 'My Appointments';
    }
  } else {
    loginLink.style.display = 'inline';
    registerLink.style.display = 'inline';
    logoutLink.style.display = 'none';
    dashboardLink.style.display = 'none';
  }
}

// Navigation event listeners
document.getElementById('home-link').addEventListener('click', (e) => {
  e.preventDefault();
  window.location = 'index.html';
});

document.getElementById('booking-link').addEventListener('click', (e) => {
  e.preventDefault();
  window.location = 'booking.html';
});

document.getElementById('login-link').addEventListener('click', (e) => {
  e.preventDefault();
  window.location = 'login.html';
});

document.getElementById('register-link').addEventListener('click', (e) => {
  e.preventDefault();
  window.location = 'register.html';
});

document.getElementById('logout-link').addEventListener('click', (e) => {
  e.preventDefault();
  AuthUtils.logout();
});

// Initialize dashboard based on user role
if (userRole === 'barber') {
  document.getElementById('barber-dashboard').style.display = 'block';
  initializeBarberDashboard();
} else if (userRole === 'client') {
  document.getElementById('client-dashboard').style.display = 'block';
  initializeClientDashboard();
}

function initializeBarberDashboard() {
  // Shop management
  const shopForm = document.getElementById('shopForm');
  if (shopForm) {
    shopForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('shop-name').value;
      const address = document.getElementById('shop-address').value;
      const city = document.getElementById('shop-city').value;
      const state = document.getElementById('shop-state').value;
      const submitBtn = e.target.querySelector('button[type="submit"]');
      
      // Validation
      if (!name || !address || !city || !state) {
        AuthUtils.showError('Please fill in all fields');
        return;
      }

      AuthUtils.setLoading(submitBtn, true);
      try {
        const res = await fetch('https://barber-1-ovpr.onrender.com/api/shop', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + AuthUtils.getToken()
          },
          body: JSON.stringify({ name, address, city, state })
        });
        const data = await res.json();
        if (res.ok) {
          AuthUtils.showSuccess('Shop saved successfully!');
          loadShop(); // Refresh shop info
        } else {
          AuthUtils.showError(data.message || 'Error saving shop');
        }
      } catch (error) {
        console.error('Error:', error);
        AuthUtils.showError('Error saving shop. Please try again.');
      } finally {
        AuthUtils.setLoading(submitBtn, false);
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
      const submitBtn = e.target.querySelector('button[type="submit"]');
      
      // Validation
      if (!name || !price || !duration_minutes) {
        AuthUtils.showError('Please fill in all service fields');
        return;
      }
      
      if (price <= 0) {
        AuthUtils.showError('Price must be greater than 0');
        return;
      }
      
      if (duration_minutes <= 0) {
        AuthUtils.showError('Duration must be greater than 0 minutes');
        return;
      }

      AuthUtils.setLoading(submitBtn, true);
      try {
        const res = await fetch('https://barber-1-ovpr.onrender.com/api/services', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + AuthUtils.getToken()
          },
          body: JSON.stringify({ name, price, duration_minutes })
        });
        const data = await res.json();
        if (res.ok) {
          AuthUtils.showSuccess('Service added successfully!');
          loadServices(); // Refresh services list
          // Clear form
          document.getElementById('service-name').value = '';
          document.getElementById('service-price').value = '';
          document.getElementById('service-duration').value = '';
        } else {
          AuthUtils.showError(data.message || 'Error adding service');
        }
      } catch (error) {
        console.error('Error:', error);
        AuthUtils.showError('Error adding service. Please try again.');
      } finally {
        AuthUtils.setLoading(submitBtn, false);
      }
    });
  }

  // Load barber data
  loadShop();
  loadServices();
  loadBarberAppointments();
}

function initializeClientDashboard() {
  loadClientAppointments();
}

// Load shop info for barber
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

// Load services for barber
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
        if (services.length === 0) {
          list.innerHTML = '<p>No services added yet.</p>';
        } else {
          services.forEach(s => {
            const serviceItem = document.createElement('div');
            serviceItem.className = 'service-item';
            serviceItem.innerHTML = `
              <div>
                <h4>${s.name}</h4>
                <p>$${s.price} - ${s.duration_minutes} minutes</p>
              </div>
              <button class="btn btn-danger" onclick="deleteService(${s.id})">Delete</button>
            `;
            list.appendChild(serviceItem);
          });
        }
      }
    }
  } catch (error) {
    console.error('Error loading services:', error);
  }
}

// Delete service
async function deleteService(serviceId) {
  if (!confirm('Are you sure you want to delete this service?')) return;

  try {
    const res = await fetch(`https://barber-1-ovpr.onrender.com/api/services/${serviceId}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + AuthUtils.getToken() }
    });
    if (res.ok) {
      AuthUtils.showSuccess('Service deleted successfully');
      loadServices(); // Refresh list
    } else {
      AuthUtils.showError('Error deleting service');
    }
  } catch (error) {
    console.error('Error deleting service:', error);
    AuthUtils.showError('Error deleting service');
  }
}

// Load appointments for barber
async function loadBarberAppointments() {
  try {
    const res = await fetch('https://barber-1-ovpr.onrender.com/api/appointments', {
      headers: { 'Authorization': 'Bearer ' + AuthUtils.getToken() }
    });
    if (res.ok) {
      const appointments = await res.json();
      const list = document.getElementById('appointments-list');
      if (list) {
        list.innerHTML = '';
        if (appointments.length === 0) {
          list.innerHTML = '<p>No appointments scheduled.</p>';
        } else {
          appointments.forEach(a => {
            const appointmentItem = document.createElement('div');
            appointmentItem.className = 'appointment-item';
            appointmentItem.innerHTML = `
              <h4>${a.service_name} - ${a.client_name}</h4>
              <p><strong>Date:</strong> ${new Date(a.start_time).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${new Date(a.start_time).toLocaleTimeString()} - ${new Date(a.end_time).toLocaleTimeString()}</p>
              <p><strong>Status:</strong> ${a.status}</p>
              <div>
                ${a.status === 'booked' ? `
                  <button class="btn btn-primary" onclick="updateAppointmentStatus(${a.id}, 'done')">Mark Done</button>
                  <button class="btn btn-danger" onclick="cancelAppointment(${a.id})">Cancel</button>
                ` : ''}
              </div>
            `;
            list.appendChild(appointmentItem);
          });
        }
      }
    }
  } catch (error) {
    console.error('Error loading appointments:', error);
  }
}

// Load appointments for client
async function loadClientAppointments() {
  try {
    const res = await fetch('https://barber-1-ovpr.onrender.com/api/appointments', {
      headers: { 'Authorization': 'Bearer ' + AuthUtils.getToken() }
    });
    if (res.ok) {
      const appointments = await res.json();
      const list = document.getElementById('client-appointments-list');
      if (list) {
        list.innerHTML = '';
        if (appointments.length === 0) {
          list.innerHTML = '<p>You have no appointments scheduled.</p>';
        } else {
          appointments.forEach(a => {
            const appointmentItem = document.createElement('div');
            appointmentItem.className = 'appointment-item';
            appointmentItem.innerHTML = `
              <h4>${a.service_name} at ${a.shop_name}</h4>
              <p><strong>Date:</strong> ${new Date(a.start_time).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${new Date(a.start_time).toLocaleTimeString()} - ${new Date(a.end_time).toLocaleTimeString()}</p>
              <p><strong>Status:</strong> ${a.status}</p>
              <div>
                ${a.status === 'booked' ? `
                  <button class="btn btn-danger" onclick="cancelClientAppointment(${a.id})">Cancel Appointment</button>
                ` : ''}
              </div>
            `;
            list.appendChild(appointmentItem);
          });
        }
      }
    }
  } catch (error) {
    console.error('Error loading appointments:', error);
  }
}

// Update appointment status (barber only)
async function updateAppointmentStatus(appointmentId, status) {
  try {
    const res = await fetch(`https://barber-1-ovpr.onrender.com/api/appointments/${appointmentId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + AuthUtils.getToken()
      },
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

// Cancel appointment (barber)
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

// Cancel appointment (client)
async function cancelClientAppointment(appointmentId) {
  if (!confirm('Are you sure you want to cancel this appointment?')) return;

  try {
    const res = await fetch(`https://barber-1-ovpr.onrender.com/api/appointments/${appointmentId}/cancel`, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + AuthUtils.getToken() }
    });
    const data = await res.json();
    if (res.ok) {
      AuthUtils.showSuccess('Appointment cancelled successfully');
      loadClientAppointments(); // Refresh list
    } else {
      AuthUtils.showError(data.message || 'Cancellation failed');
    }
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    AuthUtils.showError('Cancellation failed');
  }
}

// Initialize navigation
updateNavigation();
