// scripts/index.js
const favoriteStorageKey = 'favoriteShopIds';
let allShops = [];

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getFavoriteShopIds() {
  try {
    return JSON.parse(localStorage.getItem(favoriteStorageKey)) || [];
  } catch (error) {
    return [];
  }
}

function setFavoriteShopIds(ids) {
  localStorage.setItem(favoriteStorageKey, JSON.stringify(ids));
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

    const userRole = AuthUtils.getUserRole();
    if (userRole === 'barber') {
      dashboardLink.textContent = 'Barber Dashboard';
      dashboardLink.onclick = () => window.location = 'barber-dashboard.html';
    } else {
      dashboardLink.textContent = 'My Appointments';
      dashboardLink.onclick = () => window.location = 'dashboard.html';
    }
  } else {
    loginLink.style.display = 'inline';
    registerLink.style.display = 'inline';
    logoutLink.style.display = 'none';
    dashboardLink.style.display = 'none';
  }
}

function routeToBooking() {
  if (AuthUtils.isLoggedIn()) {
    const userRole = AuthUtils.getUserRole();
    window.location = userRole === 'barber' ? 'barber-dashboard.html' : 'booking.html';
  } else {
    window.location = 'register.html';
  }
}

function showBrowseMode() {
  document.getElementById('shops-section').style.display = 'block';
  document.querySelector('.hero-section').style.display = 'none';
  document.querySelector('.quick-tools-section').style.display = 'none';
  document.querySelector('.features-section').style.display = 'none';
  document.querySelector('.social-proof-section').style.display = 'none';
  document.querySelector('.faq-section').style.display = 'none';
}

function showHomeMode() {
  document.getElementById('shops-section').style.display = 'none';
  document.querySelector('.hero-section').style.display = '';
  document.querySelector('.quick-tools-section').style.display = '';
  document.querySelector('.features-section').style.display = '';
  document.querySelector('.social-proof-section').style.display = '';
  document.querySelector('.faq-section').style.display = '';
}

function setupNavigationEvents() {
  document.getElementById('logout-link').addEventListener('click', (e) => {
    e.preventDefault();
    AuthUtils.logout();
  });

  document.getElementById('home-link').addEventListener('click', (e) => {
    e.preventDefault();
    window.location = 'index.html';
  });

  document.getElementById('booking-link').addEventListener('click', (e) => {
    e.preventDefault();
    window.location = AuthUtils.isLoggedIn() ? 'booking.html' : 'login.html';
  });

  document.getElementById('login-link').addEventListener('click', (e) => {
    e.preventDefault();
    window.location = 'login.html';
  });

  document.getElementById('register-link').addEventListener('click', (e) => {
    e.preventDefault();
    window.location = 'register.html';
  });

  document.getElementById('get-started-btn').addEventListener('click', routeToBooking);
  document.getElementById('preview-book-btn').addEventListener('click', routeToBooking);

  document.getElementById('browse-shops-btn').addEventListener('click', async () => {
    showBrowseMode();
    await loadShops();
  });

  document.getElementById('back-home-btn').addEventListener('click', showHomeMode);
  document.getElementById('shop-search').addEventListener('input', renderFilteredShops);
  document.getElementById('shop-sort').addEventListener('change', renderFilteredShops);
}

function setupInteractiveTools() {
  const styleTips = {
    clean: 'Try a quick trim or shape-up. Best when you want maintenance without a full reset.',
    sharp: 'Book a fade or taper and leave room for detail work around the neckline.',
    beard: 'Choose a beard trim or cut-and-beard combo so the edges match the haircut.',
    full: 'Go for a full grooming session: cut, beard, wash, and finish. Future you says thanks.'
  };

  document.getElementById('style-picker').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-style]');
    if (!button) return;

    document.querySelectorAll('#style-picker button').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    document.getElementById('style-result').textContent = styleTips[button.dataset.style];
  });

  document.getElementById('service-estimator').addEventListener('change', (event) => {
    const [minutes, price] = event.target.value.split('|');
    document.getElementById('estimate-output').textContent = `About ${minutes} minutes from $${price}.`;
  });
}

async function loadShops() {
  const meta = document.getElementById('shops-meta');
  meta.textContent = 'Loading shops...';

  try {
    allShops = await apiFetch('/api/shop');
    renderFilteredShops();
  } catch (error) {
    console.error('Error:', error);
    meta.textContent = 'Could not load shops right now.';
    AuthUtils.showError('Error loading shops. Please try again.');
  }
}

function renderFilteredShops() {
  const query = document.getElementById('shop-search').value.trim().toLowerCase();
  const sortBy = document.getElementById('shop-sort').value;
  const filtered = allShops
    .filter(shop => {
      const haystack = [shop.name, shop.address, shop.city, shop.state, shop.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    })
    .sort((a, b) => String(a[sortBy] || '').localeCompare(String(b[sortBy] || '')));

  displayShops(filtered);
}

function displayShops(shops) {
  const shopsList = document.getElementById('shops-list');
  const shopsMeta = document.getElementById('shops-meta');
  const favorites = getFavoriteShopIds();
  shopsList.innerHTML = '';
  shopsMeta.textContent = `${shops.length} shop${shops.length === 1 ? '' : 's'} found`;

  if (shops.length === 0) {
    shopsList.innerHTML = '<p class="empty-state-message">No barber shops match your search yet.</p>';
    return;
  }

  shops.forEach(shop => {
    const shopCard = document.createElement('article');
    shopCard.className = 'shop-card enhanced-shop-card';
    const safeName = escapeHtml(shop.name);
    const safeAddress = escapeHtml([shop.address, shop.city, shop.state].filter(Boolean).join(', '));
    const safeDescription = escapeHtml(shop.description);
    const safePhone = escapeHtml(String(shop.phone || '').replace(/[^\d+(). -]/g, ''));

    const initials = shop.name
      .split(' ')
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    const isFavorite = favorites.includes(String(shop.id));

    shopCard.innerHTML = `
      <div class="shop-card-topline">
        <span class="shop-avatar">${initials || 'BB'}</span>
        <button class="favorite-btn ${isFavorite ? 'active' : ''}" type="button" aria-label="Save ${safeName} as favorite" data-favorite-id="${shop.id}">${isFavorite ? 'Saved' : 'Save'}</button>
      </div>
      <h3>${safeName}</h3>
      <p>${safeAddress}</p>
      ${shop.description ? `<p class="shop-description">${safeDescription}</p>` : '<p class="shop-description">Fresh cuts, clean booking, and appointment-ready service.</p>'}
      <div class="shop-tags"><span>Walk-in friendly</span><span>Online booking</span><span>Local shop</span></div>
      <div class="shop-card-actions">
        <button class="btn btn-primary" type="button" data-view-shop="${shop.id}">Book This Shop</button>
        ${safePhone ? `<a class="btn btn-secondary" href="tel:${safePhone}">Call</a>` : ''}
      </div>
    `;

    shopsList.appendChild(shopCard);
  });

  updateFavoritesList();
}

function setupShopCardActions() {
  document.getElementById('shops-list').addEventListener('click', (event) => {
    const favoriteBtn = event.target.closest('[data-favorite-id]');
    if (favoriteBtn) {
      toggleFavorite(favoriteBtn.dataset.favoriteId);
      renderFilteredShops();
      return;
    }

    const viewBtn = event.target.closest('[data-view-shop]');
    if (viewBtn) {
      viewShop(viewBtn.dataset.viewShop);
    }
  });
}

function toggleFavorite(shopId) {
  const favorites = getFavoriteShopIds();
  const normalizedId = String(shopId);
  const nextFavorites = favorites.includes(normalizedId)
    ? favorites.filter(id => id !== normalizedId)
    : [...favorites, normalizedId];

  setFavoriteShopIds(nextFavorites);
  updateFavoritesList();
}

function updateFavoritesList() {
  const favoritesList = document.getElementById('favorites-list');
  const favorites = getFavoriteShopIds();
  const favoriteShops = allShops.filter(shop => favorites.includes(String(shop.id)));

  if (favoriteShops.length === 0) {
    favoritesList.textContent = 'No favorite shops yet.';
    return;
  }

  favoritesList.innerHTML = favoriteShops
    .map(shop => `<button type="button" data-favorite-shortcut="${shop.id}">${escapeHtml(shop.name)}</button>`)
    .join('');
}

function setupFavoriteShortcuts() {
  document.getElementById('favorites-list').addEventListener('click', (event) => {
    const button = event.target.closest('[data-favorite-shortcut]');
    if (!button) return;
    viewShop(button.dataset.favoriteShortcut);
  });
}

function viewShop(shopId) {
  if (AuthUtils.isLoggedIn()) {
    localStorage.setItem('selectedShopId', shopId);
    window.location = 'booking.html';
  } else {
    localStorage.setItem('selectedShopId', shopId);
    window.location = 'login.html';
  }
}

updateNavigation();
setupNavigationEvents();
setupInteractiveTools();
setupShopCardActions();
setupFavoriteShortcuts();
updateFavoritesList();
