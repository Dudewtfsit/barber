// scripts/index.js
// Update navigation based on authentication status
function updateNavigation() {
  const navLinks = document.getElementById('nav-links');
  const loginLink = document.getElementById('login-link');
  const registerLink = document.getElementById('register-link');
  const logoutLink = document.getElementById('logout-link');
  const dashboardLink = document.getElementById('dashboard-link');

  if (AuthUtils.isLoggedIn()) {
    // User is logged in
    loginLink.style.display = 'none';
    registerLink.style.display = 'none';
    logoutLink.style.display = 'inline';
    dashboardLink.style.display = 'inline';

    // Check user role for dashboard redirect
    const userRole = AuthUtils.getUserRole();
    if (userRole === 'barber') {
      dashboardLink.textContent = 'Barber Dashboard';
      dashboardLink.onclick = () => window.location = 'barber-dashboard.html';
    } else {
      dashboardLink.textContent = 'My Appointments';
      dashboardLink.onclick = () => window.location = 'dashboard.html';
    }
  } else {
    // User is not logged in
    loginLink.style.display = 'inline';
    registerLink.style.display = 'inline';
    logoutLink.style.display = 'none';
    dashboardLink.style.display = 'none';
  }
}

// Logout functionality
document.getElementById('logout-link').addEventListener('click', (e) => {
  e.preventDefault();
  AuthUtils.logout();
});

// Navigation event listeners
document.getElementById('home-link').addEventListener('click', (e) => {
  e.preventDefault();
  window.location = 'index.html';
});

document.getElementById('booking-link').addEventListener('click', (e) => {
  e.preventDefault();
  if (AuthUtils.isLoggedIn()) {
    window.location = 'booking.html';
  } else {
    window.location = 'login.html';
  }
});

document.getElementById('login-link').addEventListener('click', (e) => {
  e.preventDefault();
  window.location = 'login.html';
});

document.getElementById('register-link').addEventListener('click', (e) => {
  e.preventDefault();
  window.location = 'register.html';
});

// Hero section buttons
document.getElementById('get-started-btn').addEventListener('click', () => {
  if (AuthUtils.isLoggedIn()) {
    const userRole = AuthUtils.getUserRole();
    if (userRole === 'barber') {
      window.location = 'barber-dashboard.html';
    } else {
      window.location = 'booking.html';
    }
  } else {
    window.location = 'register.html';
  }
});

document.getElementById('browse-shops-btn').addEventListener('click', () => {
  loadShops();
  document.getElementById('shops-section').style.display = 'block';
  document.querySelector('.hero-section').style.display = 'none';
  document.querySelector('.features-section').style.display = 'none';
});

// Load shops for browsing
let allShops = [];
async function loadShops() {
  try {
    const shops = await apiFetch('/api/public/shops');
    allShops = shops;
    displayShops(allShops);
    document.getElementById('shops-section').style.display = 'block';
    document.querySelector('.hero-section').style.display = 'none';
    document.querySelector('.features-section').style.display = 'none';
  } catch (error) {
    console.error('Error:', error);
    AuthUtils.showError('Error loading shops. Please try again.');
  }
}

// Display shops in the grid
function displayShops(shops) {
  const shopsList = document.getElementById('shops-list');
  shopsList.innerHTML = '';

  if (shops.length === 0) {
    shopsList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px;">No barber shops available yet.</p>';
    return;
  }

  shops.forEach(shop => {
    const shopCard = document.createElement('div');
    shopCard.className = 'shop-card';
    shopCard.innerHTML = `
      <h3>${shop.name}</h3>
      <p>${shop.address}, ${shop.city}, ${shop.state}</p>
      <button class="btn btn-primary" onclick="viewShop(${shop.id})">View Details</button>
    `;
    shopsList.appendChild(shopCard);
  });
}

// View shop details
function viewShop(shopId) {
  if (AuthUtils.isLoggedIn()) {
    // Store shop ID and redirect to booking page
    localStorage.setItem('selectedShopId', shopId);
    window.location = 'booking.html';
  } else {
    window.location = 'login.html';
  }
}

// Initialize page
updateNavigation();