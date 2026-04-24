const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const pool = require('../config/db');

const router = express.Router();

function timeToMinutes(value) {
  const [hours, minutes] = String(value).split(':').map(Number);
  return (hours * 60) + minutes;
}

function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

async function getAvailableSlots(shopId, serviceDuration, date) {
  const dow = new Date(date).getDay();
  const whResult = await pool.query(
    'SELECT start_hour, end_hour FROM working_hours WHERE shop_id = $1 AND day_of_week = $2',
    [shopId, dow]
  );

  if (whResult.rows.length === 0) return [];

  const { start_hour: startHour, end_hour: endHour } = whResult.rows[0];
  const appointmentsResult = await pool.query(
    `SELECT start_time, end_time
     FROM appointments
     WHERE shop_id = $1 AND DATE(start_time) = $2 AND status = 'booked'`,
    [shopId, date]
  );

  const startMinutes = timeToMinutes(startHour);
  const endMinutes = timeToMinutes(endHour);
  const stepMinutes = 15;
  const bufferMinutes = 10;
  const slots = [];

  for (
    let minutes = startMinutes;
    minutes + Number(serviceDuration) + bufferMinutes <= endMinutes;
    minutes += stepMinutes
  ) {
    const slotStart = new Date(`${date}T${formatTime(minutes)}:00`);
    const slotEnd = new Date(slotStart.getTime() + Number(serviceDuration) * 60000);

    const overlap = appointmentsResult.rows.some((appointment) => {
      const appointmentStart = new Date(appointment.start_time);
      const appointmentEnd = new Date(appointment.end_time);
      return slotStart < new Date(appointmentEnd.getTime() + bufferMinutes * 60000) &&
        new Date(slotEnd.getTime() + bufferMinutes * 60000) > appointmentStart;
    });

    if (!overlap) {
      slots.push(slotStart.toISOString());
    }
  }

  return slots;
}

async function getAppointmentsForUser(userId, userRole) {
  if (userRole === 'barber') {
    const shopResult = await pool.query('SELECT id FROM barber_shops WHERE owner_id = $1', [userId]);
    if (shopResult.rows.length === 0) return [];

    const appointmentsResult = await pool.query(
      `SELECT a.*, u.name AS client_name, u.email AS client_email, s.name AS service_name, s.price AS service_price
       FROM appointments a
       JOIN users u ON a.client_id = u.id
       JOIN services s ON a.service_id = s.id
       WHERE a.shop_id = $1
       ORDER BY a.start_time DESC`,
      [shopResult.rows[0].id]
    );
    return appointmentsResult.rows;
  }

  if (userRole === 'client') {
    const appointmentsResult = await pool.query(
      `SELECT a.*, bs.name AS shop_name, bs.city, bs.state, s.name AS service_name, s.price AS service_price
       FROM appointments a
       JOIN barber_shops bs ON a.shop_id = bs.id
       JOIN services s ON a.service_id = s.id
       WHERE a.client_id = $1
       ORDER BY a.start_time DESC`,
      [userId]
    );
    return appointmentsResult.rows;
  }

  return [];
}

async function emitToBarberRoom(io, shopId, eventName, payload) {
  if (!io) return;

  const shopRes = await pool.query('SELECT owner_id FROM barber_shops WHERE id = $1', [shopId]);
  if (shopRes.rows.length === 0) return;

  io.to(`barber_${shopRes.rows[0].owner_id}`).emit(eventName, payload);
}

router.get('/slots', authenticateToken, authorizeRoles('client'), async (req, res) => {
  const { shopId, serviceId, date } = req.query;
  if (!shopId || !serviceId || !date) {
    return res.status(400).json({ message: 'Missing parameters' });
  }

  try {
    const serviceResult = await pool.query(
      'SELECT duration_minutes FROM services WHERE id = $1 AND shop_id = $2',
      [serviceId, shopId]
    );

    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const slots = await getAvailableSlots(shopId, serviceResult.rows[0].duration_minutes, date);
    res.json({ slots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching slots' });
  }
});

router.post('/book', authenticateToken, authorizeRoles('client'), async (req, res) => {
  try {
    const { shopId, serviceId, startTime } = req.body;
    const clientId = req.user.id;

    if (!shopId || !serviceId || !startTime) {
      return res.status(400).json({ message: 'Missing required fields: shopId, serviceId, startTime' });
    }

    const serviceResult = await pool.query(
      'SELECT id, name, duration_minutes FROM services WHERE id = $1 AND shop_id = $2',
      [serviceId, shopId]
    );
    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const service = serviceResult.rows[0];
    const start = new Date(startTime);
    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({ message: 'Invalid startTime format' });
    }

    if (start.getTime() < Date.now() - 60000) {
      return res.status(400).json({ message: 'Appointment time must be in the future' });
    }

    const dateOnly = start.toISOString().slice(0, 10);
    const availableSlots = await getAvailableSlots(shopId, service.duration_minutes, dateOnly);
    const normalizedSlot = start.toISOString();
    const slotIsAvailable = availableSlots.some((slot) => new Date(slot).toISOString() === normalizedSlot);

    if (!slotIsAvailable) {
      return res.status(409).json({ message: 'That time is no longer available. Please pick another slot.' });
    }

    const end = new Date(start.getTime() + Number(service.duration_minutes) * 60000);
    const result = await pool.query(
      `INSERT INTO appointments (client_id, shop_id, service_id, start_time, end_time, status)
       VALUES ($1, $2, $3, $4, $5, 'booked')
       RETURNING id, client_id, shop_id, service_id, start_time, end_time, status`,
      [clientId, shopId, serviceId, start.toISOString(), end.toISOString()]
    );

    const io = req.app && req.app.locals && req.app.locals.io;
    await emitToBarberRoom(io, shopId, 'appointment_created', {
      appointment: result.rows[0],
      shopId,
      serviceId,
      clientId,
      clientName: req.user.name || req.user.email || `Client ${clientId}`,
      serviceName: service.name,
      startTime: start.toISOString(),
      endTime: end.toISOString()
    });

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment: result.rows[0]
    });
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ message: `Booking error: ${err.message}` });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const appointments = await getAppointmentsForUser(req.user.id, req.user.role);
    res.json(appointments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/appointments', authenticateToken, async (req, res) => {
  try {
    const appointments = await getAppointmentsForUser(req.user.id, req.user.role);
    res.json(appointments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/barber-appointments', authenticateToken, authorizeRoles('barber'), async (req, res) => {
  try {
    const appointments = await getAppointmentsForUser(req.user.id, 'barber');
    res.json(appointments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

async function updateAppointmentStatus(req, res, allowClientCancelOnly = false) {
  const appointmentId = req.params.id;
  const nextStatus = req.body.status || 'cancelled';
  const userId = req.user.id;
  const userRole = req.user.role;

  if (!['booked', 'done', 'cancelled'].includes(nextStatus)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  if (allowClientCancelOnly && (userRole !== 'client' || nextStatus !== 'cancelled')) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  try {
    let result;

    if (userRole === 'barber') {
      const shopResult = await pool.query('SELECT id FROM barber_shops WHERE owner_id = $1', [userId]);
      if (shopResult.rows.length === 0) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      result = await pool.query(
        'UPDATE appointments SET status = $1 WHERE id = $2 AND shop_id = $3 RETURNING *',
        [nextStatus, appointmentId, shopResult.rows[0].id]
      );
    } else if (userRole === 'client') {
      result = await pool.query(
        'UPDATE appointments SET status = $1 WHERE id = $2 AND client_id = $3 RETURNING *',
        [nextStatus, appointmentId, userId]
      );
    } else {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const appointment = result.rows[0];
    const io = req.app && req.app.locals && req.app.locals.io;

    if (nextStatus === 'cancelled') {
      const clientResult = await pool.query('SELECT name FROM users WHERE id = $1', [appointment.client_id]);
      await emitToBarberRoom(io, appointment.shop_id, 'appointment_cancelled', {
        id: appointmentId,
        clientName: clientResult.rows[0] ? clientResult.rows[0].name : `Client ${appointment.client_id}`
      });
    } else {
      await emitToBarberRoom(io, appointment.shop_id, 'appointment_updated', {
        id: appointmentId,
        status: nextStatus
      });
    }

    res.json({ message: 'Appointment updated', appointment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

router.put('/:id/status', authenticateToken, async (req, res) => updateAppointmentStatus(req, res, false));
router.put('/appointments/:id/status', authenticateToken, async (req, res) => updateAppointmentStatus(req, res, false));
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  req.body.status = 'cancelled';
  return updateAppointmentStatus(req, res, false);
});
router.put('/appointments/:id/cancel', authenticateToken, async (req, res) => {
  req.body.status = 'cancelled';
  return updateAppointmentStatus(req, res, false);
});

module.exports = router;
