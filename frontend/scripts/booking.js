// scripts/booking.js
let currentStep = 1;
let selectedShop = null;
let selectedService = null;
let selectedDateTime = null;
let allShops = [];
let socket = null;
let bookingActivityState = {
  shopSelected: false,
  serviceSelected: false,
  timeSelected: false,
  bookingConfirmed: false
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let currentServices = [];

if (!AuthUtils.isLoggedIn()) {
  window.location = 'login.html';
} else {
  initializeBookingSocket();
}

function initializeBookingSocket() {
  try {
    const API_BASE = window.API_BASE || (location.hostname === 'localhost' ? 'http://localhost:3002' : 'https://barber-1-ovpr.onrender.com');
    socket = io(API_BASE, {
      auth: { token: AuthUtils.getToken() }
    });

    socket.on('connect', () => {
      console.log('Booking socket connected');
    });

    socket.on('disconnect', () => {
      console.log('Booking socket disconnected');
    });
  } catch (error) {
    console.warn('Socket initialization failed:', error);
  }
}

function emitClientActivity(step) {
  if (!socket || !socket.connected || !selectedShop) return;
  const user = AuthUtils.getUserFromToken() || {};
  const clientName = user.name || user.email || 'Client';

  if (step === 'shop' && bookingActivityState.shopSelected) return;
  if (step === 'service' && bookingActivityState.serviceSelected) return;
  if (step === 'time' && bookingActivityState.timeSelected) return;

  if (step === 'shop') bookingActivityState.shopSelected = true;
  if (step === 'service') bookingActivityState.serviceSelected = true;
  if (step === 'time') bookingActivityState.timeSelected = true;

  socket.emit('client_booking_started', {
    shopId: selectedShop.id,
    shopName: selectedShop.name,
    clientId: user.id,
    clientName,
    step
  });
}

function updateNavigation() {
  const loginLink = document.getElementById('login-link');
  const registerLink = document.getElementById('register-link');
  const logoutLink = document.getElementById('logout-link');
  const dashboardLink = document.getElementById('dashboard-link');

  if (AuthUtils.isLoggedIn()) {
    loginLink.style.display = 'none';
    registerLink.style.display = 'none';
    logoutLink.style.display = 'inline';
    dashboardLink.style.display = 'inline';
    dashboardLink.textContent = AuthUtils.getUserRole() === 'barber' ? 'Barber Dashboard' : 'My Appointments';
    dashboardLink.onclick = () => window.location = AuthUtils.getUserRole() === 'barber' ? 'barber-dashboard.html' : 'dashboard.html';
  } else {
    loginLink.style.display = 'inline';
    registerLink.style.display = 'inline';
    logoutLink.style.display = 'none';
    dashboardLink.style.display = 'none';
  }
}

function setupNavigationEvents() {
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

  document.getElementById('next-step').addEventListener('click', nextStep);
  document.getElementById('prev-step').addEventListener('click', prevStep);
  document.getElementById('back-to-datetime').addEventListener('click', prevStep);
  document.getElementById('booking-shop-search').addEventListener('input', renderShopOptions);
  document.getElementById('booking-shop-sort').addEventListener('change', renderShopOptions);
  document.getElementById('appointment-date').addEventListener('change', loadTimeSlots);
  document.getElementById('appointment-time').addEventListener('change', updateLiveSummary);
}

async function loadShops() {
  try {
    allShops = await apiFetch('/api/shop');
    renderShopOptions();
    selectStoredShopIfAvailable();
  } catch (error) {
    console.error('Error:', error);
    AuthUtils.showError('Error loading shops. Please try again.');
  }
}

function renderShopOptions() {
  const shopsList = document.getElementById('shops-list');
  const query = document.getElementById('booking-shop-search').value.trim().toLowerCase();
  const sortBy = document.getElementById('booking-shop-sort').value;
  const shops = allShops
    .filter(shop => [shop.name, shop.address, shop.city, shop.state, shop.description].filter(Boolean).join(' ').toLowerCase().includes(query))
    .sort((a, b) => String(a[sortBy] || '').localeCompare(String(b[sortBy] || '')));

  if (!shops || shops.length === 0) {
    shopsList.innerHTML = '<p class="empty-state-message">No barber shops available yet.</p>';
    return;
  }

  shopsList.innerHTML = '';
  shops.forEach(shop => {
    const shopCard = document.createElement('article');
    shopCard.className = `shop-card enhanced-shop-card ${selectedShop && selectedShop.id === shop.id ? 'selected' : ''}`;
    const safeName = escapeHtml(shop.name);
    const safeAddress = escapeHtml([shop.address, shop.city, shop.state].filter(Boolean).join(', '));
    const safeDescription = escapeHtml(shop.description);
    const initials = shop.name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
    shopCard.innerHTML = `
      <div class="shop-card-topline">
        <span class="shop-avatar">${initials || 'BB'}</span>
        <span class="status-pill">Open for booking</span>
      </div>
      <h3>${safeName}</h3>
      <p>${safeAddress}</p>
      ${shop.description ? `<p class="shop-description">${safeDescription}</p>` : '<p class="shop-description">Choose this shop to see services and available times.</p>'}
      <button class="btn btn-primary" type="button">Select Shop</button>
    `;
    shopCard.querySelector('button').addEventListener('click', () => selectShop(shop));
    shopsList.appendChild(shopCard);
  });
}

function selectStoredShopIfAvailable() {
  const selectedShopId = localStorage.getItem('selectedShopId');
  if (!selectedShopId) return;

  const shop = allShops.find(item => String(item.id) === String(selectedShopId));
  localStorage.removeItem('selectedShopId');
  if (shop) selectShop(shop);
}

function selectShop(shop) {
  selectedShop = {
    id: shop.id,
    name: shop.name,
    address: [shop.address, shop.city, shop.state].filter(Boolean).join(', ')
  };
  selectedService = null;
  selectedDateTime = null;
  updateLiveSummary();
  emitClientActivity('shop');
  nextStep();
}

async function loadServices() {
  if (!selectedShop) return;

  try {
    currentServices = await apiFetch(`/api/services/${selectedShop.id}`);
    const servicesList = document.getElementById('services-list');

    if (!currentServices || currentServices.length === 0) {
      servicesList.innerHTML = '<p class="empty-state-message">No services available at this shop yet.</p>';
      return;
    }

    servicesList.innerHTML = `<p class="form-success">Services at ${escapeHtml(selectedShop.name)}</p>`;
    currentServices.forEach(service => {
      const serviceCard = document.createElement('div');
      serviceCard.className = `service-item ${selectedService && selectedService.id === service.id ? 'selected' : ''}`;
      const safeServiceName = escapeHtml(service.name);
      serviceCard.innerHTML = `
        <div>
          <h4>${safeServiceName}</h4>
          <p>$${service.price} - ${service.duration_minutes} minutes</p>
        </div>
        <button class="btn btn-primary" type="button">Select Service</button>
      `;
      serviceCard.querySelector('button').addEventListener('click', () => selectService(service));
      servicesList.appendChild(serviceCard);
    });
  } catch (error) {
    console.error('Error:', error);
    AuthUtils.showError('Error loading services. Please try again.');
  }
}

function selectService(service) {
  selectedService = {
    id: service.id,
    name: service.name,
    price: service.price,
    duration: service.duration_minutes
  };
  selectedDateTime = null;
  document.getElementById('appointment-date').value = '';
  document.getElementById('appointment-time').innerHTML = '<option value="">Select a time</option>';
  updateLiveSummary();
  emitClientActivity('service');
  nextStep();
}

async function loadTimeSlots() {
  const dateInput = document.getElementById('appointment-date');
  const timeSelect = document.getElementById('appointment-time');
  const helper = document.getElementById('slot-helper');
  const selectedDate = dateInput.value;

  timeSelect.innerHTML = '<option value="">Select a time</option>';
  selectedDateTime = null;
  updateLiveSummary();
  if (!selectedDate || !selectedShop || !selectedService) return;

  helper.textContent = 'Checking available slots...';

  try {
    const response = await apiFetch(`/api/appointments/slots?shopId=${selectedShop.id}&serviceId=${selectedService.id}&date=${selectedDate}`);
    const slots = (response.slots || []).map(slot => new Date(slot).toTimeString().slice(0, 5));

    if (slots.length === 0) {
      helper.textContent = 'No live slots returned, showing standard shop times.';
      populateFallbackSlots();
      return;
    }

    populateTimeSelect(slots);
    helper.textContent = `${slots.length} live slots available for this date.`;
    emitClientActivity('time');
  } catch (error) {
    console.warn('Live slot lookup failed, using fallback slots:', error);
    helper.textContent = 'Live slot lookup is unavailable, showing standard shop times.';
    populateFallbackSlots();
  }
}

function populateFallbackSlots() {
  const timeSlots = [];
  for (let hour = 9; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }
  }
  populateTimeSelect(timeSlots);
}

function populateTimeSelect(slots) {
  const timeSelect = document.getElementById('appointment-time');
  timeSelect.innerHTML = '<option value="">Select a time</option>';
  slots.forEach(slot => {
    const option = document.createElement('option');
    option.value = slot;
    option.textContent = slot;
    timeSelect.appendChild(option);
  });
}

function showConfirmation() {
  const date = document.getElementById('appointment-date').value;
  const time = document.getElementById('appointment-time').value;

  if (!date || !time) {
    AuthUtils.showError('Please select both date and time');
    currentStep = 3;
    showStep();
    return;
  }

  selectedDateTime = { date, time };
  updateLiveSummary();
  const summary = document.getElementById('booking-summary');
  const endTime = calculateEndTime(time, selectedService.duration);

  summary.innerHTML = `
    <div class="booking-summary">
      <p><strong>Shop:</strong> ${escapeHtml(selectedShop.name)}</p>
      <p><strong>Address:</strong> ${escapeHtml(selectedShop.address || 'Address not listed')}</p>
      <p><strong>Service:</strong> ${escapeHtml(selectedService.name)}</p>
      <p><strong>Price:</strong> $${selectedService.price}</p>
      <p><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</p>
      <p><strong>Time:</strong> ${time} - ${endTime}</p>
    </div>
  `;
}

function calculateEndTime(startTime, durationMinutes) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + Number(durationMinutes || 0);
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}

document.getElementById('confirm-booking').addEventListener('click', async () => {
  if (!selectedShop || !selectedService || !selectedDateTime) {
    AuthUtils.showError('Please complete all booking steps');
    return;
  }

  const userRole = AuthUtils.getUserRole();
  const token = AuthUtils.getToken();
  const startTime = `${selectedDateTime.date}T${selectedDateTime.time}:00`;
  const confirmBtn = document.getElementById('confirm-booking');

  if (!token) {
    AuthUtils.showError('Not authenticated. Please log in again.');
    window.location = 'login.html';
    return;
  }

  if (userRole !== 'client') {
    AuthUtils.showError(`Invalid role for booking. You are logged in as: ${userRole}. Please log in as a client.`);
    return;
  }

  AuthUtils.setLoading(confirmBtn, true);

  try {
    await apiFetch('/api/appointments/book', {
      method: 'POST',
      body: JSON.stringify({
        shopId: selectedShop.id,
        serviceId: selectedService.id,
        startTime
      })
    });
    if (socket && socket.connected) {
      const user = AuthUtils.getUserFromToken() || {};
      socket.emit('client_booking_confirmed', {
        shopId: selectedShop.id,
        shopName: selectedShop.name,
        clientId: user.id,
        clientName: user.name || user.email || 'Client',
        serviceName: selectedService.name,
        startTime
      });
    }
    AuthUtils.showSuccess('Appointment booked successfully! Redirecting...');
    setTimeout(() => window.location = 'dashboard.html', 1500);
  } catch (error) {
    console.error('Error booking:', error);
    AuthUtils.showError(error.message || 'Booking failed. Please try again.');
  } finally {
    AuthUtils.setLoading(confirmBtn, false);
  }
});

function nextStep() {
  if (currentStep === 1 && !selectedShop) {
    AuthUtils.showError('Please select a barber shop');
    return;
  }

  if (currentStep === 2 && !selectedService) {
    AuthUtils.showError('Please select a service');
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

function showStep() {
  const steps = ['shop-selection', 'service-selection', 'datetime-selection', 'confirmation'];
  steps.forEach((stepId, index) => {
    document.getElementById(stepId).style.display = currentStep === index + 1 ? 'block' : 'none';
  });

  updateNavigationButtons();
  updateProgress();
}

function updateNavigationButtons() {
  const prevBtn = document.getElementById('prev-step');
  const nextBtn = document.getElementById('next-step');
  const navigation = document.querySelector('.booking-navigation');

  navigation.style.display = currentStep === 1 || currentStep === 4 ? 'none' : 'flex';
  prevBtn.style.display = currentStep > 1 ? 'inline' : 'none';
  nextBtn.style.display = currentStep < 4 ? 'inline' : 'none';
}

function updateProgress() {
  document.querySelectorAll('[data-progress-step]').forEach(step => {
    step.classList.toggle('active', Number(step.dataset.progressStep) <= currentStep);
  });
}

function updateLiveSummary() {
  const date = document.getElementById('appointment-date')?.value || selectedDateTime?.date;
  const time = document.getElementById('appointment-time')?.value || selectedDateTime?.time;
  const summary = document.getElementById('live-summary');
  if (!summary) return;

  summary.innerHTML = `
    <div class="summary-line"><span>Shop</span><strong>${selectedShop ? escapeHtml(selectedShop.name) : 'Not selected'}</strong></div>
    <div class="summary-line"><span>Service</span><strong>${selectedService ? escapeHtml(selectedService.name) : 'Not selected'}</strong></div>
    <div class="summary-line"><span>Date</span><strong>${date ? new Date(date).toLocaleDateString() : 'Not selected'}</strong></div>
    <div class="summary-line"><span>Time</span><strong>${time || 'Not selected'}</strong></div>
    <div class="summary-line"><span>Total</span><strong>$${selectedService ? selectedService.price : '0'}</strong></div>
  `;
}

updateNavigation();
setupNavigationEvents();
showStep();
loadShops();
updateLiveSummary();
