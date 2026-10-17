import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const PITCHES_FILE = path.join(DATA_DIR, 'pitches.json');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json');
const PAYMENTS_FILE = path.join(DATA_DIR, 'payments.json');

// --- Helper Functions for File Persistence ---
const readJsonFile = (filePath, defaultVal = []) => {
  try {
    if (!fs.existsSync(filePath)) return defaultVal;
    const content = fs.readFileSync(filePath, 'utf8');
    return content ? JSON.parse(content) : defaultVal;
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultVal;
  }
};

const writeJsonFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
};

const getPitches = () => readJsonFile(PITCHES_FILE, []);
const savePitches = (data) => writeJsonFile(PITCHES_FILE, data);

const getBookings = () => readJsonFile(BOOKINGS_FILE, []);
const saveBookings = (data) => writeJsonFile(BOOKINGS_FILE, data);

const getCustomers = () => readJsonFile(CUSTOMERS_FILE, []);
const saveCustomers = (data) => writeJsonFile(CUSTOMERS_FILE, data);

const getPayments = () => readJsonFile(PAYMENTS_FILE, []);
const savePayments = (data) => writeJsonFile(PAYMENTS_FILE, data);

// Normalizes phone numbers (e.g. +201011223344 -> 01011223344)
export const normalizePhone = (phone) => {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[^\d]/g, '');
  if (cleaned.startsWith('20') && cleaned.length === 12) {
    cleaned = '0' + cleaned.slice(2);
  }
  return cleaned.trim();
};

// Recalculates booking finances based on discounts and payment history
export const enrichBooking = (b, allPayments = null) => {
  const payments = allPayments !== null ? allPayments : getPayments();
  const totalAmount = Number(b.totalAmount || b.totalPrice || 0);
  const discountType = b.discountType || 'none';
  const discountValue = Math.max(0, Number(b.discountValue || 0));
  
  let discountAmount = 0;
  if (discountType === 'percentage') {
    const clampedPct = Math.min(100, discountValue);
    discountAmount = Math.round((totalAmount * clampedPct) / 100);
  } else if (discountType === 'fixed') {
    discountAmount = Math.min(totalAmount, discountValue);
  } else if (b.discountAmount !== undefined) {
    discountAmount = Number(b.discountAmount);
  }

  const netAmount = Math.max(0, totalAmount - discountAmount);

  // Compute paid amount from payments ledger
  const bookingPayments = payments.filter(p => p.bookingId === b.id && p.status !== 'reversed');
  let paidAmount = 0;
  if (bookingPayments.length > 0) {
    paidAmount = bookingPayments.reduce((sum, p) => {
      const amt = Number(p.amount || 0);
      return sum + (p.type === 'refund' ? -amt : amt);
    }, 0);
  } else if (b.paidAmount !== undefined) {
    paidAmount = Number(b.paidAmount);
  } else {
    paidAmount = b.paymentStatus === 'unpaid' ? 0 : netAmount;
  }
  paidAmount = Math.max(0, paidAmount);
  const remainingAmount = Math.max(0, netAmount - paidAmount);

  let paymentStatus = 'unpaid';
  if (netAmount === 0 && paidAmount === 0) {
    paymentStatus = 'paid';
  } else if (paidAmount >= netAmount && netAmount > 0) {
    paymentStatus = 'paid';
  } else if (paidAmount > 0 && paidAmount < netAmount) {
    paymentStatus = 'partial';
  } else {
    paymentStatus = 'unpaid';
  }

  return {
    ...b,
    totalAmount,
    discountType,
    discountValue,
    discountAmount,
    netAmount,
    paidAmount,
    remainingAmount,
    paymentStatus,
    customerName: b.customerName || 'عميل غير مسجل',
    customerPhone: b.customerPhone || ''
  };
};

// Find or create customer
const findOrCreateCustomer = (name, phone) => {
  const normPhone = normalizePhone(phone);
  if (!normPhone) return null;

  const customers = getCustomers();
  let customer = customers.find(c => normalizePhone(c.phone) === normPhone);

  if (!customer) {
    customer = {
      id: 'cust-' + normPhone,
      name: name && name.trim() ? name.trim() : 'عميل ' + normPhone.slice(-4),
      phone: normPhone,
      notes: 'تم التسجيل تلقائياً مع أول حجز',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    customers.push(customer);
    saveCustomers(customers);
  } else if (name && name.trim() && (customer.name.startsWith('عميل ') || customer.name === 'حجز إداري')) {
    customer.name = name.trim();
    customer.updatedAt = new Date().toISOString();
    saveCustomers(customers);
  }

  return customer;
};

// Compute customer metrics from bookings and payments
const getCustomerMetrics = (customer, allBookings, allPayments) => {
  const normPhone = normalizePhone(customer.phone);
  const customerBookings = allBookings.filter(b => {
    return (b.customerId && b.customerId === customer.id) || 
           (b.customerPhone && normalizePhone(b.customerPhone) === normPhone);
  });

  const validBookings = customerBookings.filter(b => b.status !== 'cancelled' && b.status !== 'ملغي');
  const enrichedBookings = validBookings.map(b => enrichBooking(b, allPayments));

  const totalBookings = enrichedBookings.length;
  const totalGross = enrichedBookings.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalDiscount = enrichedBookings.reduce((sum, b) => sum + b.discountAmount, 0);
  const totalNet = enrichedBookings.reduce((sum, b) => sum + b.netAmount, 0);
  const totalPaid = enrichedBookings.reduce((sum, b) => sum + b.paidAmount, 0);
  const remainingBalance = Math.max(0, totalNet - totalPaid);

  const dates = validBookings.map(b => b.date).filter(Boolean).sort().reverse();
  const lastBooking = dates.length > 0 ? dates[0] : null;

  return {
    ...customer,
    totalBookings,
    totalGross,
    totalDiscount,
    totalNet,
    totalPaid,
    remainingBalance,
    lastBooking
  };
};

// ======================== API ROUTES ========================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Malaeb Full API', timestamp: new Date().toISOString() });
});

// --- PITCHES ---
app.get('/api/pitches', (req, res) => {
  const { area, type, search, maxPrice, sortBy } = req.query;
  let pitches = getPitches();

  if (area && area !== 'الكل' && area !== 'all') {
    pitches = pitches.filter(p => p.area === area || p.city === area);
  }

  if (type && type !== 'الكل' && type !== 'all') {
    pitches = pitches.filter(p => p.type === type);
  }

  if (search) {
    const q = search.trim().toLowerCase();
    pitches = pitches.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.nameAr && p.nameAr.toLowerCase().includes(q)) ||
      (p.area && p.area.toLowerCase().includes(q)) ||
      (p.city && p.city.toLowerCase().includes(q))
    );
  }

  if (maxPrice) {
    pitches = pitches.filter(p => p.pricePerHour <= Number(maxPrice));
  }

  if (sortBy === 'price-asc') {
    pitches.sort((a, b) => a.pricePerHour - b.pricePerHour);
  } else if (sortBy === 'price-desc') {
    pitches.sort((a, b) => b.pricePerHour - a.pricePerHour);
  } else if (sortBy === 'rating') {
    pitches.sort((a, b) => b.rating - a.rating);
  }

  res.json({ success: true, count: pitches.length, data: pitches });
});

app.get('/api/pitches/:id', (req, res) => {
  const { id } = req.params;
  const { date } = req.query;
  const pitches = getPitches();
  const pitch = pitches.find(p => p.id === id);

  if (!pitch) {
    return res.status(404).json({ success: false, message: 'الملعب غير موجود' });
  }

  const bookings = getBookings();
  const targetDate = date || new Date().toISOString().split('T')[0];
  const dayBookings = bookings.filter(b => b.pitchId === id && b.date === targetDate && b.status !== 'cancelled' && b.status !== 'ملغي');
  const bookedTimeSlots = dayBookings.flatMap(b => b.timeSlots || []);

  const defaultSlots = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00'];
  const availableSlotsList = pitch.availableSlots && pitch.availableSlots.length > 0 ? pitch.availableSlots : defaultSlots;

  const slotsStatus = availableSlotsList.map(time => {
    const activeBooking = dayBookings.find(b => b.timeSlots && b.timeSlots.includes(time));
    return {
      time,
      isAvailable: !activeBooking,
      booking: activeBooking ? {
        id: activeBooking.id,
        customerName: activeBooking.customerName || 'عميل غير مسجل',
        paymentStatus: activeBooking.paymentStatus || 'unpaid',
        discountAmount: activeBooking.discountAmount || 0
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
});

app.post('/api/pitches', (req, res) => {
  const { name, nameAr, area, city, type, pricePerHour, address, surface, ownerPhone, image, facilities } = req.body;

  if (!name || !area || !type || !pricePerHour || !ownerPhone) {
    return res.status(400).json({ success: false, message: 'يرجى إكمال البيانات الأساسية للملعب' });
  }

  const pitches = getPitches();
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

  pitches.unshift(newPitch);
  savePitches(pitches);

  res.status(201).json({ success: true, message: 'تم إضافة الملعب بنجاح! 🎉', data: newPitch });
});

// --- BOOKINGS ---
app.get('/api/bookings', (req, res) => {
  const { phone, customerId, pitchId, date, paymentStatus } = req.query;
  const bookings = getBookings();
  const payments = getPayments();

  let enriched = bookings.map(b => enrichBooking(b, payments));

  if (phone) {
    const norm = normalizePhone(phone);
    enriched = enriched.filter(b => normalizePhone(b.customerPhone) === norm);
  }

  if (customerId) {
    enriched = enriched.filter(b => b.customerId === customerId);
  }

  if (pitchId && pitchId !== 'all') {
    enriched = enriched.filter(b => b.pitchId === pitchId);
  }

  if (date) {
    enriched = enriched.filter(b => b.date === date);
  }

  if (paymentStatus && paymentStatus !== 'all') {
    enriched = enriched.filter(b => b.paymentStatus === paymentStatus);
  }

  res.json({ success: true, count: enriched.length, data: enriched });
});

app.get('/api/bookings/:id', (req, res) => {
  const { id } = req.params;
  const bookings = getBookings();
  const payments = getPayments();
  const booking = bookings.find(b => b.id === id);

  if (!booking) {
    return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
  }

  const enriched = enrichBooking(booking, payments);
  const bookingPayments = payments.filter(p => p.bookingId === id);

  res.json({
    success: true,
    data: {
      ...enriched,
      payments: bookingPayments
    }
  });
});

app.post('/api/bookings', (req, res) => {
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

  const pitches = getPitches();
  const pitch = pitches.find(p => p.id === pitchId);
  if (!pitch) {
    return res.status(404).json({ success: false, message: 'الملعب المحدد غير موجود' });
  }

  // Prevent time collisions with active bookings
  const bookings = getBookings();
  const collision = bookings.find(b =>
    b.pitchId === pitchId &&
    b.date === date &&
    b.status !== 'cancelled' &&
    b.status !== 'ملغي' &&
    b.timeSlots.some(t => timeSlots.includes(t))
  );

  if (collision) {
    return res.status(409).json({ success: false, message: 'عذراً، هذا الموعد تم حجزه بالفعل! يرجى اختيار ميعاد آخر.' });
  }

  // Calculate gross total safely on backend
  const hours = timeSlots.length;
  const pricePerHour = Number(pitch.pricePerHour);
  const totalAmount = pricePerHour * hours;

  // Validate and compute discount
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

  // Validate initial payment
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

  // Link or create Customer
  const customer = findOrCreateCustomer(customerName, customerPhone);
  const customerId = customer ? customer.id : ('cust-' + normalizePhone(customerPhone));

  const bookingRef = 'MLB-' + Math.floor(100000 + Math.random() * 900000);
  const createdAt = new Date().toISOString();

  const newBooking = {
    id: bookingRef,
    pitchId,
    pitchName: pitch.nameAr || pitch.name,
    pitchArea: pitch.area,
    customerId,
    customerName: customerName.trim(),
    customerPhone: normalizePhone(customerPhone),
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
    notes: notes || '',
    status: 'confirmed',
    createdAt
  };

  bookings.unshift(newBooking);
  saveBookings(bookings);

  // If an initial payment is registered, record it in payments ledger
  if (initialPaid > 0) {
    const payments = getPayments();
    const paymentRef = 'PAY-' + bookingRef.replace('MLB-', '') + '-1';
    const paymentRecord = {
      id: paymentRef,
      bookingId: bookingRef,
      customerId,
      customerName: customerName.trim(),
      customerPhone: normalizePhone(customerPhone),
      amount: initialPaid,
      paymentMethod: paymentMethod || 'cash',
      type: 'payment',
      notes: 'دفعة أولى مسجلة مع إنشاء الحجز',
      createdBy: 'إدارة المنصة',
      createdAt
    };
    payments.unshift(paymentRecord);
    savePayments(payments);
  }

  res.status(201).json({
    success: true,
    message: 'تم تأكيد الحجز بنجاح! ⚽🎉',
    data: newBooking
  });
});

app.delete('/api/bookings/:id', (req, res) => {
  const { id } = req.params;
  const bookings = getBookings();
  const idx = bookings.findIndex(b => b.id === id);

  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
  }

  bookings[idx].status = 'cancelled';
  saveBookings(bookings);
  
  res.json({ 
    success: true, 
    message: 'تم إلغاء الحجز بنجاح مع الحفاظ على سجل العميل والمدفوعات', 
    data: bookings[idx] 
  });
});

// --- CUSTOMERS CRM ---
app.get('/api/customers', (req, res) => {
  const { search, sortBy, status } = req.query;
  const customers = getCustomers();
  const bookings = getBookings();
  const payments = getPayments();

  let metricsList = customers.map(c => getCustomerMetrics(c, bookings, payments));

  if (status && status !== 'all') {
    metricsList = metricsList.filter(c => c.status === status);
  }

  if (search) {
    const q = search.trim().toLowerCase();
    metricsList = metricsList.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.phone.includes(q)
    );
  }

  if (sortBy === 'name') {
    metricsList.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  } else if (sortBy === 'bookings') {
    metricsList.sort((a, b) => b.totalBookings - a.totalBookings);
  } else if (sortBy === 'balance') {
    metricsList.sort((a, b) => b.remainingBalance - a.remainingBalance);
  } else if (sortBy === 'paid') {
    metricsList.sort((a, b) => b.totalPaid - a.totalPaid);
  } else {
    // Default: newest registration first
    metricsList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  res.json({ success: true, count: metricsList.length, data: metricsList });
});

app.get('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  const customers = getCustomers();
  const bookings = getBookings();
  const payments = getPayments();

  const customer = customers.find(c => c.id === id || normalizePhone(c.phone) === normalizePhone(id));
  if (!customer) {
    return res.status(404).json({ success: false, message: 'العميل غير موجود' });
  }

  const metrics = getCustomerMetrics(customer, bookings, payments);
  const normPhone = normalizePhone(customer.phone);

  const customerBookings = bookings
    .filter(b => b.customerId === customer.id || normalizePhone(b.customerPhone) === normPhone)
    .map(b => enrichBooking(b, payments));

  const customerPayments = payments.filter(p => 
    p.customerId === customer.id || 
    normalizePhone(p.customerPhone) === normPhone ||
    customerBookings.some(cb => cb.id === p.bookingId)
  );

  res.json({
    success: true,
    data: {
      ...metrics,
      bookings: customerBookings,
      payments: customerPayments
    }
  });
});

app.post('/api/customers', (req, res) => {
  const { name, phone, notes, status } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'الاسم ورقم الهاتف مطلوبان' });
  }

  const normPhone = normalizePhone(phone);
  if (normPhone.length < 10) {
    return res.status(400).json({ success: false, message: 'يرجى إدخال رقم هاتف صحيح يتكون من 11 رقم' });
  }

  const customers = getCustomers();
  if (customers.some(c => normalizePhone(c.phone) === normPhone)) {
    return res.status(409).json({ success: false, message: 'يوجد عميل مسجل بالفعل برقم الهاتف هذا' });
  }

  const newCustomer = {
    id: 'cust-' + normPhone,
    name: name.trim(),
    phone: normPhone,
    notes: notes || '',
    status: status || 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  customers.unshift(newCustomer);
  saveCustomers(customers);

  res.status(201).json({ success: true, message: 'تم إضافة العميل بنجاح', data: newCustomer });
});

app.put('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  const { name, phone, notes, status } = req.body;

  const customers = getCustomers();
  const idx = customers.findIndex(c => c.id === id);

  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'العميل غير موجود' });
  }

  const oldPhone = customers[idx].phone;
  let newNormPhone = oldPhone;

  if (phone) {
    newNormPhone = normalizePhone(phone);
    if (newNormPhone !== oldPhone && customers.some(c => c.id !== id && normalizePhone(c.phone) === newNormPhone)) {
      return res.status(409).json({ success: false, message: 'رقم الهاتف الجديد مستخدم بالفعل لعميل آخر' });
    }
  }

  customers[idx] = {
    ...customers[idx],
    name: name ? name.trim() : customers[idx].name,
    phone: newNormPhone,
    notes: notes !== undefined ? notes : customers[idx].notes,
    status: status || customers[idx].status,
    updatedAt: new Date().toISOString()
  };

  saveCustomers(customers);

  // If phone or name changed, update linked bookings and payments for consistency
  if (newNormPhone !== oldPhone || (name && name.trim() !== customers[idx].name)) {
    const bookings = getBookings();
    let updatedBookings = false;
    bookings.forEach(b => {
      if (b.customerId === id || normalizePhone(b.customerPhone) === oldPhone) {
        b.customerId = id;
        b.customerPhone = newNormPhone;
        if (name) b.customerName = name.trim();
        updatedBookings = true;
      }
    });
    if (updatedBookings) saveBookings(bookings);

    const payments = getPayments();
    let updatedPayments = false;
    payments.forEach(p => {
      if (p.customerId === id || normalizePhone(p.customerPhone) === oldPhone) {
        p.customerId = id;
        p.customerPhone = newNormPhone;
        if (name) p.customerName = name.trim();
        updatedPayments = true;
      }
    });
    if (updatedPayments) savePayments(payments);
  }

  res.json({ success: true, message: 'تم تحديث بيانات العميل بنجاح', data: customers[idx] });
});

app.delete('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  const customers = getCustomers();
  const idx = customers.findIndex(c => c.id === id);

  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'العميل غير موجود' });
  }

  const customer = customers[idx];
  const bookings = getBookings();
  const payments = getPayments();
  const normPhone = normalizePhone(customer.phone);

  const customerBookings = bookings.filter(b => 
    (b.customerId === id || normalizePhone(b.customerPhone) === normPhone) && 
    b.status !== 'cancelled' && 
    b.status !== 'ملغي'
  );

  const customerPayments = payments.filter(p => 
    p.customerId === id || 
    normalizePhone(p.customerPhone) === normPhone
  );

  if (customerBookings.length > 0 || customerPayments.length > 0) {
    return res.status(400).json({
      success: false,
      message: `لا يمكن حذف العميل (${customer.name}) لوجود ${customerBookings.length} حجز نشط و ${customerPayments.length} حركة دفع مسجلة. يمكنك إلغاء تفعيل العميل بدلاً من ذلك.`
    });
  }

  customers.splice(idx, 1);
  saveCustomers(customers);

  res.json({ success: true, message: 'تم حذف العميل بنجاح' });
});

// --- PAYMENTS & PARTIAL PAYMENTS ---
app.get('/api/payments', (req, res) => {
  const { bookingId, customerId, phone } = req.query;
  let payments = getPayments();

  if (bookingId) {
    payments = payments.filter(p => p.bookingId === bookingId);
  }

  if (customerId) {
    payments = payments.filter(p => p.customerId === customerId);
  }

  if (phone) {
    const norm = normalizePhone(phone);
    payments = payments.filter(p => normalizePhone(p.customerPhone) === norm);
  }

  res.json({ success: true, count: payments.length, data: payments });
});

app.post('/api/payments', (req, res) => {
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

  const bookings = getBookings();
  const bookingIdx = bookings.findIndex(b => b.id === bookingId);

  if (bookingIdx === -1) {
    return res.status(404).json({ success: false, message: 'الحجز المرتبط غير موجود' });
  }

  const booking = bookings[bookingIdx];
  if (booking.status === 'cancelled' || booking.status === 'ملغي') {
    return res.status(400).json({ success: false, message: 'لا يمكن تسجيل دفعة لحجز ملغي' });
  }

  const payments = getPayments();
  const enriched = enrichBooking(booking, payments);
  const paymentAmount = Number(amount);

  if (type === 'payment') {
    if (paymentAmount > enriched.remainingAmount) {
      return res.status(400).json({
        success: false,
        message: `المبلغ المطلوب (${paymentAmount} ج.م) أكبر من الرصيد المتبقي على الحجز (${enriched.remainingAmount} ج.م)`
      });
    }
  } else if (type === 'refund') {
    if (paymentAmount > enriched.paidAmount) {
      return res.status(400).json({
        success: false,
        message: `مبلغ الاسترداد (${paymentAmount} ج.م) لا يمكن أن يتجاوز إجمالي ما دفعه العميل بالفعل (${enriched.paidAmount} ج.م)`
      });
    }
  }

  const paymentRef = 'PAY-' + Math.floor(100000 + Math.random() * 900000);
  const createdAt = new Date().toISOString();

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
    createdAt
  };

  payments.unshift(newPayment);
  savePayments(payments);

  // Recalculate booking with newly added payment
  const updatedEnriched = enrichBooking(booking, payments);
  bookings[bookingIdx] = {
    ...booking,
    paidAmount: updatedEnriched.paidAmount,
    remainingAmount: updatedEnriched.remainingAmount,
    paymentStatus: updatedEnriched.paymentStatus
  };
  saveBookings(bookings);

  res.status(201).json({
    success: true,
    message: type === 'refund' ? 'تم تسجيل حركة الاسترداد بنجاح' : 'تم تسجيل الدفعة بنجاح! 💵',
    data: newPayment,
    booking: bookings[bookingIdx]
  });
});

// --- FINANCES SUMMARY ---
app.get('/api/finances', (req, res) => {
  const { period = 'all' } = req.query;
  const bookings = getBookings();
  const payments = getPayments();

  // Filter out cancelled bookings from financial totals
  const validBookings = bookings.filter(b => b.status !== 'cancelled' && b.status !== 'ملغي');
  const enrichedBookings = validBookings.map(b => enrichBooking(b, payments));

  const grossTotal = enrichedBookings.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalDiscounts = enrichedBookings.reduce((sum, b) => sum + b.discountAmount, 0);
  const netTotal = enrichedBookings.reduce((sum, b) => sum + b.netAmount, 0);

  // Collected revenue is strictly calculated from actual payments ledger
  const validPayments = payments.filter(p => p.status !== 'reversed');
  const collectedTotal = validPayments.reduce((sum, p) => {
    const amt = Number(p.amount || 0);
    return sum + (p.type === 'refund' ? -amt : amt);
  }, 0);

  const dueTotal = Math.max(0, netTotal - collectedTotal);

  // Payment methods breakdown
  const byPaymentMethod = { cash: 0, vodafone: 0, card: 0 };
  validPayments.forEach(p => {
    const amt = Number(p.amount || 0) * (p.type === 'refund' ? -1 : 1);
    if (p.paymentMethod === 'vodafone') byPaymentMethod.vodafone += amt;
    else if (p.paymentMethod === 'card') byPaymentMethod.card += amt;
    else byPaymentMethod.cash += amt;
  });

  // Payment status breakdown
  const statusCounts = { paid: 0, partial: 0, unpaid: 0 };
  enrichedBookings.forEach(b => {
    if (statusCounts[b.paymentStatus] !== undefined) {
      statusCounts[b.paymentStatus]++;
    }
  });

  res.json({
    success: true,
    data: {
      bookingsCount: validBookings.length,
      grossTotal,
      totalDiscounts,
      netTotal,
      collectedTotal,
      dueTotal,
      byPaymentMethod,
      statusCounts
    }
  });
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

app.listen(PORT, () => {
  console.log('🚀 Malaeb Full Express API running on port ' + PORT);
});
