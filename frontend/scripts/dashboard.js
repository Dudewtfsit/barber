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
  // Connect to Socket.IO to receive live appointment events
  try {
    const socket = io();
    const user = AuthUtils.getUserFromToken();
    if (user && user.id) {
      socket.emit('join', `barber_${user.id}`);
    }
    socket.on('appointment_created', (payload) => {
      AuthUtils.showSuccess('New appointment received');
      loadBarberAppointments();
    });
    socket.on('appointment_updated', (payload) => {
      AuthUtils.showSuccess('Appointment updated');
      loadBarberAppointments();
    });
    socket.on('appointment_cancelled', (payload) => {
      AuthUtils.showWarning('Appointment cancelled');
      loadBarberAppointments();
    });
  } catch (err) {
    console.warn('Socket.IO not available', err);
  }
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
        await apiFetch('/api/shop', { method: 'POST', body: JSON.stringify({ name, address, city, state }) });
        AuthUtils.showSuccess('Shop saved successfully!');
        loadShop(); // Refresh shop info
      } catch (error) {
        console.error('Error:', error);
        AuthUtils.showError(error.message || 'Error saving shop. Please try again.');
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
        await apiFetch('/api/services', { method: 'POST', body: JSON.stringify({ name, price, duration_minutes }) });
        AuthUtils.showSuccess('Service added successfully!');
        loadServices(); // Refresh services list
        // Clear form
        document.getElementById('service-name').value = '';
        document.getElementById('service-price').value = '';
        document.getElementById('service-duration').value = '';
      } catch (error) {
        console.error('Error:', error);
        AuthUtils.showError(error.message || 'Error adding service. Please try again.');
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
    const shop = await apiFetch('/api/shop/my-shop');
    document.getElementById('shop-name').value = shop.name || '';
    document.getElementById('shop-address').value = shop.address || '';
    document.getElementById('shop-city').value = shop.city || '';
    document.getElementById('shop-state').value = shop.state || '';
  } catch (error) {
    if (error.status === 404) {
      // No shop yet
    } else {
      console.error('Error loading shop:', error);
    }
  }
}

// Load services for barber
async function loadServices() {
  try {
    const services = await apiFetch('/api/services/my-services');
    const list = document.getElementById('services-list');
    if (list) {
      list.innerHTML = '';
      if (!services || services.length === 0) {
        list.innerHTML = '<p>No services added yet.</p>';
      } else {
        services.forEach(s => {
          const serviceItem = document.createElement('div');
          serviceItem.className = 'service-item';
          const infoDiv = document.createElement('div');
          const h4 = document.createElement('h4');
          h4.textContent = s.name;
          const p = document.createElement('p');
          p.textContent = `$${s.price} - ${s.duration_minutes} minutes`;
          infoDiv.appendChild(h4);
          infoDiv.appendChild(p);
          const delBtn = document.createElement('button');
          delBtn.className = 'btn btn-danger';
          delBtn.textContent = 'Delete';
          delBtn.addEventListener('click', () => deleteService(s.id));
          serviceItem.appendChild(infoDiv);
          serviceItem.appendChild(delBtn);
          list.appendChild(serviceItem);
        });
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
    await apiFetch(`/api/services/${serviceId}`, { method: 'DELETE' });
    AuthUtils.showSuccess('Service deleted successfully');
    loadServices(); // Refresh list
  } catch (error) {
    console.error('Error deleting service:', error);
    AuthUtils.showError(error.message || 'Error deleting service');
  }
}

// Load appointments for barber
async function loadBarberAppointments() {
  try {
    const appointments = await apiFetch('/api/appointments');
    const list = document.getElementById('appointments-list');
    if (list) {
      list.innerHTML = '';
      if (!appointments || appointments.length === 0) {
        list.innerHTML = '<p>No appointments scheduled.</p>';
      } else {
        appointments.forEach(a => {
              const appointmentItem = document.createElement('div');
              appointmentItem.className = 'appointment-item';
              const title = document.createElement('h4');
              title.textContent = `${a.service_name} - ${a.client_name}`;
              const dateP = document.createElement('p');
              dateP.innerHTML = `<strong>Date:</strong> ${new Date(a.start_time).toLocaleDateString()}`;
              const timeP = document.createElement('p');
              timeP.innerHTML = `<strong>Time:</strong> ${new Date(a.start_time).toLocaleTimeString()} - ${new Date(a.end_time).toLocaleTimeString()}`;
              const statusP = document.createElement('p');
              statusP.innerHTML = `<strong>Status:</strong> ${a.status}`;
              const actionsDiv = document.createElement('div');
              // View client profile
              const viewBtn = document.createElement('button');
              viewBtn.className = 'btn btn-secondary';
              viewBtn.textContent = 'View Client';
              viewBtn.addEventListener('click', () => showClientProfile(a.client_id));
              actionsDiv.appendChild(viewBtn);
              if (a.status === 'booked') {
                const doneBtn = document.createElement('button');
                doneBtn.className = 'btn btn-primary';
                doneBtn.textContent = 'Mark Done';
                doneBtn.addEventListener('click', () => updateAppointmentStatus(a.id, 'done'));
                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'btn btn-danger';
                cancelBtn.textContent = 'Cancel';
                cancelBtn.addEventListener('click', () => cancelAppointment(a.id));
                actionsDiv.appendChild(doneBtn);
                actionsDiv.appendChild(cancelBtn);
              }
              appointmentItem.appendChild(title);
              appointmentItem.appendChild(dateP);
              appointmentItem.appendChild(timeP);
              appointmentItem.appendChild(statusP);
              appointmentItem.appendChild(actionsDiv);
              list.appendChild(appointmentItem);
        });
      }
      // Update stats: today's count, upcoming, estimated revenue
      try {
        const today = new Date().toISOString().slice(0,10);
        const todayCount = appointments.filter(a => a.start_time && a.start_time.startsWith(today)).length;
        const upcoming = appointments.filter(a => new Date(a.start_time) > new Date()).length;
        // Estimate revenue by summing service prices if available
        const revenue = appointments.reduce((sum, a) => sum + (parseFloat(a.service_price || 0) || 0), 0);
        document.getElementById('stat-today-count').textContent = todayCount;
        document.getElementById('stat-upcoming').textContent = upcoming;
        document.getElementById('stat-revenue').textContent = `$${revenue.toFixed(2)}`;
      } catch (statErr) {
        console.warn('Stats update failed', statErr);
      }
    }
  } catch (error) {
    console.error('Error loading appointments:', error);
  }
}

// Show client profile modal
async function showClientProfile(clientId) {
  try {
    const client = await apiFetch(`/api/auth/users/${clientId}`);
    document.getElementById('client-name').textContent = client.name;
    document.getElementById('client-email').textContent = client.email;
    document.getElementById('client-meta').textContent = `Role: ${client.role} • Joined: ${new Date(client.created_at).toLocaleDateString()}`;
    document.getElementById('client-modal').style.display = 'block';
  } catch (err) {
    AuthUtils.showError('Unable to load client profile');
  }
}

document.getElementById('close-client-modal').addEventListener('click', () => {
  document.getElementById('client-modal').style.display = 'none';
});

// Load appointments for client
async function loadClientAppointments() {
  try {
    const appointments = await apiFetch('/api/appointments');
    const list = document.getElementById('client-appointments-list');
    if (list) {
      list.innerHTML = '';
      if (!appointments || appointments.length === 0) {
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
                  <button class="btn btn-danger" data-action="cancel-client" data-id="${a.id}">Cancel Appointment</button>
              ` : ''}
            </div>
          `;
          list.appendChild(appointmentItem);
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
    await apiFetch(`/api/appointments/${appointmentId}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
    AuthUtils.showSuccess(`Appointment marked as ${status}`);
    loadBarberAppointments(); // Refresh list
  } catch (error) {
    console.error('Error updating:', error);
    AuthUtils.showError(error.message || 'Update failed');
  }
}

// Cancel appointment (barber)
async function cancelAppointment(appointmentId) {
  if (!confirm('Are you sure you want to cancel this appointment?')) return;

  try {
    await apiFetch(`/api/appointments/${appointmentId}/cancel`, { method: 'PUT' });
    AuthUtils.showSuccess('Appointment cancelled successfully');
    loadBarberAppointments(); // Refresh list
  } catch (error) {
    console.error('Error cancelling:', error);
    AuthUtils.showError(error.message || 'Cancellation failed');
  }
}

// Cancel appointment (client)
async function cancelClientAppointment(appointmentId) {
  if (!confirm('Are you sure you want to cancel this appointment?')) return;

  try {
    await apiFetch(`/api/appointments/${appointmentId}/cancel`, { method: 'PUT' });
    AuthUtils.showSuccess('Appointment cancelled successfully');
    loadClientAppointments(); // Refresh list
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    AuthUtils.showError(error.message || 'Cancellation failed');
  }
}

// Initialize navigation
updateNavigation();

// Event delegation for appointment action buttons (barber)
const barberAppointmentsList = document.getElementById('appointments-list');
if (barberAppointmentsList) {
  barberAppointmentsList.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (!action || !id) return;
    if (action === 'mark-done') {
      updateAppointmentStatus(id, 'done');
    } else if (action === 'cancel') {
      cancelAppointment(id);
    }
  });
}

// Event delegation for client appointment actions
const clientAppointmentsList = document.getElementById('client-appointments-list');
if (clientAppointmentsList) {
  clientAppointmentsList.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (action === 'cancel-client' && id) {
      cancelClientAppointment(id);
    }
  });
}
