function requireClientDashboard() {
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

function formatAppointmentDate(isoValue) {
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

function createStatusBadge(status) {
  return `<span class="status-chip status-${status}">${status}</span>`;
}

async function loadAppointments() {
  try {
    const appointments = await apiFetch('/api/appointments');
    renderAppointments(appointments);
    updateStats(appointments);
  } catch (error) {
    document.getElementById('client-appointments-list').innerHTML = '<p class="empty-state-message">Could not load your appointments.</p>';
    AuthUtils.showError(error.message || 'Could not load appointments.');
  }
}

function updateStats(appointments) {
  const now = Date.now();
  const upcoming = appointments.filter((appointment) => appointment.status === 'booked' && new Date(appointment.start_time).getTime() > now);
  const completed = appointments.filter((appointment) => appointment.status === 'done');
  const totalSpend = appointments
    .filter((appointment) => appointment.status !== 'cancelled')
    .reduce((sum, appointment) => sum + Number(appointment.service_price || 0), 0);

  document.getElementById('client-upcoming-count').textContent = upcoming.length;
  document.getElementById('client-completed-count').textContent = completed.length;
  document.getElementById('client-total-spend').textContent = `$${totalSpend.toFixed(2)}`;
}

function renderAppointments(appointments) {
  const filter = document.getElementById('appointment-filter').value;
  const list = document.getElementById('client-appointments-list');
  const filtered = filter === 'all'
    ? appointments
    : appointments.filter((appointment) => appointment.status === filter);

  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty-state-message">No appointments match this filter yet.</p>';
    return;
  }

  list.innerHTML = filtered.map((appointment) => {
    const formatted = formatAppointmentDate(appointment.start_time);
    const cancellable = appointment.status === 'booked' && new Date(appointment.start_time).getTime() > Date.now();

    return `
      <article class="appointment-row-card">
        <div class="appointment-row-main">
          <div class="appointment-row-top">
            <h3>${appointment.shop_name}</h3>
            ${createStatusBadge(appointment.status)}
          </div>
          <p class="appointment-row-service">${appointment.service_name}</p>
          <div class="appointment-row-meta">
            <span>${formatted.date}</span>
            <span>${formatted.time}</span>
            <span>${appointment.city || ''}${appointment.city && appointment.state ? ', ' : ''}${appointment.state || ''}</span>
            <span>$${Number(appointment.service_price || 0).toFixed(2)}</span>
          </div>
        </div>
        <div class="appointment-row-actions">
          ${cancellable ? `<button class="btn btn-secondary" data-cancel-id="${appointment.id}">Cancel</button>` : ''}
        </div>
      </article>
    `;
  }).join('');

  list.querySelectorAll('[data-cancel-id]').forEach((button) => {
    button.addEventListener('click', () => cancelAppointment(button.dataset.cancelId));
  });
}

async function cancelAppointment(appointmentId) {
  const confirmed = window.confirm('Cancel this appointment?');
  if (!confirmed) return;

  try {
    await apiFetch(`/api/appointments/${appointmentId}/cancel`, {
      method: 'PUT'
    });
    AuthUtils.showSuccess('Appointment cancelled.');
    loadAppointments();
  } catch (error) {
    AuthUtils.showError(error.message || 'Could not cancel appointment.');
  }
}

function setupEvents() {
  document.getElementById('logout-link').addEventListener('click', (event) => {
    event.preventDefault();
    AuthUtils.logout();
  });

  document.getElementById('appointment-filter').addEventListener('change', loadAppointments);
}

function updateHeader() {
  const user = AuthUtils.getUserFromToken();
  document.getElementById('dashboard-title').textContent = `${user?.name || 'Your'} appointments`;
}

if (requireClientDashboard()) {
  updateHeader();
  setupEvents();
  loadAppointments();
}
