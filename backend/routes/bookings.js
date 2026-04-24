// backend/routes/bookings.js
const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const pool = require('../config/db');
const router = express.Router();

// Helper to get available time slots for a given date and service
async function getAvailableSlots(shopId, serviceDuration, date) {
  // 1) Find working hours for that day
  const dow = new Date(date).getDay(); // 0-6
  const whResult = await pool.query(
    'SELECT start_hour, end_hour FROM working_hours WHERE shop_id = $1 AND day_of_week = $2',
    [shopId, dow]
  );
  if (whResult.rows.length === 0) return [];
  const { start_hour, end_hour } = whResult.rows[0];
  // 2) Fetch existing appointments for that date (start_time) 
  const appointmentsResult = await pool.query(
    `SELECT start_time, end_time FROM appointments 
     WHERE shop_id = $1 AND DATE(start_time) = $2 AND status = 'booked'`,
    [shopId, date]
  );
  const appointments = appointmentsResult.rows;
  const slots = [];
  const buffer = 10; // 10-minute buffer
  // Convert times to minutes since day start for easier math
  const [startHour, startMin] = start_hour.split(':').map(Number);
  const [endHour, endMin] = end_hour.split(':').map(Number);
  let slotTime = new Date(date);
  slotTime.setHours(startHour, startMin, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(endHour, endMin, 0, 0);

  while ((slotTime.getTime() + serviceDuration * 60000 + buffer*60000) <= endOfDay.getTime()) {
    const slotEnd = new Date(slotTime.getTime() + serviceDuration*60000);
    // Check overlap with existing appointments
    const overlap = appointments.some(appt => {
      const apptStart = new Date(appt.start_time);
      const apptEnd = new Date(appt.end_time);
      return (slotTime < apptEnd.getTime() + buffer*60000) && (slotEnd.getTime() + buffer*60000 > apptStart);
    });
    if (!overlap) {
      slots.push(slotTime.toISOString());
    }
    // Move to next 15-minute increment (configurable)
    slotTime = new Date(slotTime.getTime() + 15*60000);
  }
  return slots;
}

// Client fetches available slots for a date and service
router.get('/slots', authenticateToken, authorizeRoles('client'), async (req, res) => {
  const { shopId, serviceId, date } = req.query; 
  // date format: YYYY-MM-DD
  if (!shopId || !serviceId || !date) {
    return res.status(400).json({ message: 'Missing parameters' });
  }
  try {
    // Get service duration
    const servResult = await pool.query('SELECT duration_minutes FROM services WHERE id = $1', [serviceId]);
    if (servResult.rows.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }
    const duration = servResult.rows[0].duration_minutes;
    const slots = await getAvailableSlots(shopId, duration, date);
    res.json({ slots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching slots' });
  }
});

// Client books an appointment
router.post('/book', 
  authenticateToken, authorizeRoles('client'),
  async (req, res) => {
    try {
      const { shopId, serviceId, startTime } = req.body;
      const clientId = req.user.id;
      
      console.log('Booking request:', { clientId, shopId, serviceId, startTime });
      
      if (!shopId || !serviceId || !startTime) {
        return res.status(400).json({ message: 'Missing required fields: shopId, serviceId, startTime' });
      }
      
      // Validate service exists
      const servResult = await pool.query('SELECT duration_minutes FROM services WHERE id = $1', [serviceId]);
      if (servResult.rows.length === 0) {
        return res.status(404).json({ message: 'Service not found' });
      }
      
      const duration = servResult.rows[0].duration_minutes;
      const start = new Date(startTime);
      
      if (isNaN(start.getTime())) {
        return res.status(400).json({ message: 'Invalid startTime format' });
      }
      
      const end = new Date(start.getTime() + duration * 60000);
      
      // Simple booking without availability check for now
      // TODO: Implement proper slot validation with timezone handling
      const result = await pool.query(
        `INSERT INTO appointments (client_id, shop_id, service_id, start_time, end_time, status) 
         VALUES ($1, $2, $3, $4, $5, 'booked')
         RETURNING id, start_time, end_time`,
        [clientId, shopId, serviceId, start.toISOString(), end.toISOString()]
      );
      // Emit real-time event to barber (if Socket.IO available)
      try {
        const io = req.app && req.app.locals && req.app.locals.io;
        if (io) {
          // find shop owner id
          const shopRes = await pool.query('SELECT owner_id FROM barber_shops WHERE id = $1', [shopId]);
          if (shopRes.rows.length > 0) {
            const ownerId = shopRes.rows[0].owner_id;
            io.to(`barber_${ownerId}`).emit('appointment_created', {
              appointment: result.rows[0],
              shopId,
              serviceId,
              clientId,
              clientName: req.user.name || req.user.email || `Client ${clientId}`,
              serviceName: servResult.rows[0].name,
              startTime: start.toISOString(),
              endTime: end.toISOString()
            });
          }
        }
      } catch (emitErr) {
        console.error('Emit error:', emitErr);
      }

      res.status(201).json({ 
        message: 'Appointment booked successfully',
        appointment: result.rows[0]
      });
    } catch (err) {
      console.error('Booking error:', err);
      res.status(500).json({ message: 'Booking error: ' + err.message });
    }
});

// Emit real-time events when appointments are created/cancelled/updated
async function emitAppointmentEvent(type, appointmentId) {
  try {
    // Fetch appointment with shop owner
    const apptRes = await pool.query('SELECT a.*, bs.owner_id FROM appointments a JOIN barber_shops bs ON a.shop_id = bs.id WHERE a.id = $1', [appointmentId]);
    if (apptRes.rows.length === 0) return;
    const appt = apptRes.rows[0];
    const io = require('../app').locals?.io || null;
    // Fallback to app.locals via pool? Better to access via global app -- instead use process-wide event: app.locals not accessible here easily
    // Instead, require('../app') won't work because app.js exports nothing. Use a different approach: read from require('express')? Simpler: retrieve io from pool._client? Not feasible.
  } catch (err) {
    console.error('emitAppointmentEvent error:', err);
  }
}

// Get appointments (both barber and client)
router.get('/appointments', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    let query, params;

    if (userRole === 'barber') {
      // Barber sees appointments for their shop
      const shopResult = await pool.query('SELECT id FROM barber_shops WHERE owner_id = $1', [userId]);
      if (shopResult.rows.length === 0) return res.json([]);
      const shopId = shopResult.rows[0].id;
            query = 'SELECT a.*, u.name AS client_name, s.name AS service_name, s.price AS service_price FROM appointments a ' +
              'JOIN users u ON a.client_id = u.id ' +
              'JOIN services s ON a.service_id = s.id ' +
              'WHERE a.shop_id = $1 ORDER BY a.start_time';
      params = [shopId];
    } else if (userRole === 'client') {
      // Client sees their own appointments
            query = 'SELECT a.*, bs.name AS shop_name, s.name AS service_name, s.price AS service_price FROM appointments a ' +
              'JOIN barber_shops bs ON a.shop_id = bs.id ' +
              'JOIN services s ON a.service_id = s.id ' +
              'WHERE a.client_id = $1 ORDER BY a.start_time';
      params = [userId];
    } else {
      return res.status(403).json({ message: 'Invalid role' });
    }

    const appointmentsResult = await pool.query(query, params);
    res.json(appointmentsResult.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get barber appointments (alias for barber dashboard)
router.get('/barber-appointments', authenticateToken, authorizeRoles('barber'), async (req, res) => {
  const userId = req.user.id;

  try {
    const shopResult = await pool.query('SELECT id FROM barber_shops WHERE owner_id = $1', [userId]);
    if (shopResult.rows.length === 0) return res.json([]);
    const shopId = shopResult.rows[0].id;

    const query = 'SELECT a.*, u.name AS client_name, s.name AS service_name, s.price AS service_price FROM appointments a ' +
      'JOIN users u ON a.client_id = u.id ' +
      'JOIN services s ON a.service_id = s.id ' +
      'WHERE a.shop_id = $1 ORDER BY a.start_time DESC';

    const appointmentsResult = await pool.query(query, [shopId]);
    res.json(appointmentsResult.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update appointment status (barber only)
router.put('/appointments/:id/status', authenticateToken, authorizeRoles('barber'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;

  if (!['booked', 'done', 'cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    // Verify barber owns the shop for this appointment
    const shopResult = await pool.query('SELECT id FROM barber_shops WHERE owner_id = $1', [userId]);
    if (shopResult.rows.length === 0) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const shopId = shopResult.rows[0].id;

    const result = await pool.query(
      'UPDATE appointments SET status = $1 WHERE id = $2 AND shop_id = $3 RETURNING *',
      [status, id, shopId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Emit to barber
    try {
      const io = req.app && req.app.locals && req.app.locals.io;
      if (io) io.to(`barber_${userId}`).emit('appointment_updated', { id, status });
    } catch (emitErr) {
      console.error('Emit error:', emitErr);
    }

    res.json({ message: 'Appointment updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel appointment (client or barber)
router.put('/appointments/:id/cancel', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    let query, params;

    if (userRole === 'client') {
      // Client can only cancel their own appointments
      query = 'UPDATE appointments SET status = \'cancelled\' WHERE id = $1 AND client_id = $2 RETURNING *';
      params = [id, userId];
    } else if (userRole === 'barber') {
      // Barber can cancel appointments for their shop
      const shopResult = await pool.query('SELECT id FROM barber_shops WHERE owner_id = $1', [userId]);
      if (shopResult.rows.length === 0) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      const shopId = shopResult.rows[0].id;
      query = 'UPDATE appointments SET status = \'cancelled\' WHERE id = $1 AND shop_id = $2 RETURNING *';
      params = [id, shopId];
    } else {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Emit cancellation
    try {
      const io = req.app && req.app.locals && req.app.locals.io;
      if (io) {
        // fetch appointment to get shop owner and client name
        const apptRes = await pool.query(
          'SELECT a.shop_id, a.client_id, u.name AS client_name FROM appointments a JOIN users u ON a.client_id = u.id WHERE a.id = $1',
          [id]
        );
        if (apptRes.rows.length > 0) {
          const shopId = apptRes.rows[0].shop_id;
          const clientName = apptRes.rows[0].client_name || `Client ${apptRes.rows[0].client_id}`;
          const shopRes = await pool.query('SELECT owner_id FROM barber_shops WHERE id = $1', [shopId]);
          if (shopRes.rows.length > 0) {
            const ownerId = shopRes.rows[0].owner_id;
            io.to(`barber_${ownerId}`).emit('appointment_cancelled', { id, clientName });
          }
        }
      }
    } catch (emitErr) {
      console.error('Emit error:', emitErr);
    }

    res.json({ message: 'Appointment cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;