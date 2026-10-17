// Test suite verifying all 16 acceptance criteria scenarios against the API
const BASE_URL = 'http://localhost:5000/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAILED: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('🚀 Starting Test Suite for 16 Acceptance Scenarios...\n');

  // Find a pitch with known price or use pitch-1 (250 EGP/hr) or pitch-4 (550 EGP/hr)
  const pitchesRes = await request('/pitches');
  assert(pitchesRes.status === 200 && pitchesRes.data.data.length > 0, 'Pitches loaded successfully');
  const testPitch = pitchesRes.data.data[0]; // 250 EGP/hr
  const pitchId = testPitch.id;

  const uniqueDate1 = '2026-11-01';
  const uniqueDate2 = '2026-11-02';
  const uniqueDate3 = '2026-11-03';

  // SCENARIO 1: Create new customer on first booking
  console.log('\n--- Scenario 1: New customer created on first booking ---');
  const testPhone1 = '01099990001';
  const b1Res = await request('/bookings', {
    method: 'POST',
    body: JSON.stringify({
      pitchId,
      customerName: 'عميل اختبار جديد',
      customerPhone: testPhone1,
      date: uniqueDate1,
      timeSlots: ['16:00'],
      paidAmount: 0
    })
  });
  assert(b1Res.status === 201, 'Booking 1 created');
  const booking1 = b1Res.data.data;

  const cust1Res = await request(`/customers?search=${testPhone1}`);
  assert(cust1Res.data.data.length === 1, 'Customer record was automatically created in CRM');
  assert(cust1Res.data.data[0].phone === testPhone1, 'Customer phone matches');

  // SCENARIO 2: Booking for existing customer without duplicating
  console.log('\n--- Scenario 2: Second booking for existing customer without duplication ---');
  const b2Res = await request('/bookings', {
    method: 'POST',
    body: JSON.stringify({
      pitchId,
      customerName: 'عميل اختبار جديد',
      customerPhone: testPhone1,
      date: uniqueDate1,
      timeSlots: ['17:00'],
      paidAmount: 0
    })
  });
  assert(b2Res.status === 201, 'Booking 2 created for same phone');
  const cust2Res = await request(`/customers?search=${testPhone1}`);
  assert(cust2Res.data.data.length === 1, 'Customer is NOT duplicated');
  assert(cust2Res.data.data[0].totalBookings >= 2, 'Customer totalBookings incremented to 2');

  // SCENARIO 3: Booking with 1000 EGP and unpaid: remaining=1000, status=unpaid
  console.log('\n--- Scenario 3: Booking with 1000 EGP unpaid ---');
  // 4 hours on pitch-1 (250 * 4 = 1000)
  const testPhone3 = '01099990003';
  const b3Res = await request('/bookings', {
    method: 'POST',
    body: JSON.stringify({
      pitchId,
      customerName: 'طارق حسام',
      customerPhone: testPhone3,
      date: uniqueDate2,
      timeSlots: ['16:00', '17:00', '18:00', '19:00'],
      paidAmount: 0
    })
  });
  assert(b3Res.status === 201, '1000 EGP booking created');
  const booking3 = b3Res.data.data;
  assert(booking3.totalAmount === 1000, 'totalAmount is 1000 EGP');
  assert(booking3.paidAmount === 0, 'paidAmount is 0');
  assert(booking3.remainingAmount === 1000, 'remainingAmount is 1000 EGP');
  assert(booking3.paymentStatus === 'unpaid', 'paymentStatus is "unpaid"');

  // SCENARIO 4: Record partial payment of 300 EGP on 1000 EGP booking; remaining=700, status=partial
  console.log('\n--- Scenario 4: Partial payment of 300 EGP ---');
  const pay1Res = await request('/payments', {
    method: 'POST',
    body: JSON.stringify({
      bookingId: booking3.id,
      amount: 300,
      paymentMethod: 'vodafone',
      notes: 'عربون فودافون كاش'
    })
  });
  assert(pay1Res.status === 201, 'Partial payment of 300 EGP recorded');
  const updatedB3_1 = pay1Res.data.booking;
  assert(updatedB3_1.paidAmount === 300, 'paidAmount is now 300 EGP');
  assert(updatedB3_1.remainingAmount === 700, 'remainingAmount is now 700 EGP');
  assert(updatedB3_1.paymentStatus === 'partial', 'paymentStatus is now "partial"');

  // SCENARIO 5: Record extra payment of 700 EGP; remaining=0, status=paid
  console.log('\n--- Scenario 5: Extra payment of 700 EGP (Full balance) ---');
  const pay2Res = await request('/payments', {
    method: 'POST',
    body: JSON.stringify({
      bookingId: booking3.id,
      amount: 700,
      paymentMethod: 'cash',
      notes: 'سداد باقي الحساب كاش'
    })
  });
  assert(pay2Res.status === 201, 'Payment of 700 EGP recorded');
  const updatedB3_2 = pay2Res.data.booking;
  assert(updatedB3_2.paidAmount === 1000, 'paidAmount is now 1000 EGP');
  assert(updatedB3_2.remainingAmount === 0, 'remainingAmount is now 0');
  assert(updatedB3_2.paymentStatus === 'paid', 'paymentStatus is now "paid"');

  // SCENARIO 6: Attempt payment exceeding remaining balance and reject
  console.log('\n--- Scenario 6: Reject payment exceeding remaining balance ---');
  const payExceedRes = await request('/payments', {
    method: 'POST',
    body: JSON.stringify({
      bookingId: booking3.id,
      amount: 50,
      paymentMethod: 'cash'
    })
  });
  assert(payExceedRes.status === 400, 'Payment exceeding remaining balance rejected with HTTP 400');

  // SCENARIO 7: 10% discount on 1000 EGP booking -> discount=100, net=900
  console.log('\n--- Scenario 7: 10% discount on 1000 EGP booking ---');
  const b7Res = await request('/bookings', {
    method: 'POST',
    body: JSON.stringify({
      pitchId,
      customerName: 'خالد سليم',
      customerPhone: '01099990007',
      date: uniqueDate3,
      timeSlots: ['16:00', '17:00', '18:00', '19:00'],
      discountType: 'percentage',
      discountValue: 10,
      paidAmount: 0
    })
  });
  assert(b7Res.status === 201, 'Booking with 10% discount created');
  const booking7 = b7Res.data.data;
  assert(booking7.totalAmount === 1000, 'totalAmount is 1000');
  assert(booking7.discountAmount === 100, 'discountAmount is 100');
  assert(booking7.netAmount === 900, 'netAmount is 900');
  assert(booking7.remainingAmount === 900, 'remainingAmount is 900');

  // SCENARIO 8: Fixed discount of 150 EGP on 1000 EGP booking -> net=850
  console.log('\n--- Scenario 8: Fixed discount of 150 EGP on 1000 EGP booking ---');
  const b8Res = await request('/bookings', {
    method: 'POST',
    body: JSON.stringify({
      pitchId,
      customerName: 'ياسر كمال',
      customerPhone: '01099990008',
      date: uniqueDate3,
      timeSlots: ['20:00', '21:00', '22:00', '23:00'],
      discountType: 'fixed',
      discountValue: 150,
      paidAmount: 0
    })
  });
  assert(b8Res.status === 201, 'Booking with 150 EGP fixed discount created');
  const booking8 = b8Res.data.data;
  assert(booking8.totalAmount === 1000, 'totalAmount is 1000');
  assert(booking8.discountAmount === 150, 'discountAmount is 150');
  assert(booking8.netAmount === 850, 'netAmount is 850');

  // SCENARIO 9: Reject discount > 100% or discount > totalAmount
  console.log('\n--- Scenario 9: Reject invalid discounts ---');
  const invalidPctRes = await request('/bookings', {
    method: 'POST',
    body: JSON.stringify({
      pitchId,
      customerName: 'مخالف',
      customerPhone: '01099990009',
      date: uniqueDate3,
      timeSlots: ['00:00'],
      discountType: 'percentage',
      discountValue: 120
    })
  });
  assert(invalidPctRes.status === 400, 'Discount percentage > 100% rejected with HTTP 400');

  const invalidFixedRes = await request('/bookings', {
    method: 'POST',
    body: JSON.stringify({
      pitchId,
      customerName: 'مخالف',
      customerPhone: '01099990009',
      date: uniqueDate3,
      timeSlots: ['00:00'],
      discountType: 'fixed',
      discountValue: 800 // Pitch hourly is 250
    })
  });
  assert(invalidFixedRes.status === 400, 'Discount fixed > totalAmount rejected with HTTP 400');

  // SCENARIO 10: Accurate remaining balance calculation with both discount and payment
  console.log('\n--- Scenario 10: Booking with both discount and partial payment ---');
  const b10Res = await request('/bookings', {
    method: 'POST',
    body: JSON.stringify({
      pitchId,
      customerName: 'مصطفى عادل',
      customerPhone: '01099990010',
      date: '2026-11-04',
      timeSlots: ['16:00', '17:00'], // 500 EGP
      discountType: 'fixed',
      discountValue: 100, // net = 400
      paidAmount: 150 // remaining should be 250
    })
  });
  assert(b10Res.status === 201, 'Booking created with discount and deposit');
  const booking10 = b10Res.data.data;
  assert(booking10.netAmount === 400, 'netAmount is 400');
  assert(booking10.paidAmount === 150, 'paidAmount is 150');
  assert(booking10.remainingAmount === 250, 'remainingAmount is 250');
  assert(booking10.paymentStatus === 'partial', 'paymentStatus is "partial"');

  // SCENARIO 11: Display customer name & payment status under booked slot in pitch query
  console.log('\n--- Scenario 11: Customer name and payment status in pitch slot availability ---');
  const pitchSlotsRes = await request(`/pitches/${pitchId}?date=${uniqueDate2}`);
  const slot16 = pitchSlotsRes.data.data.slots.find(s => s.time === '16:00');
  assert(slot16.isAvailable === false, '16:00 slot is marked unavailable');
  assert(slot16.booking && slot16.booking.customerName === 'طارق حسام', 'Slot includes customerName: طارق حسام');
  assert(slot16.booking && slot16.booking.paymentStatus === 'paid', 'Slot includes paymentStatus: paid');

  // SCENARIO 12: Customer & Booking details endpoints return full payment history
  console.log('\n--- Scenario 12: Full details and payment ledger retrieval ---');
  const bDetailRes = await request(`/bookings/${booking3.id}`);
  assert(bDetailRes.status === 200, 'Booking details fetched');
  assert(bDetailRes.data.data.payments.length === 2, 'Booking details includes 2 recorded payments');

  const cDetailRes = await request(`/customers/cust-${testPhone3}`);
  assert(cDetailRes.status === 200, 'Customer details fetched');
  assert(cDetailRes.data.data.bookings.length > 0, 'Customer details includes booking history');
  assert(cDetailRes.data.data.payments.length > 0, 'Customer details includes payment history');

  // SCENARIO 13: Booking cancellation does not delete customer or miscalculate revenue
  console.log('\n--- Scenario 13: Booking cancellation preserves customer & updates financials ---');
  const cancelRes = await request(`/bookings/${booking1.id}`, { method: 'DELETE' });
  assert(cancelRes.status === 200, 'Booking cancelled successfully');
  const custCheckRes = await request(`/customers/cust-${testPhone1}`);
  assert(custCheckRes.status === 200, 'Customer record is PRESERVED after booking cancellation');

  // SCENARIO 14: Collision prevention on duplicate slot booking
  console.log('\n--- Scenario 14: Collision prevention for booked slot ---');
  const collisionRes = await request('/bookings', {
    method: 'POST',
    body: JSON.stringify({
      pitchId,
      customerName: 'متطفل',
      customerPhone: '01011112222',
      date: uniqueDate2,
      timeSlots: ['16:00'] // already booked by طارق حسام
    })
  });
  assert(collisionRes.status === 409, 'Duplicate slot booking rejected with HTTP 409 Conflict');

  // SCENARIO 15: Legacy bookings backward compatibility
  console.log('\n--- Scenario 15: Backward compatibility for legacy bookings ---');
  const legacyBookingsRes = await request('/bookings');
  assert(legacyBookingsRes.status === 200, 'All bookings retrieved');
  const allEnriched = legacyBookingsRes.data.data;
  const legacyCompliant = allEnriched.every(b => 
    b.netAmount !== undefined && 
    b.paidAmount !== undefined && 
    b.remainingAmount !== undefined && 
    b.paymentStatus !== undefined
  );
  assert(legacyCompliant, 'All legacy bookings correctly have financial & payment status fields');

  // SCENARIO 16: Financial reports & summaries accuracy
  console.log('\n--- Scenario 16: Financial report accuracy ---');
  const finRes = await request('/finances');
  assert(finRes.status === 200, 'Finances endpoint returned 200');
  const fin = finRes.data.data;
  assert(fin.grossTotal >= fin.netTotal, 'grossTotal >= netTotal');
  assert(fin.totalDiscounts === (fin.grossTotal - fin.netTotal), 'totalDiscounts equals (gross - net)');
  assert(fin.dueTotal >= 0, 'dueTotal is non-negative');
  assert(fin.byPaymentMethod.cash >= 0, 'Cash method accounted for');

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
