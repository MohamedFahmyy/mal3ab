import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, getPool } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Normalize phone numbers
export const normalizePhone = (phone) => {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[^\d]/g, '');
  if (cleaned.startsWith('20') && cleaned.length === 12) {
    cleaned = '0' + cleaned.slice(2);
  }
  return cleaned.trim();
};

const parseJsonField = (val, defaultVal = []) => {
  if (!val) return defaultVal;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return defaultVal;
  }
};

// --- API ROUTES ---

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const pool = getPool();
    await pool.query('SELECT 1;');
    res.json({
      status: 'ok',
      service: 'Malaeb MySQL API',
      database: 'connected (MySQL)',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'error', database: err.message });
  }
});

// --- PITCHES ---
app.get('/api/pitches', async (req, res) => {
  try {
    const pool = getPool();
    const { area, type, search, maxPrice, sortBy } = req.query;

    let query = 'SELECT * FROM `pitches` WHERE 1=1';
    const params = [];

    if (area && area !== 'الكل' && area !== 'all') {
      query += ' AND (`area` = ? OR `city` = ?)';
      params.push(area, area);
    }

    if (type && type !== 'الكل' && type !== 'all') {
      query += ' AND `type` = ?';
      params.push(type);
    }

    if (search) {
      query += ' AND (`name` LIKE ? OR `nameAr` LIKE ? OR `area` LIKE ? OR `city` LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    if (maxPrice) {
      query += ' AND `pricePerHour` <= ?';
      params.push(Number(maxPrice));
    }

    if (sortBy === 'price-asc') {
      query += ' ORDER BY `pricePerHour` ASC';
    } else if (sortBy === 'price-desc') {
      query += ' ORDER BY `pricePerHour` DESC';
    } else if (sortBy === 'rating') {
      query += ' ORDER BY `rating` DESC';
    } else {
      query += ' ORDER BY `createdAt` DESC';
    }

    const [rows] = await pool.query(query, params);

    const formatted = rows.map(r => ({
      ...r,
      pricePerHour: Number(r.pricePerHour),
      rating: Number(r.rating),
      facilities: parseJsonField(r.facilities, []),
      availableSlots: parseJsonField(r.availableSlots, [])
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    console.error('Error fetching pitches:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب بيانات الملاعب' });
  }
});

app.get('/api/pitches/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { date } = req.query;

    const [pitchRows] = await pool.query('SELECT * FROM `pitches` WHERE `id` = ?', [id]);
    if (pitchRows.length === 0) {
      return res.status(404).json({ success: false, message: 'الملعب غير موجود' });
    }

    const pitch = pitchRows[0];
    pitch.facilities = parseJsonField(pitch.facilities, []);
    pitch.availableSlots = parseJsonField(pitch.availableSlots, []);
    pitch.pricePerHour = Number(pitch.pricePerHour);

    const targetDate = date || new Date().toISOString().split('T')[0];
    const [bookings] = await pool.query(
      `SELECT id, customerName, timeSlots, paymentStatus, discountAmount 
       FROM \`bookings\` 
       WHERE \`pitchId\` = ? AND \`date\` = ? AND \`status\` NOT IN ('cancelled', 'ملغي');`,
      [id, targetDate]
    );

    const defaultSlots = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00'];
    const availableSlotsList = pitch.availableSlots.length > 0 ? pitch.availableSlots : defaultSlots;

    const parsedBookings = bookings.map(b => ({
      ...b,
      timeSlots: parseJsonField(b.timeSlots, [])
    }));

    const slotsStatus = availableSlotsList.map(time => {
      const activeBooking = parsedBookings.find(b => b.timeSlots.includes(time));
      return {
        time,
        isAvailable: !activeBooking,
        booking: activeBooking ? {
          id: activeBooking.id,
          customerName: activeBooking.customerName || 'عميل غير مسجل',
          paymentStatus: activeBooking.paymentStatus || 'unpaid',
          discountAmount: Number(activeBooking.discountAmount || 0)
        } : null
      };
    });

    res.json({
      success: true,
      data: {
        ...pitch,
        selectedDate: targetDate,
        slots: slotsStatus
      }
    });
  } catch (err) {
    console.error('Error fetching pitch details:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب تفاصيل الملعب' });
  }
});

app.post('/api/pitches', async (req, res) => {
  try {
    const pool = getPool();
    const { name, nameAr, area, city, type, pricePerHour, address, surface, ownerPhone, image, facilities } = req.body;

    if (!name || !area || !type || !pricePerHour || !ownerPhone) {
      return res.status(400).json({ success: false, message: 'يرجى إكمال البيانات الأساسية للملعب' });
    }

    const newPitch = {
      id: 'pitch-' + Date.now(),
      name,
      nameAr: nameAr || name,
      area,
      city: city || area,
      type,
      pricePerHour: Number(pricePerHour),
      rating: 5.0,
      reviewsCount: 1,
      image: image || 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1000&q=80',
      address: address || 'عنوان الملعب',
      surface: surface || 'نجيل صناعي ممتاز',
      facilities: facilities || ['إضاءة ليلية', 'غرف تغيير ملابس'],
      description: 'ملعب مميز مضاف جديداً عبر المنصة.',
      ownerPhone,
      availableSlots: ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00']
    };

    await pool.query(
      `INSERT INTO \`pitches\` (id, name, nameAr, area, city, type, pricePerHour, rating, reviewsCount, image, address, surface, facilities, description, ownerPhone, availableSlots)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        newPitch.id, newPitch.name, newPitch.nameAr, newPitch.area, newPitch.city,
        newPitch.type, newPitch.pricePerHour, newPitch.rating, newPitch.reviewsCount,
        newPitch.image, newPitch.address, newPitch.surface, JSON.stringify(newPitch.facilities),
        newPitch.description, newPitch.ownerPhone, JSON.stringify(newPitch.availableSlots)
      ]
    );

    res.status(201).json({ success: true, message: 'تم إضافة الملعب بنجاح! 🎉', data: newPitch });
  } catch (err) {
    console.error('Error creating pitch:', err);
    res.status(500).json({ success: false, message: 'خطأ في إضافة الملعب' });
  }
});

// Update Pitch
app.put('/api/pitches/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { 
      name, nameAr, area, city, type, pricePerHour, 
      address, surface, ownerPhone, image, facilities, 
      description, availableSlots 
    } = req.body;

    const [existingRows] = await pool.query('SELECT * FROM `pitches` WHERE `id` = ?', [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'الملعب غير موجود' });
    }

    const current = existingRows[0];
    const updated = {
      name: name ?? current.name,
      nameAr: nameAr ?? current.nameAr ?? name ?? current.name,
      area: area ?? current.area,
      city: city ?? current.city,
      type: type ?? current.type,
      pricePerHour: pricePerHour !== undefined ? Number(pricePerHour) : Number(current.pricePerHour),
      address: address ?? current.address,
      surface: surface ?? current.surface,
      ownerPhone: ownerPhone ?? current.ownerPhone,
      image: image ?? current.image,
      facilities: facilities ? (Array.isArray(facilities) ? JSON.stringify(facilities) : facilities) : current.facilities,
      description: description ?? current.description,
      availableSlots: availableSlots ? (Array.isArray(availableSlots) ? JSON.stringify(availableSlots) : availableSlots) : current.availableSlots
    };

    await pool.query(
      `UPDATE \`pitches\` SET 
        \`name\` = ?, \`nameAr\` = ?, \`area\` = ?, \`city\` = ?, \`type\` = ?,
        \`pricePerHour\` = ?, \`address\` = ?, \`surface\` = ?, \`ownerPhone\` = ?,
        \`image\` = ?, \`facilities\` = ?, \`description\` = ?, \`availableSlots\` = ?
       WHERE \`id\` = ?;`,
      [
        updated.name, updated.nameAr, updated.area, updated.city, updated.type,
        updated.pricePerHour, updated.address, updated.surface, updated.ownerPhone,
        updated.image, updated.facilities, updated.description, updated.availableSlots,
        id
      ]
    );

    // Update pitch name in bookings table if changed
    if (updated.nameAr || updated.name) {
      await pool.query('UPDATE `bookings` SET `pitchName` = ?, `pitchArea` = ? WHERE `pitchId` = ?', [
        updated.nameAr || updated.name,
        updated.area,
        id
      ]);
    }

    const [updatedRows] = await pool.query('SELECT * FROM `pitches` WHERE `id` = ?', [id]);
    const finalPitch = updatedRows[0];
    finalPitch.facilities = parseJsonField(finalPitch.facilities, []);
    finalPitch.availableSlots = parseJsonField(finalPitch.availableSlots, []);
    finalPitch.pricePerHour = Number(finalPitch.pricePerHour);
    finalPitch.rating = Number(finalPitch.rating);

    res.json({
      success: true,
      message: 'تم تعديل بيانات الملعب بنجاح! 🎉',
      data: finalPitch
    });
  } catch (err) {
    console.error('Error updating pitch:', err);
    res.status(500).json({ success: false, message: 'خطأ في تعديل الملعب' });
  }
});

// Delete Pitch
app.delete('/api/pitches/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    const [existingRows] = await pool.query('SELECT * FROM `pitches` WHERE `id` = ?', [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'الملعب غير موجود' });
    }

    // Delete associated payments and bookings
    await pool.query('DELETE FROM `bookings` WHERE `pitchId` = ?', [id]);
    await pool.query('DELETE FROM `pitches` WHERE `id` = ?', [id]);

    res.json({
      success: true,
      message: 'تم حذف الملعب وجميع الحجوزات المرتبطة به بنجاح'
    });
  } catch (err) {
    console.error('Error deleting pitch:', err);
    res.status(500).json({ success: false, message: 'خطأ في حذف الملعب' });
  }
});

// --- BOOKINGS ---
app.get('/api/bookings', async (req, res) => {
  try {
    const pool = getPool();
    const { phone, customerId, pitchId, date, paymentStatus } = req.query;

    let query = 'SELECT * FROM `bookings` WHERE 1=1';
    const params = [];

    if (phone) {
      query += ' AND `customerPhone` = ?';
      params.push(normalizePhone(phone));
    }

    if (customerId) {
      query += ' AND `customerId` = ?';
      params.push(customerId);
    }

    if (pitchId && pitchId !== 'all') {
      query += ' AND `pitchId` = ?';
      params.push(pitchId);
    }

    if (date) {
      query += ' AND `date` = ?';
      params.push(date);
    }

    if (paymentStatus && paymentStatus !== 'all') {
      query += ' AND `paymentStatus` = ?';
      params.push(paymentStatus);
    }

    query += ' ORDER BY `createdAt` DESC';

    const [rows] = await pool.query(query, params);

    const formatted = rows.map(r => ({
      ...r,
      date: r.date ? new Date(r.date).toISOString().split('T')[0] : '',
      timeSlots: parseJsonField(r.timeSlots, []),
      hours: Number(r.hours),
      pricePerHour: Number(r.pricePerHour),
      totalAmount: Number(r.totalAmount),
      discountValue: Number(r.discountValue),
      discountAmount: Number(r.discountAmount),
      netAmount: Number(r.netAmount),
      paidAmount: Number(r.paidAmount),
      remainingAmount: Number(r.remainingAmount)
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الحجوزات' });
  }
});

app.get('/api/bookings/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    const [bookingRows] = await pool.query('SELECT * FROM `bookings` WHERE `id` = ?', [id]);
    if (bookingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    }

    const booking = bookingRows[0];
    booking.date = booking.date ? new Date(booking.date).toISOString().split('T')[0] : '';
    booking.timeSlots = parseJsonField(booking.timeSlots, []);
    booking.hours = Number(booking.hours);
    booking.pricePerHour = Number(booking.pricePerHour);
    booking.totalAmount = Number(booking.totalAmount);
    booking.discountValue = Number(booking.discountValue);
    booking.discountAmount = Number(booking.discountAmount);
    booking.netAmount = Number(booking.netAmount);
    booking.paidAmount = Number(booking.paidAmount);
    booking.remainingAmount = Number(booking.remainingAmount);

    const [payments] = await pool.query(
      'SELECT * FROM `payments` WHERE `bookingId` = ? ORDER BY `createdAt` DESC',
      [id]
    );

    const formattedPayments = payments.map(p => ({
      ...p,
      amount: Number(p.amount)
    }));

    res.json({
      success: true,
      data: {
        ...booking,
        payments: formattedPayments
      }
    });
  } catch (err) {
    console.error('Error fetching booking details:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب تفاصيل الحجز' });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const pool = getPool();
    const {
      pitchId,
      customerName,
      customerPhone,
      date,
      timeSlots,
      paymentMethod,
      paidAmount = 0,
      discountType = 'none',
      discountValue = 0,
      discountNotes = '',
      notes = ''
    } = req.body;

    if (!pitchId || !customerName || !customerPhone || !date || !timeSlots || timeSlots.length === 0) {
      return res.status(400).json({ success: false, message: 'بيانات الحجز غير مكتملة' });
    }

    const [pitchRows] = await pool.query('SELECT * FROM `pitches` WHERE `id` = ?', [pitchId]);
    if (pitchRows.length === 0) {
      return res.status(404).json({ success: false, message: 'الملعب المحدد غير موجود' });
    }
    const pitch = pitchRows[0];

    // Check collision against active bookings
    const [existingBookings] = await pool.query(
      `SELECT id, timeSlots FROM \`bookings\` 
       WHERE \`pitchId\` = ? AND \`date\` = ? AND \`status\` NOT IN ('cancelled', 'ملغي');`,
      [pitchId, date]
    );

    const hasCollision = existingBookings.some(b => {
      const bookedSlots = parseJsonField(b.timeSlots, []);
      return bookedSlots.some(t => timeSlots.includes(t));
    });

    if (hasCollision) {
      return res.status(409).json({ success: false, message: 'عذراً، هذا الموعد تم حجزه بالفعل! يرجى اختيار ميعاد آخر.' });
    }

    // Server-side calculations
    const hours = timeSlots.length;
    const pricePerHour = Number(pitch.pricePerHour);
    const totalAmount = pricePerHour * hours;

    const numDiscountVal = Math.max(0, Number(discountValue || 0));
    let discountAmount = 0;
    if (discountType === 'percentage') {
      if (numDiscountVal > 100) {
        return res.status(400).json({ success: false, message: 'لا يمكن أن تتجاوز نسبة الخصم 100%' });
      }
      discountAmount = Math.round((totalAmount * numDiscountVal) / 100);
    } else if (discountType === 'fixed') {
      if (numDiscountVal > totalAmount) {
        return res.status(400).json({ success: false, message: 'قيمة الخصم لا يمكن أن تتجاوز إجمالي الحجز قبل الخصم' });
      }
      discountAmount = numDiscountVal;
    }

    const netAmount = Math.max(0, totalAmount - discountAmount);

    const initialPaid = Math.max(0, Number(paidAmount || 0));
    if (initialPaid > netAmount) {
      return res.status(400).json({
        success: false,
        message: `المبلغ المدفوع (${initialPaid} ج.م) لا يمكن أن يتجاوز صافي قيمة الحجز (${netAmount} ج.م)`
      });
    }

    const remainingAmount = Math.max(0, netAmount - initialPaid);
    let paymentStatus = 'unpaid';
    if (netAmount === 0 || initialPaid >= netAmount) {
      paymentStatus = 'paid';
    } else if (initialPaid > 0 && initialPaid < netAmount) {
      paymentStatus = 'partial';
    }

    // Find or create customer
    const normPhone = normalizePhone(customerPhone);
    const [custRows] = await pool.query('SELECT * FROM `customers` WHERE `phone` = ?', [normPhone]);
    let customerId;

    if (custRows.length === 0) {
      customerId = 'cust-' + normPhone;
      await pool.query(
        `INSERT INTO \`customers\` (id, name, phone, notes, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 'active', NOW(), NOW())`,
        [customerId, customerName.trim(), normPhone, 'تم التسجيل تلقائياً مع أول حجز']
      );
    } else {
      customerId = custRows[0].id;
      if (customerName && customerName.trim() && (custRows[0].name.startsWith('عميل ') || custRows[0].name === 'حجز إداري')) {
        await pool.query('UPDATE `customers` SET `name` = ?, `updatedAt` = NOW() WHERE `id` = ?', [customerName.trim(), customerId]);
      }
    }

    const bookingRef = 'MLB-' + Math.floor(100000 + Math.random() * 900000);

    await pool.query(
      `INSERT INTO \`bookings\` 
       (id, pitchId, pitchName, pitchArea, customerId, customerName, customerPhone, date, timeSlots, hours, pricePerHour, totalAmount, discountType, discountValue, discountAmount, discountNotes, netAmount, paidAmount, remainingAmount, paymentStatus, paymentMethod, notes, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', NOW());`,
      [
        bookingRef, pitchId, pitch.nameAr || pitch.name, pitch.area, customerId,
        customerName.trim(), normPhone, date, JSON.stringify(timeSlots),
        hours, pricePerHour, totalAmount, discountType, numDiscountVal, discountAmount,
        discountNotes || '', netAmount, initialPaid, remainingAmount, paymentStatus,
        paymentMethod || 'cash', notes || ''
      ]
    );

    // If initial payment exists, record in payments table
    if (initialPaid > 0) {
      const paymentRef = 'PAY-' + bookingRef.replace('MLB-', '') + '-1';
      await pool.query(
        `INSERT INTO \`payments\` 
         (id, bookingId, customerId, customerName, customerPhone, amount, paymentMethod, type, notes, createdBy, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'payment', 'دفعة أولى مسجلة مع إنشاء الحجز', 'إدارة المنصة', NOW());`,
        [paymentRef, bookingRef, customerId, customerName.trim(), normPhone, initialPaid, paymentMethod || 'cash']
      );
    }

    const newBooking = {
      id: bookingRef,
      pitchId,
      pitchName: pitch.nameAr || pitch.name,
      pitchArea: pitch.area,
      customerId,
      customerName: customerName.trim(),
      customerPhone: normPhone,
      date,
      timeSlots,
      hours,
      pricePerHour,
      totalAmount,
      discountType,
      discountValue: numDiscountVal,
      discountAmount,
      discountNotes: discountNotes || '',
      netAmount,
      paidAmount: initialPaid,
      remainingAmount,
      paymentStatus,
      paymentMethod: paymentMethod || 'cash',
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      message: 'تم تأكيد الحجز بنجاح! ⚽🎉',
      data: newBooking
    });
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء الحجز' });
  }
});

app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    const [rows] = await pool.query('SELECT * FROM `bookings` WHERE `id` = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    }

    await pool.query('UPDATE `bookings` SET `status` = ? WHERE `id` = ?', ['cancelled', id]);

    res.json({
      success: true,
      message: 'تم إلغاء الحجز بنجاح مع الحفاظ على سجل العميل والمدفوعات',
      data: { ...rows[0], status: 'cancelled' }
    });
  } catch (err) {
    console.error('Error cancelling booking:', err);
    res.status(500).json({ success: false, message: 'خطأ في إلغاء الحجز' });
  }
});

// --- CUSTOMERS CRM ---
app.get('/api/customers', async (req, res) => {
  try {
    const pool = getPool();
    const { search, sortBy, status } = req.query;

    let query = `
      SELECT c.*, 
             COUNT(DISTINCT CASE WHEN b.status NOT IN ('cancelled', 'ملغي') THEN b.id END) AS totalBookings,
             COALESCE(SUM(CASE WHEN b.status NOT IN ('cancelled', 'ملغي') THEN b.totalAmount ELSE 0 END), 0) AS totalGross,
             COALESCE(SUM(CASE WHEN b.status NOT IN ('cancelled', 'ملغي') THEN b.discountAmount ELSE 0 END), 0) AS totalDiscount,
             COALESCE(SUM(CASE WHEN b.status NOT IN ('cancelled', 'ملغي') THEN b.netAmount ELSE 0 END), 0) AS totalNet,
             COALESCE(SUM(CASE WHEN b.status NOT IN ('cancelled', 'ملغي') THEN b.paidAmount ELSE 0 END), 0) AS totalPaid,
             COALESCE(SUM(CASE WHEN b.status NOT IN ('cancelled', 'ملغي') THEN b.remainingAmount ELSE 0 END), 0) AS remainingBalance,
             MAX(CASE WHEN b.status NOT IN ('cancelled', 'ملغي') THEN DATE_FORMAT(b.date, '%Y-%m-%d') END) AS lastBooking
      FROM \`customers\` c
      LEFT JOIN \`bookings\` b ON (b.customerId = c.id OR b.customerPhone = c.phone)
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      query += ' AND c.status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (c.name LIKE ? OR c.phone LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s);
    }

    query += ' GROUP BY c.id';

    if (sortBy === 'name') {
      query += ' ORDER BY c.name ASC';
    } else if (sortBy === 'bookings') {
      query += ' ORDER BY totalBookings DESC';
    } else if (sortBy === 'balance') {
      query += ' ORDER BY remainingBalance DESC';
    } else if (sortBy === 'paid') {
      query += ' ORDER BY totalPaid DESC';
    } else {
      query += ' ORDER BY c.createdAt DESC';
    }

    const [rows] = await pool.query(query, params);

    const formatted = rows.map(r => ({
      ...r,
      totalBookings: Number(r.totalBookings || 0),
      totalGross: Number(r.totalGross || 0),
      totalDiscount: Number(r.totalDiscount || 0),
      totalNet: Number(r.totalNet || 0),
      totalPaid: Number(r.totalPaid || 0),
      remainingBalance: Number(r.remainingBalance || 0)
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب بيانات العملاء' });
  }
});

app.get('/api/customers/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    const [custRows] = await pool.query(
      `SELECT c.*, 
              COUNT(DISTINCT CASE WHEN b.status NOT IN ('cancelled', 'ملغي') THEN b.id END) AS totalBookings,
              COALESCE(SUM(CASE WHEN b.status NOT IN ('cancelled', 'ملغي') THEN b.totalAmount ELSE 0 END), 0) AS totalGross,
              COALESCE(SUM(CASE WHEN b.status NOT IN ('cancelled', 'ملغي') THEN b.discountAmount ELSE 0 END), 0) AS totalDiscount,
              COALESCE(SUM(CASE WHEN b.status NOT IN ('cancelled', 'ملغي') THEN b.netAmount ELSE 0 END), 0) AS totalNet,
              COALESCE(SUM(CASE WHEN b.status NOT IN ('cancelled', 'ملغي') THEN b.paidAmount ELSE 0 END), 0) AS totalPaid,
              COALESCE(SUM(CASE WHEN b.status NOT IN ('cancelled', 'ملغي') THEN b.remainingAmount ELSE 0 END), 0) AS remainingBalance,
              MAX(CASE WHEN b.status NOT IN ('cancelled', 'ملغي') THEN DATE_FORMAT(b.date, '%Y-%m-%d') END) AS lastBooking
       FROM \`customers\` c
       LEFT JOIN \`bookings\` b ON (b.customerId = c.id OR b.customerPhone = c.phone)
       WHERE c.id = ? OR c.phone = ?
       GROUP BY c.id;`,
      [id, id]
    );

    if (custRows.length === 0) {
      return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    }

    const customer = custRows[0];
    customer.totalBookings = Number(customer.totalBookings || 0);
    customer.totalGross = Number(customer.totalGross || 0);
    customer.totalDiscount = Number(customer.totalDiscount || 0);
    customer.totalNet = Number(customer.totalNet || 0);
    customer.totalPaid = Number(customer.totalPaid || 0);
    customer.remainingBalance = Number(customer.remainingBalance || 0);

    const [bookings] = await pool.query(
      `SELECT * FROM \`bookings\` 
       WHERE \`customerId\` = ? OR \`customerPhone\` = ? 
       ORDER BY \`createdAt\` DESC;`,
      [customer.id, customer.phone]
    );

    const formattedBookings = bookings.map(b => ({
      ...b,
      date: b.date ? new Date(b.date).toISOString().split('T')[0] : '',
      timeSlots: parseJsonField(b.timeSlots, []),
      hours: Number(b.hours),
      pricePerHour: Number(b.pricePerHour),
      totalAmount: Number(b.totalAmount),
      discountValue: Number(b.discountValue),
      discountAmount: Number(b.discountAmount),
      netAmount: Number(b.netAmount),
      paidAmount: Number(b.paidAmount),
      remainingAmount: Number(b.remainingAmount)
    }));

    const [payments] = await pool.query(
      `SELECT * FROM \`payments\` 
       WHERE \`customerId\` = ? OR \`customerPhone\` = ? 
       ORDER BY \`createdAt\` DESC;`,
      [customer.id, customer.phone]
    );

    const formattedPayments = payments.map(p => ({
      ...p,
      amount: Number(p.amount)
    }));

    res.json({
      success: true,
      data: {
        ...customer,
        bookings: formattedBookings,
        payments: formattedPayments
      }
    });
  } catch (err) {
    console.error('Error fetching customer details:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب ملف العميل' });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const pool = getPool();
    const { name, phone, notes, status } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'الاسم ورقم الهاتف مطلوبان' });
    }

    const normPhone = normalizePhone(phone);
    if (normPhone.length < 10) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال رقم هاتف صحيح يتكون من 11 رقم' });
    }

    const [existing] = await pool.query('SELECT id FROM `customers` WHERE `phone` = ?', [normPhone]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'يوجد عميل مسجل بالفعل برقم الهاتف هذا' });
    }

    const newCustomer = {
      id: 'cust-' + normPhone,
      name: name.trim(),
      phone: normPhone,
      notes: notes || '',
      status: status || 'active'
    };

    await pool.query(
      `INSERT INTO \`customers\` (id, name, phone, notes, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW());`,
      [newCustomer.id, newCustomer.name, newCustomer.phone, newCustomer.notes, newCustomer.status]
    );

    res.status(201).json({ success: true, message: 'تم إضافة العميل بنجاح', data: newCustomer });
  } catch (err) {
    console.error('Error creating customer:', err);
    res.status(500).json({ success: false, message: 'خطأ في إضافة العميل' });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { name, phone, notes, status } = req.body;

    const [existing] = await pool.query('SELECT * FROM `customers` WHERE `id` = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    }

    const oldPhone = existing[0].phone;
    let newNormPhone = oldPhone;

    if (phone) {
      newNormPhone = normalizePhone(phone);
      if (newNormPhone !== oldPhone) {
        const [conflict] = await pool.query('SELECT id FROM `customers` WHERE `phone` = ? AND `id` != ?', [newNormPhone, id]);
        if (conflict.length > 0) {
          return res.status(409).json({ success: false, message: 'رقم الهاتف الجديد مستخدم بالفعل لعميل آخر' });
        }
      }
    }

    const updatedName = name ? name.trim() : existing[0].name;
    const updatedNotes = notes !== undefined ? notes : existing[0].notes;
    const updatedStatus = status || existing[0].status;

    await pool.query(
      `UPDATE \`customers\` 
       SET \`name\` = ?, \`phone\` = ?, \`notes\` = ?, \`status\` = ?, \`updatedAt\` = NOW() 
       WHERE \`id\` = ?;`,
      [updatedName, newNormPhone, updatedNotes, updatedStatus, id]
    );

    // Keep linked bookings and payments updated
    if (newNormPhone !== oldPhone || updatedName !== existing[0].name) {
      await pool.query(
        'UPDATE `bookings` SET `customerPhone` = ?, `customerName` = ? WHERE `customerId` = ? OR `customerPhone` = ?;',
        [newNormPhone, updatedName, id, oldPhone]
      );
      await pool.query(
        'UPDATE `payments` SET `customerPhone` = ?, `customerName` = ? WHERE `customerId` = ? OR `customerPhone` = ?;',
        [newNormPhone, updatedName, id, oldPhone]
      );
    }

    res.json({
      success: true,
      message: 'تم تحديث بيانات العميل بنجاح',
      data: { id, name: updatedName, phone: newNormPhone, notes: updatedNotes, status: updatedStatus }
    });
  } catch (err) {
    console.error('Error updating customer:', err);
    res.status(500).json({ success: false, message: 'خطأ في تحديث العميل' });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    const [custRows] = await pool.query('SELECT * FROM `customers` WHERE `id` = ?', [id]);
    if (custRows.length === 0) {
      return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    }

    const customer = custRows[0];
    const [[{ activeBookingsCount }]] = await pool.query(
      `SELECT COUNT(*) AS activeBookingsCount FROM \`bookings\` 
       WHERE (\`customerId\` = ? OR \`customerPhone\` = ?) AND \`status\` NOT IN ('cancelled', 'ملغي');`,
      [id, customer.phone]
    );

    const [[{ paymentsCount }]] = await pool.query(
      `SELECT COUNT(*) AS paymentsCount FROM \`payments\` 
       WHERE \`customerId\` = ? OR \`customerPhone\` = ?;`,
      [id, customer.phone]
    );

    if (activeBookingsCount > 0 || paymentsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `لا يمكن حذف العميل (${customer.name}) لوجود ${activeBookingsCount} حجز نشط و ${paymentsCount} حركة دفع مسجلة. يمكنك إلغاء تفعيل العميل بدلاً من ذلك.`
      });
    }

    await pool.query('DELETE FROM `customers` WHERE `id` = ?;', [id]);

    res.json({ success: true, message: 'تم حذف العميل بنجاح' });
  } catch (err) {
    console.error('Error deleting customer:', err);
    res.status(500).json({ success: false, message: 'خطأ في حذف العميل' });
  }
});

// --- PAYMENTS & PARTIAL PAYMENTS ---
app.get('/api/payments', async (req, res) => {
  try {
    const pool = getPool();
    const { bookingId, customerId, phone } = req.query;

    let query = 'SELECT * FROM `payments` WHERE 1=1';
    const params = [];

    if (bookingId) {
      query += ' AND `bookingId` = ?';
      params.push(bookingId);
    }

    if (customerId) {
      query += ' AND `customerId` = ?';
      params.push(customerId);
    }

    if (phone) {
      query += ' AND `customerPhone` = ?';
      params.push(normalizePhone(phone));
    }

    query += ' ORDER BY `createdAt` DESC';

    const [rows] = await pool.query(query, params);
    const formatted = rows.map(r => ({ ...r, amount: Number(r.amount) }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب المدفوعات' });
  }
});

app.post('/api/payments', async (req, res) => {
  try {
    const pool = getPool();
    const {
      bookingId,
      amount,
      paymentMethod = 'cash',
      type = 'payment',
      notes = '',
      createdBy = 'مدير النظام'
    } = req.body;

    if (!bookingId || amount === undefined || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'رقم الحجز والمبلغ المطلوب سداده إجباريان وقيمة أكبر من الصفر' });
    }

    const [bRows] = await pool.query('SELECT * FROM `bookings` WHERE `id` = ?', [bookingId]);
    if (bRows.length === 0) {
      return res.status(404).json({ success: false, message: 'الحجز المرتبط غير موجود' });
    }

    const booking = bRows[0];
    if (booking.status === 'cancelled' || booking.status === 'ملغي') {
      return res.status(400).json({ success: false, message: 'لا يمكن تسجيل دفعة لحجز ملغي' });
    }

    const netAmount = Number(booking.netAmount);
    const currentPaid = Number(booking.paidAmount);
    const currentRemaining = Number(booking.remainingAmount);
    const paymentAmount = Number(amount);

    if (type === 'payment') {
      if (paymentAmount > currentRemaining) {
        return res.status(400).json({
          success: false,
          message: `المبلغ المطلوب (${paymentAmount} ج.م) أكبر من الرصيد المتبقي على الحجز (${currentRemaining} ج.م)`
        });
      }
    } else if (type === 'refund') {
      if (paymentAmount > currentPaid) {
        return res.status(400).json({
          success: false,
          message: `مبلغ الاسترداد (${paymentAmount} ج.م) لا يمكن أن يتجاوز إجمالي ما دفعه العميل بالفعل (${currentPaid} ج.م)`
        });
      }
    }

    const paymentRef = 'PAY-' + Math.floor(100000 + Math.random() * 900000);

    await pool.query(
      `INSERT INTO \`payments\` 
       (id, bookingId, customerId, customerName, customerPhone, amount, paymentMethod, type, notes, createdBy, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW());`,
      [
        paymentRef, booking.id, booking.customerId, booking.customerName,
        booking.customerPhone, paymentAmount, paymentMethod, type,
        notes.trim(), createdBy
      ]
    );

    // Compute new paid & remaining amounts
    const delta = type === 'refund' ? -paymentAmount : paymentAmount;
    const newPaid = Math.max(0, currentPaid + delta);
    const newRemaining = Math.max(0, netAmount - newPaid);

    let newPaymentStatus = 'unpaid';
    if (newPaid >= netAmount && netAmount > 0) {
      newPaymentStatus = 'paid';
    } else if (newPaid > 0 && newPaid < netAmount) {
      newPaymentStatus = 'partial';
    }

    await pool.query(
      `UPDATE \`bookings\` 
       SET \`paidAmount\` = ?, \`remainingAmount\` = ?, \`paymentStatus\` = ? 
       WHERE \`id\` = ?;`,
      [newPaid, newRemaining, newPaymentStatus, booking.id]
    );

    const newPayment = {
      id: paymentRef,
      bookingId: booking.id,
      customerId: booking.customerId,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      amount: paymentAmount,
      paymentMethod,
      type,
      notes: notes.trim(),
      createdBy,
      createdAt: new Date().toISOString()
    };

    const updatedBooking = {
      ...booking,
      paidAmount: newPaid,
      remainingAmount: newRemaining,
      paymentStatus: newPaymentStatus
    };

    res.status(201).json({
      success: true,
      message: type === 'refund' ? 'تم تسجيل حركة الاسترداد بنجاح' : 'تم تسجيل الدفعة بنجاح! 💵',
      data: newPayment,
      booking: updatedBooking
    });
  } catch (err) {
    console.error('Error recording payment:', err);
    res.status(500).json({ success: false, message: 'خطأ في تسجيل الدفعة' });
  }
});

// --- FINANCES SUMMARY ---
app.get('/api/finances', async (req, res) => {
  try {
    const pool = getPool();

    const [[totals]] = await pool.query(`
      SELECT 
        COUNT(id) AS bookingsCount,
        COALESCE(SUM(totalAmount), 0) AS grossTotal,
        COALESCE(SUM(discountAmount), 0) AS totalDiscounts,
        COALESCE(SUM(netAmount), 0) AS netTotal,
        COALESCE(SUM(remainingAmount), 0) AS dueTotal
      FROM \`bookings\`
      WHERE \`status\` NOT IN ('cancelled', 'ملغي');
    `);

    // Strictly calculate collected total from valid payments
    const [[collected]] = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'refund' THEN -amount ELSE amount END), 0) AS collectedTotal,
        COALESCE(SUM(CASE WHEN paymentMethod = 'cash' THEN (CASE WHEN type = 'refund' THEN -amount ELSE amount END) ELSE 0 END), 0) AS cashTotal,
        COALESCE(SUM(CASE WHEN paymentMethod = 'vodafone' THEN (CASE WHEN type = 'refund' THEN -amount ELSE amount END) ELSE 0 END), 0) AS vodafoneTotal,
        COALESCE(SUM(CASE WHEN paymentMethod = 'card' THEN (CASE WHEN type = 'refund' THEN -amount ELSE amount END) ELSE 0 END), 0) AS cardTotal
      FROM \`payments\`;
    `);

    // Status counts
    const [statusRows] = await pool.query(`
      SELECT paymentStatus, COUNT(*) AS count
      FROM \`bookings\`
      WHERE \`status\` NOT IN ('cancelled', 'ملغي')
      GROUP BY paymentStatus;
    `);

    const statusCounts = { paid: 0, partial: 0, unpaid: 0 };
    statusRows.forEach(r => {
      if (statusCounts[r.paymentStatus] !== undefined) {
        statusCounts[r.paymentStatus] = Number(r.count);
      }
    });

    res.json({
      success: true,
      data: {
        bookingsCount: Number(totals.bookingsCount),
        grossTotal: Number(totals.grossTotal),
        totalDiscounts: Number(totals.totalDiscounts),
        netTotal: Number(totals.netTotal),
        collectedTotal: Number(collected.collectedTotal),
        dueTotal: Number(totals.dueTotal),
        byPaymentMethod: {
          cash: Number(collected.cashTotal),
          vodafone: Number(collected.vodafoneTotal),
          card: Number(collected.cardTotal)
        },
        statusCounts
      }
    });
  } catch (err) {
    console.error('Error fetching finances:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب تقرير الماليات' });
  }
});

// --- AUTH ---
app.post('/api/auth/login', (req, res) => {
  const { phone, role } = req.body;
  if (!phone) {
    return res.status(400).json({ success: false, message: 'يرجى إدخال رقم الهاتف' });
  }

  const user = {
    id: 'user-' + Math.floor(Math.random() * 10000),
    phone: normalizePhone(phone),
    name: role === 'owner' ? 'صاحب ملعب' : 'لاعب كرة',
    role: role || 'player',
    token: 'jwt-token-demo-' + Date.now()
  };

  res.json({ success: true, message: 'تم تسجيل الدخول بنجاح', data: user });
});

// --- SETTINGS (TITLE, SLOGAN, LOGO, METADATA) ---
app.get('/api/settings', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT `key`, `value` FROM `settings`;');
    const settings = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    const defaults = {
      title: 'مَلعبك',
      slogan: 'المنصة رقم #1 لحجز ملاعب كرة القدم في مصر',
      heroTitle: 'احجز ملعبك ولعبتك تبدأ في دقيقة ⚽',
      heroSubtitle: 'اختر أفضل الملاعب الخماسية والسباعية القريبة منك، قارن الأسعار والتقييمات، وأكّد حجزك أونلاين بضغطة واحدة.',
      logoUrl: '',
      logoEmoji: '⚽',
      contactPhone: '19989',
      contactEmail: 'support@malaeb.eg',
      footerAbout: 'المنصة الأولى المخصصة لحجز ملاعب كرة القدم في مصر. نهدف لتسهيل تجربة حجز الملاعب للاعبين وأصحاب الملاعب بأحدث التقنيات.'
    };
    res.json({ success: true, data: { ...defaults, ...settings } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const saveSettingsHandler = async (req, res) => {
  try {
    const pool = getPool();
    const body = req.body || {};
    for (const [k, v] of Object.entries(body)) {
      if (k === 'updatedAt') continue;
      const strVal = (typeof v === 'object' && v !== null) ? JSON.stringify(v) : String(v);
      await pool.query(
        'INSERT INTO `settings` (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`), `updatedAt`=CURRENT_TIMESTAMP;',
        [k, strVal]
      );
    }
    const [rows] = await pool.query('SELECT `key`, `value` FROM `settings`;');
    const settings = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    res.json({ success: true, message: 'تم حفظ وتحديث إعدادات وبيانات المنصة بنجاح 🎉', data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

app.post('/api/settings', saveSettingsHandler);
app.put('/api/settings', saveSettingsHandler);

// --- ADMIN USERS & PERMISSIONS AUTH ---
app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
    }

    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM `admin_users` WHERE username = ? LIMIT 1;', [username.trim()]);
    let user = rows[0];

    if (!user && username === 'admin' && password === 'admin') {
      user = {
        id: 'user-admin',
        name: 'مدير النظام (Admin)',
        username: 'admin',
        password: 'admin',
        role: 'superadmin',
        permissions: ['quick_booking', 'manage_bookings', 'manage_customers', 'manage_pitches', 'manage_finances', 'manage_settings', 'manage_users'],
        isActive: 1
      };
    }

    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'تم تعطيل هذا الحساب. يرجى مراجعة المسؤول' });
    }

    const perms = parseJsonField(user.permissions, []);
    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      data: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        permissions: perms
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/admin-users', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT id, name, username, role, permissions, isActive, createdAt FROM `admin_users` ORDER BY createdAt DESC;');
    const users = rows.map(u => ({
      ...u,
      permissions: parseJsonField(u.permissions, []),
      isActive: Boolean(u.isActive)
    }));
    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin-users', async (req, res) => {
  try {
    const { name, username, password, role, permissions, isActive } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ success: false, message: 'الاسم واسم المستخدم وكلمة المرور مطلوبة' });
    }

    const pool = getPool();
    const [chk] = await pool.query('SELECT id FROM `admin_users` WHERE username = ?;', [username.trim()]);
    if (chk.length > 0) {
      return res.status(400).json({ success: false, message: 'اسم المستخدم مستخدم بالفعل، يرجى اختيار اسم آخر' });
    }

    const id = 'usr-' + Math.random().toString(36).substring(2, 9);
    const permsJson = JSON.stringify(permissions || []);
    const activeVal = isActive === undefined ? 1 : (isActive ? 1 : 0);

    await pool.query(
      'INSERT INTO `admin_users` (id, name, username, password, role, permissions, isActive) VALUES (?, ?, ?, ?, ?, ?, ?);',
      [id, name.trim(), username.trim(), password.trim(), role || 'custom', permsJson, activeVal]
    );

    res.json({
      success: true,
      message: 'تم إنشاء المستخدم وتحديد صلاحياته بنجاح',
      data: {
        id,
        name: name.trim(),
        username: username.trim(),
        role: role || 'custom',
        permissions: permissions || [],
        isActive: Boolean(activeVal)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin-users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, password, role, permissions, isActive } = req.body;

    const pool = getPool();
    const [existing] = await pool.query('SELECT * FROM `admin_users` WHERE id = ?;', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }
    const curr = existing[0];

    if (username && username.trim() !== curr.username) {
      const [chk] = await pool.query('SELECT id FROM `admin_users` WHERE username = ? AND id != ?;', [username.trim(), id]);
      if (chk.length > 0) {
        return res.status(400).json({ success: false, message: 'اسم المستخدم مستخدم بالفعل' });
      }
    }

    const finalName = name ? name.trim() : curr.name;
    const finalUsername = username ? username.trim() : curr.username;
    const finalPassword = password && password.trim() ? password.trim() : curr.password;
    const finalRole = role !== undefined ? role : curr.role;
    const finalPerms = permissions !== undefined ? JSON.stringify(permissions) : (typeof curr.permissions === 'object' ? JSON.stringify(curr.permissions) : curr.permissions);
    const finalActive = isActive !== undefined ? (isActive ? 1 : 0) : curr.isActive;

    await pool.query(
      'UPDATE `admin_users` SET name = ?, username = ?, password = ?, role = ?, permissions = ?, isActive = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?;',
      [finalName, finalUsername, finalPassword, finalRole, finalPerms, finalActive, id]
    );

    res.json({ success: true, message: 'تم تحديث بيانات وصلاحيات المستخدم بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin-users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const [existing] = await pool.query('SELECT * FROM `admin_users` WHERE id = ?;', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    if (existing[0].username === 'admin') {
      return res.status(400).json({ success: false, message: 'لا يمكن حذف الحساب الإداري الرئيسي (admin)' });
    }

    await pool.query('DELETE FROM `admin_users` WHERE id = ?;', [id]);
    res.json({ success: true, message: 'تم حذف المستخدم بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Serve frontend static assets in production if available
const clientDist = path.join(__dirname, '../client/dist');
const localPublic = path.join(__dirname, 'public');

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else if (fs.existsSync(localPublic)) {
  app.use(express.static(localPublic));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(localPublic, 'index.html'));
  });
}

// Initialize database and start server
async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Malaeb Node.js + MySQL Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
