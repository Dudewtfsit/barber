// scripts/booking.js
const token = localStorage.getItem('token');
let currentStep = 1;
let selectedShop = null;
let selectedService = null;
let selectedDateTime = null;

// Check authentication
if (!token) {
  window.location = 'login.html';
}

// Update navigation based on authentication status
function updateNavigation() {
  const navLinks = document.getElementById('nav-links');
  const loginLink = document.getElementById('login-link');
  const registerLink = document.getElementById('register-link');
  const logoutLink = document.getElementById('logout-link');
  const dashboardLink = document.getElementById('dashboard-link');

  if (token) {
    loginLink.style.display = 'none';
    registerLink.style.display = 'none';
    logoutLink.style.display = 'inline';
    dashboardLink.style.display = 'inline';
    dashboardLink.textContent = 'My Appointments';
    dashboardLink.onclick = () => window.location = 'dashboard.html';
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
  localStorage.removeItem('token');
  window.location = 'index.html';
});

// Step navigation
document.getElementById('next-step').addEventListener('click', nextStep);
document.getElementById('prev-step').addEventListener('click', prevStep);

// Load shops for selection
async function loadShops() {
  try {
    const res = await fetch('https://barber-1-ovpr.onrender.com/api/public/shops');
    if (res.ok) {
      const shops = await res.json();
      const shopsList = document.getElementById('shops-list');

      if (shops.length === 0) {
        shopsList.innerHTML = '<p>No barber shops available yet.</p>';
        return;
      }

      shopsList.innerHTML = '';
      shops.forEach(shop => {
        const shopCard = document.createElement('div');
        shopCard.className = 'shop-card';
        shopCard.innerHTML = `
          <h3>${shop.name}</h3>
          <p>${shop.address}, ${shop.city}, ${shop.state}</p>
          <button class="btn btn-primary" onclick="selectShop(${shop.id}, '${shop.name.replace(/'/g, "\\'")}')">Select Shop</button>
        `;
        shopsList.appendChild(shopCard);
      });
    } else {
      console.error('Error loading shops');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Select a shop
function selectShop(shopId, shopName) {
  selectedShop = { id: shopId, name: shopName };
  nextStep();
}

// Load services for selected shop
async function loadServices() {
  if (!selectedShop) return;

  try {
    const res = await fetch(`https://barber-1-ovpr.onrender.com/api/services/${selectedShop.id}`);
    if (res.ok) {
      const services = await res.json();
      const servicesList = document.getElementById('services-list');

      if (services.length === 0) {
        servicesList.innerHTML = '<p>No services available at this shop yet.</p>';
        return;
      }

      servicesList.innerHTML = `<h3>Services at ${selectedShop.name}</h3>`;
      services.forEach(service => {
        const serviceCard = document.createElement('div');
        serviceCard.className = 'service-item';
        serviceCard.innerHTML = `
          <h4>${service.name}</h4>
          <p>$${service.price} - ${service.duration_minutes} minutes</p>
          <button class="btn btn-primary" onclick="selectService(${service.id}, '${service.name.replace(/'/g, "\\'")}', ${service.price}, ${service.duration_minutes})">Select Service</button>
        `;
        servicesList.appendChild(serviceCard);
      });
    } else {
      console.error('Error loading services');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Select a service
function selectService(serviceId, serviceName, price, duration) {
  selectedService = { id: serviceId, name: serviceName, price, duration };
  nextStep();
}

// Load available time slots for selected date
function loadTimeSlots() {
  const dateInput = document.getElementById('appointment-date');
  const timeSelect = document.getElementById('appointment-time');

  dateInput.addEventListener('change', async () => {
    const selectedDate = dateInput.value;
    if (!selectedDate) return;

    // Generate time slots from 9 AM to 6 PM
    const timeSlots = [];
    for (let hour = 9; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        timeSlots.push(timeString);
      }
    }

    timeSelect.innerHTML = '<option value="">Select a time</option>';
    timeSlots.forEach(slot => {
      const option = document.createElement('option');
      option.value = slot;
      option.textContent = slot;
      timeSelect.appendChild(option);
    });
  });
}

// Show booking confirmation
function showConfirmation() {
  const date = document.getElementById('appointment-date').value;
  const time = document.getElementById('appointment-time').value;

  if (!date || !time) {
    alert('Please select both date and time');
    return;
  }

  selectedDateTime = { date, time };
  const summary = document.getElementById('booking-summary');
  const endTime = calculateEndTime(time, selectedService.duration);

  summary.innerHTML = `
    <div class="booking-summary">
      <p><strong>Shop:</strong> ${selectedShop.name}</p>
      <p><strong>Service:</strong> ${selectedService.name}</p>
      <p><strong>Price:</strong> $${selectedService.price}</p>
      <p><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</p>
      <p><strong>Time:</strong> ${time} - ${endTime}</p>
    </div>
  `;

  nextStep();
}

// Calculate end time based on duration
function calculateEndTime(startTime, durationMinutes) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}

// Confirm booking
document.getElementById('confirm-booking').addEventListener('click', async () => {
  const startTime = `${selectedDateTime.date}T${selectedDateTime.time}:00`;

  try {
    const res = await fetch('https://barber-1-ovpr.onrender.com/api/book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        shopId: selectedShop.id,
        serviceId: selectedService.id,
        startTime
      })
    });

    const data = await res.json();
    if (res.ok) {
      alert('Appointment booked successfully!');
      window.location = 'dashboard.html';
    } else {
      alert(data.message || 'Booking failed');
    }
  } catch (error) {
    console.error('Error booking:', error);
    alert('Booking failed');
  }
});

// Back to datetime selection
document.getElementById('back-to-datetime').addEventListener('click', () => {
  prevStep();
});

// Step management
function nextStep() {
  const steps = ['shop-selection', 'service-selection', 'datetime-selection', 'confirmation'];
  const currentStepElement = document.getElementById(steps[currentStep - 1]);
  currentStepElement.style.display = 'none';

  currentStep++;
  if (currentStep > steps.length) currentStep = steps.length;

  const nextStepElement = document.getElementById(steps[currentStep - 1]);
  nextStepElement.style.display = 'block';

  updateNavigationButtons();

  // Load content for new step
  if (currentStep === 2) loadServices();
  if (currentStep === 3) loadTimeSlots();
  if (currentStep === 4) showConfirmation();
}

function prevStep() {
  const steps = ['shop-selection', 'service-selection', 'datetime-selection', 'confirmation'];
  const currentStepElement = document.getElementById(steps[currentStep - 1]);
  currentStepElement.style.display = 'none';

  currentStep--;
  if (currentStep < 1) currentStep = 1;

  const prevStepElement = document.getElementById(steps[currentStep - 1]);
  prevStepElement.style.display = 'block';

  updateNavigationButtons();
}

function updateNavigationButtons() {
  const prevBtn = document.getElementById('prev-step');
  const nextBtn = document.getElementById('next-step');
  const navigation = document.querySelector('.booking-navigation');

  navigation.style.display = 'block';

  if (currentStep === 1) {
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
  } else if (currentStep === 4) {
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
  } else {
    prevBtn.style.display = 'inline';
    nextBtn.style.display = 'inline';
  }
}

// Initialize page
updateNavigation();
loadShops();
