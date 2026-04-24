let currentStep = 1;
let allShops = [];
let currentServices = [];
let selectedShop = null;
let selectedService = null;
let selectedDateTime = null;
let socket = null;
let bookingActivityState = {
  shopSelected: false,
  serviceSelected: false,
  timeSelected: false
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

function ensureClientAccess() {
  if (!AuthUtils.isLoggedIn()) {
    window.location = 'login.html';
    return false;
  }

  if (AuthUtils.getUserRole() === 'barber') {
    window.location = 'barber-dashboard.html';
    return false;
  }

  return true;
}

function initializeSocket() {
  try {
    socket = io(window.API_BASE, {
      auth: { token: AuthUtils.getToken() }
    });
  } catch (error) {
    console.warn('Socket initialization failed:', error);
  }
}

function updateNavigation() {
  const loginLink = document.getElementById('login-link');
  const registerLink = document.getElementById('register-link');
  const logoutLink = document.getElementById('logout-link');
  const dashboardLink = document.getElementById('dashboard-link');

  loginLink.style.display = 'none';
  registerLink.style.display = 'none';
  logoutLink.style.display = 'inline-flex';
  dashboardLink.style.display = 'inline-flex';
  dashboardLink.textContent = 'My Appointments';
  dashboardLink.onclick = () => {
    window.location = 'dashboard.html';
  };
}

function setupNavigationEvents() {
  document.getElementById('home-link').addEventListener('click', (event) => {
    event.preventDefault();
    window.location = 'index.html';
  });

  document.getElementById('booking-link').addEventListener('click', (event) => {
    event.preventDefault();
    window.location = 'booking.html';
  });

  document.getElementById('logout-link').addEventListener('click', (event) => {
    event.preventDefault();
    AuthUtils.logout();
  });

  document.getElementById('next-step').addEventListener('click', nextStep);
  document.getElementById('prev-step').addEventListener('click', prevStep);
  document.getElementById('back-to-datetime').addEventListener('click', prevStep);
  document.getElementById('confirm-booking').addEventListener('click', confirmBooking);
  document.getElementById('booking-shop-search').addEventListener('input', renderShopOptions);
  document.getElementById('booking-shop-sort').addEventListener('change', renderShopOptions);
  document.getElementById('appointment-date').addEventListener('change', loadTimeSlots);
  document.getElementById('appointment-time').addEventListener('change', handleTimeSelection);
}

async function loadShops() {
  try {
    allShops = await apiFetch('/api/shop');
    renderShopOptions();
    selectStoredShopIfAvailable();
  } catch (error) {
    AuthUtils.showError(error.message || 'Could not load shops.');
  }
}

function renderShopOptions() {
  const shopsList = document.getElementById('shops-list');
  const query = document.getElementById('booking-shop-search').value.trim().toLowerCase();
  const sortBy = document.getElementById('booking-shop-sort').value;
  const filteredShops = allShops
    .filter((shop) => [shop.name, shop.address, shop.city, shop.state, shop.description]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query))
    .sort((a, b) => String(a[sortBy] || '').localeCompare(String(b[sortBy] || '')));

  if (filteredShops.length === 0) {
    shopsList.innerHTML = '<p class="empty-state-message">No shops match that search yet.</p>';
    return;
  }

  shopsList.innerHTML = filteredShops.map((shop) => {
    const isSelected = selectedShop && Number(selectedShop.id) === Number(shop.id);
    const initials = String(shop.name || 'BB')
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return `
      <article class="shop-card enhanced-shop-card ${isSelected ? 'selected' : ''}" data-shop-id="${shop.id}">
        <div class="shop-card-topline">
          <span class="shop-avatar">${initials || 'BB'}</span>
          <span class="status-pill">${isSelected ? 'Selected' : 'Open for booking'}</span>
        </div>
        <h3>${escapeHtml(shop.name)}</h3>
        <p>${escapeHtml([shop.address, shop.city, shop.state].filter(Boolean).join(', '))}</p>
        <p class="shop-description">${escapeHtml(shop.description || 'Pick this shop to review services and available times.')}</p>
        <button class="btn btn-primary" type="button">${isSelected ? 'Selected' : 'Select Shop'}</button>
      </article>
    `;
  }).join('');

  shopsList.querySelectorAll('[data-shop-id]').forEach((card) => {
    card.querySelector('button').addEventListener('click', () => {
      const shop = allShops.find((item) => String(item.id) === card.dataset.shopId);
      if (shop) selectShop(shop);
    });
  });
}

function selectStoredShopIfAvailable() {
  const selectedShopId = localStorage.getItem('selectedShopId');
  if (!selectedShopId) return;

  localStorage.removeItem('selectedShopId');
  const matchedShop = allShops.find((shop) => String(shop.id) === String(selectedShopId));
  if (matchedShop) {
    selectShop(matchedShop);
  }
}

function emitClientActivity(step) {
  if (!socket || !socket.connected || !selectedShop) return;
  if (bookingActivityState[`${step}Selected`]) return;

  bookingActivityState[`${step}Selected`] = true;
  const user = AuthUtils.getUserFromToken() || {};

  socket.emit('client_booking_started', {
    shopId: selectedShop.id,
    shopName: selectedShop.name,
    clientId: user.id,
    clientName: user.name || user.email || 'Client',
    step
  });
}

function selectShop(shop) {
  selectedShop = {
    id: shop.id,
    name: shop.name,
    address: [shop.address, shop.city, shop.state].filter(Boolean).join(', ')
  };
  selectedService = null;
  selectedDateTime = null;
  currentServices = [];
  bookingActivityState = { shopSelected: false, serviceSelected: false, timeSelected: false };
  emitClientActivity('shop');
  renderShopOptions();
  resetDateTimeControls();
  updateLiveSummary();
  nextStep();
}

async function loadServices() {
  if (!selectedShop) return;

  const servicesList = document.getElementById('services-list');
  servicesList.innerHTML = '<p class="form-success">Loading services...</p>';

  try {
    currentServices = await apiFetch(`/api/services/${selectedShop.id}`);

    if (currentServices.length === 0) {
      servicesList.innerHTML = '<p class="empty-state-message">This shop has not added services yet.</p>';
      return;
    }

    servicesList.innerHTML = currentServices.map((service) => `
      <article class="service-item ${selectedService && Number(selectedService.id) === Number(service.id) ? 'selected' : ''}">
        <div>
          <h4>${escapeHtml(service.name)}</h4>
          <p>$${Number(service.price).toFixed(2)} • ${service.duration_minutes} minutes</p>
        </div>
        <button class="btn btn-primary" type="button" data-service-id="${service.id}">
          ${selectedService && Number(selectedService.id) === Number(service.id) ? 'Selected' : 'Choose'}
        </button>
      </article>
    `).join('');

    servicesList.querySelectorAll('[data-service-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const service = currentServices.find((item) => String(item.id) === button.dataset.serviceId);
        if (service) selectService(service);
      });
    });
  } catch (error) {
    servicesList.innerHTML = '<p class="empty-state-message">Could not load services.</p>';
    AuthUtils.showError(error.message || 'Could not load services.');
  }
}

function selectService(service) {
  selectedService = {
    id: service.id,
    name: service.name,
    price: Number(service.price),
    duration: Number(service.duration_minutes)
  };
  selectedDateTime = null;
  emitClientActivity('service');
  resetDateTimeControls();
  updateLiveSummary();
  loadServices();
  nextStep();
}

function resetDateTimeControls() {
  const dateInput = document.getElementById('appointment-date');
  const timeSelect = document.getElementById('appointment-time');
  const helper = document.getElementById('slot-helper');
  const today = new Date().toISOString().slice(0, 10);

  dateInput.min = today;
  dateInput.value = '';
  timeSelect.innerHTML = '<option value="">Select a time</option>';
  helper.textContent = selectedService
    ? 'Choose a date to see live availability.'
    : 'Choose a service and date to see available slots.';
}

async function loadTimeSlots() {
  const date = document.getElementById('appointment-date').value;
  const timeSelect = document.getElementById('appointment-time');
  const helper = document.getElementById('slot-helper');

  timeSelect.innerHTML = '<option value="">Select a time</option>';
  selectedDateTime = null;
  updateLiveSummary();

  if (!selectedShop || !selectedService || !date) return;

  helper.textContent = 'Checking live slots...';

  try {
    const response = await apiFetch(`/api/appointments/slots?shopId=${selectedShop.id}&serviceId=${selectedService.id}&date=${date}`);
    const slots = response.slots || [];

    if (slots.length === 0) {
      helper.textContent = 'No slots are available for that date. Try another day.';
      return;
    }

    timeSelect.innerHTML += slots.map((slot) => {
      const slotDate = new Date(slot);
      const timeLabel = slotDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      return `<option value="${slot}">${timeLabel}</option>`;
    }).join('');
    helper.textContent = `${slots.length} live slot${slots.length === 1 ? '' : 's'} available.`;
  } catch (error) {
    helper.textContent = 'Could not load live slots right now.';
    AuthUtils.showError(error.message || 'Could not load live slots.');
  }
}

function handleTimeSelection() {
  const selectedSlot = document.getElementById('appointment-time').value;
  selectedDateTime = selectedSlot ? { iso: selectedSlot } : null;
  if (selectedDateTime) emitClientActivity('time');
  updateLiveSummary();
}

function calculateEndTime(startIso, durationMinutes) {
  const end = new Date(new Date(startIso).getTime() + Number(durationMinutes) * 60000);
  return end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function showConfirmation() {
  if (!selectedService || !selectedDateTime) {
    AuthUtils.showError('Please choose a date and time first.');
    currentStep = 3;
    showStep();
    return;
  }

  const start = new Date(selectedDateTime.iso);
  const summary = document.getElementById('booking-summary');
  summary.innerHTML = `
    <div class="booking-summary">
      <p><strong>Shop:</strong> ${escapeHtml(selectedShop.name)}</p>
      <p><strong>Address:</strong> ${escapeHtml(selectedShop.address)}</p>
      <p><strong>Service:</strong> ${escapeHtml(selectedService.name)}</p>
      <p><strong>Price:</strong> $${selectedService.price.toFixed(2)}</p>
      <p><strong>Date:</strong> ${formatDate(start)}</p>
      <p><strong>Time:</strong> ${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${calculateEndTime(selectedDateTime.iso, selectedService.duration)}</p>
    </div>
  `;
}

async function confirmBooking() {
  if (!selectedShop || !selectedService || !selectedDateTime) {
    AuthUtils.showError('Please complete all booking steps.');
    return;
  }

  const confirmBtn = document.getElementById('confirm-booking');
  AuthUtils.setLoading(confirmBtn, true, 'Confirming...');

  try {
    await apiFetch('/api/appointments/book', {
      method: 'POST',
      body: JSON.stringify({
        shopId: selectedShop.id,
        serviceId: selectedService.id,
        startTime: selectedDateTime.iso
      })
    });

    const user = AuthUtils.getUserFromToken() || {};
    if (socket && socket.connected) {
      socket.emit('client_booking_confirmed', {
        shopId: selectedShop.id,
        shopName: selectedShop.name,
        clientId: user.id,
        clientName: user.name || user.email || 'Client',
        serviceName: selectedService.name,
        startTime: selectedDateTime.iso
      });
    }

    AuthUtils.showSuccess('Appointment booked successfully.');
    setTimeout(() => {
      window.location = 'dashboard.html';
    }, 900);
  } catch (error) {
    AuthUtils.showError(error.message || 'Booking failed.');
  } finally {
    AuthUtils.setLoading(confirmBtn, false);
  }
}

function nextStep() {
  if (currentStep === 1 && !selectedShop) {
    AuthUtils.showError('Please select a shop first.');
    return;
  }

  if (currentStep === 2 && !selectedService) {
    AuthUtils.showError('Please choose a service first.');
    return;
  }

  if (currentStep === 3 && !selectedDateTime) {
    AuthUtils.showError('Please choose a date and time first.');
    return;
  }

  currentStep = Math.min(currentStep + 1, 4);
  showStep();

  if (currentStep === 2) loadServices();
  if (currentStep === 4) showConfirmation();
}

function prevStep() {
  currentStep = Math.max(currentStep - 1, 1);
  showStep();
}

function updateNavigationButtons() {
  const nav = document.querySelector('.booking-navigation');
  const prevBtn = document.getElementById('prev-step');
  const nextBtn = document.getElementById('next-step');

  nav.style.display = currentStep === 1 || currentStep === 4 ? 'none' : 'flex';
  prevBtn.style.display = currentStep > 1 ? 'inline-flex' : 'none';
  nextBtn.style.display = currentStep < 4 ? 'inline-flex' : 'none';
}

function updateProgress() {
  document.querySelectorAll('[data-progress-step]').forEach((item) => {
    item.classList.toggle('active', Number(item.dataset.progressStep) <= currentStep);
  });
}

function showStep() {
  const sections = ['shop-selection', 'service-selection', 'datetime-selection', 'confirmation'];
  sections.forEach((sectionId, index) => {
    document.getElementById(sectionId).style.display = currentStep === index + 1 ? 'block' : 'none';
  });
  updateNavigationButtons();
  updateProgress();
}

function updateLiveSummary() {
  const summary = document.getElementById('live-summary');
  const start = selectedDateTime ? new Date(selectedDateTime.iso) : null;

  summary.innerHTML = `
    <div class="summary-line"><span>Shop</span><strong>${selectedShop ? escapeHtml(selectedShop.name) : 'Not selected'}</strong></div>
    <div class="summary-line"><span>Service</span><strong>${selectedService ? escapeHtml(selectedService.name) : 'Not selected'}</strong></div>
    <div class="summary-line"><span>Date</span><strong>${start ? formatDate(start) : 'Not selected'}</strong></div>
    <div class="summary-line"><span>Time</span><strong>${start ? start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Not selected'}</strong></div>
    <div class="summary-line"><span>Total</span><strong>$${selectedService ? selectedService.price.toFixed(2) : '0.00'}</strong></div>
  `;
}

if (ensureClientAccess()) {
  updateNavigation();
  setupNavigationEvents();
  initializeSocket();
  showStep();
  updateLiveSummary();
  loadShops();
}
