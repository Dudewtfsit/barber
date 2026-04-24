const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

let currentAppointments = [];
let currentServices = [];
let currentHours = [];
let dashboardSocket = null;

function requireBarberAccess() {
  if (!AuthUtils.isLoggedIn()) {
    window.location = 'login.html';
    return false;
  }

  if (AuthUtils.getUserRole() !== 'barber') {
    window.location = 'dashboard.html';
    return false;
  }

  return true;
}

function formatDateTime(isoValue) {
  const date = new Date(isoValue);
  return {
    date: date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }),
    time: date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    })
  };
}

function createHoursForm() {
  const form = document.getElementById('hours-form');
  form.innerHTML = dayLabels.map((label, index) => `
    <div class="hours-row" data-day="${index}">
      <div class="hours-day">${label}</div>
      <label class="toggle-line">
        <input type="checkbox" data-hours-enabled="${index}">
        <span>Open</span>
      </label>
      <input type="time" data-hours-start="${index}" value="09:00">
      <input type="time" data-hours-end="${index}" value="17:00">
    </div>
  `).join('');
}

function applyHoursToForm(hours) {
  dayLabels.forEach((_, index) => {
    const enabled = document.querySelector(`[data-hours-enabled="${index}"]`);
    const start = document.querySelector(`[data-hours-start="${index}"]`);
    const end = document.querySelector(`[data-hours-end="${index}"]`);
    const rowData = hours.find((item) => Number(item.day_of_week) === index);

    enabled.checked = Boolean(rowData);
    start.disabled = !rowData;
    end.disabled = !rowData;
    start.value = rowData ? String(rowData.start_hour).slice(0, 5) : '09:00';
    end.value = rowData ? String(rowData.end_hour).slice(0, 5) : '17:00';
  });
}

function collectHoursFromForm() {
  return dayLabels.map((_, index) => {
    const enabled = document.querySelector(`[data-hours-enabled="${index}"]`).checked;
    const start = document.querySelector(`[data-hours-start="${index}"]`).value;
    const end = document.querySelector(`[data-hours-end="${index}"]`).value;

    if (!enabled || !start || !end) return null;
    return {
      day_of_week: index,
      start_hour: start,
      end_hour: end
    };
  }).filter(Boolean);
}

function addActivity(message, type = 'info') {
  const feed = document.getElementById('activity-feed');
  const item = document.createElement('div');
  item.className = `activity-item activity-${type}`;
  item.innerHTML = `<strong>${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</strong><p>${message}</p>`;
  feed.prepend(item);

  while (feed.children.length > 8) {
    feed.removeChild(feed.lastElementChild);
  }
}

function initializeSocket() {
  dashboardSocket = io(window.API_BASE, {
    auth: { token: AuthUtils.getToken() }
  });

  dashboardSocket.on('connect', () => {
    document.getElementById('online-status').textContent = 'Live';
    const user = AuthUtils.getUserFromToken();
    dashboardSocket.emit('join', `barber_${user.id}`);
    addActivity('Realtime dashboard connected.', 'success');
  });

  dashboardSocket.on('disconnect', () => {
    document.getElementById('online-status').textContent = 'Offline';
    addActivity('Realtime dashboard disconnected.', 'warning');
  });

  dashboardSocket.on('client_booking_started', (payload) => {
    const clientName = payload.clientName || 'Client';
    const stepMap = {
      shop: 'started browsing your shop',
      service: 'is choosing a service',
      time: 'is looking at available times'
    };
    addActivity(`${clientName} ${stepMap[payload.step] || 'is active on your page'}.`);
  });

  dashboardSocket.on('client_booking_confirmed', (payload) => {
    addActivity(`${payload.clientName || 'Client'} confirmed ${payload.serviceName || 'a service'}.`, 'success');
    loadAppointments();
  });

  dashboardSocket.on('appointment_created', (payload) => {
    addActivity(`New booking from ${payload.clientName || 'Client'} for ${payload.serviceName || 'a service'}.`, 'success');
    loadAppointments();
  });

  dashboardSocket.on('appointment_updated', () => {
    addActivity('An appointment status was updated.', 'info');
    loadAppointments();
  });

  dashboardSocket.on('appointment_cancelled', (payload) => {
    addActivity(`${payload.clientName || 'A client'} cancelled an appointment.`, 'warning');
    loadAppointments();
  });
}

async function loadShop() {
  try {
    const shop = await apiFetch('/api/shop/my-shop');
    if (!shop) return;

    document.getElementById('shop-name').value = shop.name || '';
    document.getElementById('shop-address').value = shop.address || '';
    document.getElementById('shop-city').value = shop.city || '';
    document.getElementById('shop-state').value = shop.state || '';
    document.getElementById('shop-phone').value = shop.phone || '';
    document.getElementById('shop-description').value = shop.description || '';
  } catch (error) {
    if (error.status !== 404) {
      AuthUtils.showError(error.message || 'Could not load shop.');
    }
  }
}

async function loadHours() {
  try {
    currentHours = await apiFetch('/api/shop/my-hours');
    applyHoursToForm(currentHours);
  } catch (error) {
    AuthUtils.showError(error.message || 'Could not load working hours.');
  }
}

async function loadServices() {
  try {
    currentServices = await apiFetch('/api/services/my-services');
    renderServices();
  } catch (error) {
    AuthUtils.showError(error.message || 'Could not load services.');
  }
}

function renderServices() {
  const list = document.getElementById('services-list');
  if (currentServices.length === 0) {
    list.innerHTML = '<p class="empty-state-message">No services yet. Add your first one so clients can start booking.</p>';
    return;
  }

  list.innerHTML = currentServices.map((service) => `
    <article class="list-card">
      <div>
        <h3>${service.name}</h3>
        <p>$${Number(service.price).toFixed(2)} • ${service.duration_minutes} minutes</p>
      </div>
      <button class="btn btn-secondary" data-delete-service="${service.id}">Delete</button>
    </article>
  `).join('');

  list.querySelectorAll('[data-delete-service]').forEach((button) => {
    button.addEventListener('click', () => deleteService(button.dataset.deleteService));
  });
}

async function deleteService(serviceId) {
  const confirmed = window.confirm('Delete this service?');
  if (!confirmed) return;

  try {
    await apiFetch(`/api/services/${serviceId}`, { method: 'DELETE' });
    AuthUtils.showSuccess('Service deleted.');
    loadServices();
  } catch (error) {
    AuthUtils.showError(error.message || 'Could not delete service.');
  }
}

async function loadAppointments() {
  try {
    currentAppointments = await apiFetch('/api/appointments/barber-appointments');
    renderAppointments();
    updateStats();
  } catch (error) {
    document.getElementById('appointments-list').innerHTML = '<p class="empty-state-message">Could not load appointments.</p>';
    AuthUtils.showError(error.message || 'Could not load appointments.');
  }
}

function updateStats() {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = currentAppointments.filter((appointment) => String(appointment.start_time).slice(0, 10) === today).length;
  const upcoming = currentAppointments.filter((appointment) => appointment.status === 'booked' && new Date(appointment.start_time).getTime() > now);
  const revenue = currentAppointments
    .filter((appointment) => appointment.status !== 'cancelled')
    .reduce((sum, appointment) => sum + Number(appointment.service_price || 0), 0);
  const clientCount = new Set(currentAppointments.map((appointment) => appointment.client_id)).size;

  document.getElementById('stat-today').textContent = todayCount;
  document.getElementById('stat-upcoming').textContent = upcoming.length;
  document.getElementById('stat-revenue').textContent = `$${revenue.toFixed(2)}`;
  document.getElementById('stat-clients').textContent = clientCount;
}

function renderAppointments() {
  const filter = document.getElementById('barber-appointment-filter').value;
  const appointments = filter === 'all'
    ? currentAppointments
    : currentAppointments.filter((appointment) => appointment.status === filter);
  const list = document.getElementById('appointments-list');

  if (appointments.length === 0) {
    list.innerHTML = '<p class="empty-state-message">No appointments match this filter.</p>';
    return;
  }

  list.innerHTML = appointments.map((appointment) => {
    const formatted = formatDateTime(appointment.start_time);
    return `
      <article class="appointment-row-card">
        <div class="appointment-row-main">
          <div class="appointment-row-top">
            <h3>${appointment.client_name}</h3>
            <span class="status-chip status-${appointment.status}">${appointment.status}</span>
          </div>
          <p class="appointment-row-service">${appointment.service_name}</p>
          <div class="appointment-row-meta">
            <span>${formatted.date}</span>
            <span>${formatted.time}</span>
            <span>${appointment.client_email || ''}</span>
            <span>$${Number(appointment.service_price || 0).toFixed(2)}</span>
          </div>
        </div>
        <div class="appointment-row-actions">
          ${appointment.status === 'booked' ? `<button class="btn btn-primary" data-mark-done="${appointment.id}">Mark done</button>` : ''}
          ${appointment.status === 'booked' ? `<button class="btn btn-secondary" data-cancel-appointment="${appointment.id}">Cancel</button>` : ''}
        </div>
      </article>
    `;
  }).join('');

  list.querySelectorAll('[data-mark-done]').forEach((button) => {
    button.addEventListener('click', () => updateAppointmentStatus(button.dataset.markDone, 'done'));
  });

  list.querySelectorAll('[data-cancel-appointment]').forEach((button) => {
    button.addEventListener('click', () => updateAppointmentStatus(button.dataset.cancelAppointment, 'cancelled'));
  });
}

async function updateAppointmentStatus(appointmentId, status) {
  try {
    await apiFetch(`/api/appointments/${appointmentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    AuthUtils.showSuccess(`Appointment marked ${status}.`);
    loadAppointments();
  } catch (error) {
    AuthUtils.showError(error.message || 'Could not update appointment.');
  }
}

async function saveShop(event) {
  event.preventDefault();
  const submitButton = event.target.querySelector('button[type="submit"]');
  AuthUtils.setLoading(submitButton, true, 'Saving...');

  try {
    await apiFetch('/api/shop', {
      method: 'POST',
      body: JSON.stringify({
        name: document.getElementById('shop-name').value.trim(),
        address: document.getElementById('shop-address').value.trim(),
        city: document.getElementById('shop-city').value.trim(),
        state: document.getElementById('shop-state').value.trim(),
        phone: document.getElementById('shop-phone').value.trim(),
        description: document.getElementById('shop-description').value.trim()
      })
    });
    AuthUtils.showSuccess('Shop saved.');
  } catch (error) {
    AuthUtils.showError(error.message || 'Could not save shop.');
  } finally {
    AuthUtils.setLoading(submitButton, false);
  }
}

async function addService(event) {
  event.preventDefault();
  const submitButton = event.target.querySelector('button[type="submit"]');
  AuthUtils.setLoading(submitButton, true, 'Adding...');

  try {
    await apiFetch('/api/services', {
      method: 'POST',
      body: JSON.stringify({
        name: document.getElementById('service-name').value.trim(),
        price: Number(document.getElementById('service-price').value),
        duration_minutes: Number(document.getElementById('service-duration').value)
      })
    });
    event.target.reset();
    AuthUtils.showSuccess('Service added.');
    loadServices();
  } catch (error) {
    AuthUtils.showError(error.message || 'Could not add service.');
  } finally {
    AuthUtils.setLoading(submitButton, false);
  }
}

async function saveHours() {
  const button = document.getElementById('save-hours-btn');
  AuthUtils.setLoading(button, true, 'Saving...');

  try {
    await apiFetch('/api/shop/hours', {
      method: 'PUT',
      body: JSON.stringify({ hours: collectHoursFromForm() })
    });
    AuthUtils.showSuccess('Working hours updated.');
    loadHours();
  } catch (error) {
    AuthUtils.showError(error.message || 'Could not save working hours.');
  } finally {
    AuthUtils.setLoading(button, false);
  }
}

function setupEvents() {
  document.getElementById('logout-link').addEventListener('click', (event) => {
    event.preventDefault();
    AuthUtils.logout();
  });

  document.getElementById('shop-form').addEventListener('submit', saveShop);
  document.getElementById('service-form').addEventListener('submit', addService);
  document.getElementById('save-hours-btn').addEventListener('click', saveHours);
  document.getElementById('barber-appointment-filter').addEventListener('change', renderAppointments);

  dayLabels.forEach((_, index) => {
    document.querySelector(`[data-hours-enabled="${index}"]`).addEventListener('change', (event) => {
      document.querySelector(`[data-hours-start="${index}"]`).disabled = !event.target.checked;
      document.querySelector(`[data-hours-end="${index}"]`).disabled = !event.target.checked;
    });
  });
}

function personalizeDashboard() {
  document.getElementById('barber-greeting').textContent = `${AuthUtils.getUserDisplayName()}, here is your shop dashboard`;
}

async function bootstrapDashboard() {
  createHoursForm();
  personalizeDashboard();
  setupEvents();
  initializeSocket();
  await Promise.all([
    loadShop(),
    loadHours(),
    loadServices(),
    loadAppointments()
  ]);
}

if (requireBarberAccess()) {
  bootstrapDashboard();
}
