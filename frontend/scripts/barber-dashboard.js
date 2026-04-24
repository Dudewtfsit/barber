// Barber Dashboard Script
// Connects barber and client real-time, manages appointments, services, shop info

let currentUser = null;
let barberShop = null;
let appointments = [];
let clients = new Map();
let unreadNotifications = 0;
let socket = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
  const token = AuthUtils.getToken();
  if (!token) {
    window.location = 'login.html';
    return;
  }

  const user = AuthUtils.getUserFromToken();
  if (user.role !== 'barber') {
    window.location = 'dashboard.html';
    return;
  }

  currentUser = user;
  document.getElementById('barber-name').textContent = user.email;

  // Initialize Socket.IO for real-time updates
  initializeSocket();

  // Setup sidebar navigation
  setupNavigation();

  // Load initial data
  await loadBarberData();
  await loadAppointments();
  await loadClients();
  await loadServices();

  // Setup event listeners
  setupEventListeners();

  // Refresh data periodically
  setInterval(loadAppointments, 30000); // Every 30 seconds
  setInterval(updateStats, 60000); // Every 1 minute
});

// Socket.IO initialization for real-time updates
function initializeSocket() {
  const API_BASE = window.API_BASE || (location.hostname === 'localhost' ? 'http://localhost:3002' : 'https://barber-1-ovpr.onrender.com');
  socket = io(API_BASE, {
    auth: { token: AuthUtils.getToken() }
  });

  socket.on('connect', () => {
    console.log('Connected to real-time server');
    document.getElementById('online-status').textContent = '● Online';
    document.getElementById('online-status').style.color = '#27ae60';
    
    // Join barber-specific room
    socket.emit('join', `barber_${currentUser.id}`);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from real-time server');
    document.getElementById('online-status').textContent = '● Offline';
    document.getElementById('online-status').style.color = '#e74c3c';
  });

  // Listen for new appointments from clients
  socket.on('appointment_created', (data) => {
    console.log('New appointment from client:', data);
    addNotification(`New booking from client! Service: ${data.service}`, 'info');
    unreadNotifications++;
    updateNotificationBadge();
    loadAppointments(); // Refresh appointments list
  });

  // Listen for appointment updates
  socket.on('appointment_updated', (data) => {
    addNotification(`Appointment updated: ${data.message}`, 'info');
    loadAppointments();
  });

  // Listen for appointment cancellations
  socket.on('appointment_cancelled', (data) => {
    addNotification(`Appointment cancelled by ${data.clientName || 'client'}`, 'warning');
    loadAppointments();
  });

  // Listen for client activity
  socket.on('client_booking_started', (data) => {
    const clientName = data.clientName || 'Client';
    const shopName = data.shopName ? ` at ${data.shopName}` : '';
    let action = 'browsing your shop';
    if (data.step === 'service') action = 'selecting a service';
    if (data.step === 'time') action = 'choosing a time slot';
    addNotification(`${clientName} is ${action}${shopName}`, 'info');
    unreadNotifications++;
    updateNotificationBadge();
  });

  socket.on('client_booking_confirmed', (data) => {
    const clientName = data.clientName || 'Client';
    const serviceName = data.serviceName || 'a service';
    addNotification(`${clientName} confirmed booking for ${serviceName}`, 'success');
    unreadNotifications++;
    updateNotificationBadge();
    loadAppointments();
  });
}

// Sidebar navigation setup
function setupNavigation() {
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
      const section = item.getAttribute('data-section');
      
      // Remove active class from all items
      document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      // Hide all sections
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      
      // Show selected section
      document.getElementById(section).classList.add('active');
      document.getElementById('page-title').textContent = item.textContent.trim();
    });
  });
}

// Load barber shop info
async function loadBarberData() {
  try {
    const data = await apiFetch('/api/shop/my-shop');
    barberShop = data;
    
    // Populate shop info form
    if (data) {
      document.getElementById('shop-name').value = data.name || '';
      document.getElementById('shop-address').value = data.address || '';
      document.getElementById('shop-city').value = data.city || '';
      document.getElementById('shop-state').value = data.state || '';
      document.getElementById('shop-phone').value = data.phone || '';
      document.getElementById('shop-description').value = data.description || '';
      
      // Load shop hours
      loadShopHours();
    }
  } catch (err) {
    console.log('Shop not created yet');
  }
}

// Load appointments
async function loadAppointments() {
  try {
    const response = await apiFetch('/api/appointments/barber-appointments');
    appointments = response || [];
    
    // Filter and display appointments
    displayAppointments(appointments);
    updateStats();
    await loadClients();
  } catch (err) {
    console.error('Error loading appointments:', err);
  }
}

// Display appointments in cards
function displayAppointments(appts) {
  const upcoming = appts
    .filter(a => new Date(a.start_time) >= new Date())
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const dashboardContainer = document.getElementById('upcoming-appointments');
  const allContainer = document.getElementById('all-appointments');
  
  if (upcoming.length === 0) {
    dashboardContainer.innerHTML = '<div class="empty-state"><h3>No upcoming appointments</h3></div>';
  } else {
    dashboardContainer.innerHTML = upcoming.slice(0, 6).map(apt => createAppointmentCard(apt)).join('');
  }

  // Filter based on selected status
  const filter = document.getElementById('appointment-filter')?.value || 'all';
  const filtered = filter === 'all' ? appts : appts.filter(a => a.status === filter);
  
  if (filtered.length === 0) {
    allContainer.innerHTML = '<div class="empty-state"><h3>No appointments found</h3></div>';
  } else {
    allContainer.innerHTML = filtered.map(apt => createAppointmentCard(apt)).join('');
  }

  // Add event listeners to action buttons
  document.querySelectorAll('.btn-accept').forEach(btn => {
    btn.addEventListener('click', (e) => updateAppointmentStatus(e.target.dataset.aptId, 'done'));
  });

  document.querySelectorAll('.btn-done').forEach(btn => {
    btn.addEventListener('click', (e) => updateAppointmentStatus(e.target.dataset.aptId, 'done'));
  });

  document.querySelectorAll('.btn-cancel').forEach(btn => {
    btn.addEventListener('click', (e) => cancelAppointment(e.target.dataset.aptId));
  });
}

// Create appointment card HTML
function createAppointmentCard(apt) {
  const startTime = new Date(apt.start_time);
  const endTime = new Date(apt.end_time);
  const timeStr = startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const dateStr = startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  
  let statusBadge = `<span class="badge badge-warning">${apt.status}</span>`;
  if (apt.status === 'done') statusBadge = `<span class="badge badge-success">${apt.status}</span>`;
  if (apt.status === 'cancelled') statusBadge = `<span class="badge badge-danger">${apt.status}</span>`;

  let actionButtons = '';
  if (apt.status === 'booked') {
    actionButtons = `
      <div class="appointment-actions">
        <button class="btn-small btn-done" data-apt-id="${apt.id}" onclick="updateAppointmentStatus(${apt.id}, 'done')">Mark Done</button>
        <button class="btn-small btn-cancel" data-apt-id="${apt.id}" onclick="cancelAppointment(${apt.id})">Cancel</button>
      </div>
    `;
  }

  const clientName = apt.client_name || `Client ${apt.client_id}`;
  const serviceName = apt.service_name || `Service ${apt.service_id}`;

  return `
    <div class="appointment-card ${apt.status}">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div class="appointment-time">${timeStr}</div>
          <div style="font-size: 0.9rem; color: #95a5a6;">${dateStr}</div>
        </div>
        ${statusBadge}
      </div>
      <div class="appointment-client">👤 ${clientName}</div>
      <div class="appointment-service">💼 ${serviceName}</div>
      ${actionButtons}
    </div>
  `;
}

// Update appointment status
async function updateAppointmentStatus(aptId, status) {
  try {
    await apiFetch(`/api/appointments/${aptId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    
    addNotification(`Appointment marked as ${status}`, 'success');
    loadAppointments();
    
    // Notify client via Socket.IO
    if (socket) {
      socket.emit('barber_appointment_updated', {
        appointmentId: aptId,
        status: status
      });
    }
  } catch (err) {
    addNotification('Error updating appointment', 'error');
  }
}

// Cancel appointment
async function cancelAppointment(aptId) {
  if (confirm('Are you sure you want to cancel this appointment?')) {
    try {
      await apiFetch(`/api/appointments/${aptId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'cancelled' })
      });
      
      addNotification('Appointment cancelled', 'success');
      loadAppointments();
      
      // Notify client via Socket.IO
      if (socket) {
        socket.emit('barber_appointment_cancelled', {
          appointmentId: aptId
        });
      }
    } catch (err) {
      addNotification('Error cancelling appointment', 'error');
    }
  }
}

// Load clients
async function loadClients() {
  try {
    // Build client dashboard from appointment history
    const appts = appointments;
    const clientMap = new Map();
    
    appts.forEach(apt => {
      const clientId = apt.client_id;
      const clientName = apt.client_name || `Client ${clientId}`;
      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          id: clientId,
          name: clientName,
          bookings: 0,
          spent: 0,
          lastAppointment: null
        });
      }
      
      const client = clientMap.get(clientId);
      client.bookings++;
      client.spent += apt.service_price || 0;
      if (!client.lastAppointment || new Date(apt.start_time) > new Date(client.lastAppointment)) {
        client.lastAppointment = apt.start_time;
      }
    });

    clients = clientMap;
    displayClients(clientMap);
  } catch (err) {
    console.error('Error loading clients:', err);
  }
}

// Display clients in table
function displayClients(clientMap) {
  const tbody = document.getElementById('clients-body');
  
  if (clientMap.size === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">No clients yet</td></tr>';
    document.getElementById('total-clients').textContent = '0';
    return;
  }

  tbody.innerHTML = Array.from(clientMap.values())
    .sort((a, b) => new Date(b.lastAppointment) - new Date(a.lastAppointment))
    .map(client => `
      <tr>
        <td>Client ${client.id}</td>
        <td><small>client-${client.id}@example.com</small></td>
        <td>${client.bookings}</td>
        <td>$${client.spent.toFixed(2)}</td>
        <td>${new Date(client.lastAppointment).toLocaleDateString()}</td>
      </tr>
    `)
    .join('');

  document.getElementById('total-clients').textContent = clientMap.size;
}

// Load services
async function loadServices() {
  try {
    const response = await apiFetch('/api/services/my-services');
    const services = response || [];
    
    const tbody = document.getElementById('services-body');
    if (services.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No services added yet</td></tr>';
      return;
    }

    tbody.innerHTML = services.map(service => `
      <tr>
        <td>${service.name}</td>
        <td>$${service.price}</td>
        <td>${service.duration_minutes} min</td>
        <td><button class="btn-small" onclick="deleteService(${service.id})">Delete</button></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading services:', err);
  }
}

// Add service
async function addService() {
  const name = document.getElementById('service-name').value;
  const price = document.getElementById('service-price').value;
  const duration = document.getElementById('service-duration').value;

  if (!name || !price || !duration) {
    addNotification('Please fill all fields', 'error');
    return;
  }

  try {
    await apiFetch('/api/services', {
      method: 'POST',
      body: JSON.stringify({
        name,
        price: parseFloat(price),
        duration_minutes: parseInt(duration)
      })
    });

    addNotification('Service added successfully', 'success');
    document.getElementById('service-name').value = '';
    document.getElementById('service-price').value = '';
    document.getElementById('service-duration').value = '';
    loadServices();
  } catch (err) {
    addNotification('Error adding service', 'error');
  }
}

// Delete service
async function deleteService(serviceId) {
  if (confirm('Delete this service?')) {
    try {
      await apiFetch(`/api/services/${serviceId}`, { method: 'DELETE' });
      addNotification('Service deleted', 'success');
      loadServices();
    } catch (err) {
      addNotification('Error deleting service', 'error');
    }
  }
}

// Save shop info
async function saveShop() {
  const shopData = {
    name: document.getElementById('shop-name').value,
    address: document.getElementById('shop-address').value,
    city: document.getElementById('shop-city').value,
    state: document.getElementById('shop-state').value,
    phone: document.getElementById('shop-phone').value,
    description: document.getElementById('shop-description').value
  };

  if (!shopData.name || !shopData.address) {
    addNotification('Please fill required fields', 'error');
    return;
  }

  try {
    await apiFetch('/api/shop', {
      method: 'POST',
      body: JSON.stringify(shopData)
    });
    addNotification('Shop info saved successfully', 'success');
  } catch (err) {
    addNotification('Error saving shop info', 'error');
  }
}

// Load and display shop hours
async function loadShopHours() {
  try {
    const response = await apiFetch('/api/shop/hours/my-hours');
    const hours = response || [];
    
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let hoursForm = '';

    daysOfWeek.forEach((day, index) => {
      const dayHours = hours[index] || { start_hour: '09:00', end_hour: '17:00' };
      hoursForm += `
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 15px; align-items: end;">
          <div class="form-group" style="margin-bottom: 0;">
            <label>${day}</label>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <input type="time" id="start-${index}" value="${dayHours.start_hour}" placeholder="Start">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <input type="time" id="end-${index}" value="${dayHours.end_hour}" placeholder="End">
          </div>
        </div>
      `;
    });

    document.getElementById('hours-form').innerHTML = hoursForm;
  } catch (err) {
    console.error('Error loading hours:', err);
  }
}

// Save hours
async function saveHours() {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const hours = [];

  daysOfWeek.forEach((day, index) => {
    const startTime = document.getElementById(`start-${index}`)?.value;
    const endTime = document.getElementById(`end-${index}`)?.value;
    
    if (startTime && endTime) {
      hours.push({
        day_of_week: index,
        start_hour: startTime,
        end_hour: endTime
      });
    }
  });

  try {
    await apiFetch('/api/shop/hours', {
      method: 'POST',
      body: JSON.stringify({ hours })
    });
    addNotification('Hours saved successfully', 'success');
  } catch (err) {
    addNotification('Error saving hours', 'error');
  }
}

// Update stats on dashboard
function updateStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Today's appointments
  const todayAppts = appointments.filter(a => {
    const apptDate = new Date(a.start_time);
    apptDate.setHours(0, 0, 0, 0);
    return apptDate.getTime() === today.getTime() && a.status === 'booked';
  });

  // Pending appointments (not done or cancelled)
  const pending = appointments.filter(a => a.status === 'booked');

  // Today's revenue
  const todayRevenue = todayAppts.reduce((sum, a) => sum + (a.service_price || 0), 0);

  // Total revenue
  const totalRevenue = appointments.reduce((sum, a) => sum + (a.service_price || 0), 0);

  // Update stats
  document.getElementById('today-count').textContent = todayAppts.length;
  document.getElementById('pending-count').textContent = pending.length;
  document.getElementById('revenue-today').textContent = `$${todayRevenue.toFixed(2)}`;
  document.getElementById('total-clients').textContent = clients.size;
  
  // Analytics stats
  document.getElementById('total-revenue').textContent = `$${totalRevenue.toFixed(2)}`;
  document.getElementById('total-appointments').textContent = appointments.length;

  // Completion rate
  const completed = appointments.filter(a => a.status === 'done').length;
  const completionRate = appointments.length > 0 ? Math.round((completed / appointments.length) * 100) : 0;
  document.getElementById('completion-rate').textContent = `${completionRate}%`;

  // Cancellation rate
  const cancelled = appointments.filter(a => a.status === 'cancelled').length;
  const cancellationRate = appointments.length > 0 ? Math.round((cancelled / appointments.length) * 100) : 0;
  document.getElementById('cancellation-rate').textContent = `${cancellationRate}%`;

  renderServiceRevenue();
}

function renderServiceRevenue() {
  const revenueByService = appointments.reduce((acc, apt) => {
    if (!apt.service_name) return acc;
    acc[apt.service_name] = (acc[apt.service_name] || 0) + (apt.service_price || 0);
    return acc;
  }, {});

  const serviceRevenueList = document.getElementById('service-revenue-list');
  if (!serviceRevenueList) return;

  const entries = Object.entries(revenueByService).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    serviceRevenueList.innerHTML = '<p class="empty-state-message">Revenue will appear here after your first appointments.</p>';
    return;
  }

  serviceRevenueList.innerHTML = `
    <table>
      <thead>
        <tr><th>Service</th><th>Revenue</th></tr>
      </thead>
      <tbody>
        ${entries.map(([service, amount]) => `
          <tr>
            <td>${service}</td>
            <td>$${amount.toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Add notification
function addNotification(message, type = 'info') {
  const container = document.getElementById('notifications-container');
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  container.insertBefore(notification, container.firstChild);
  
  // Auto remove after 5 seconds
  setTimeout(() => notification.remove(), 5000);
}

// Update notification badge
function updateNotificationBadge() {
  document.getElementById('unread-count').textContent = unreadNotifications;
}

// Close modal
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('show');
}

// Handle logout
function handleLogout() {
  AuthUtils.removeToken();
  window.location = 'login.html';
}

// Setup event listeners
function setupEventListeners() {
  // Appointment filter
  const filterSelect = document.getElementById('appointment-filter');
  if (filterSelect) {
    filterSelect.addEventListener('change', () => {
      displayAppointments(appointments);
    });
  }

  // Click outside modal to close
  window.addEventListener('click', (e) => {
    const modal = document.getElementById('clientModal');
    if (e.target === modal) {
      modal.classList.remove('show');
    }
  });
}
