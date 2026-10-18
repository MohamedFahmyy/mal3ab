// API Client communicating with Express Backend API
const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

const safeFetch = async (url, options = {}) => {
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });
    const json = await res.json();
    if (Array.isArray(json)) {
      return { success: true, count: json.length, data: json };
    }
    if (json && typeof json === 'object') {
      if (!('success' in json)) {
        if (json.error || json.status === 'error') {
          return { success: false, message: json.error || json.message || 'خطأ في معالجة الطلب', ...json };
        }
        return { success: true, data: json };
      }
    }
    return json;
  } catch (err) {
    console.error('API Error at ' + url + ':', err);
    return { success: false, message: 'تعذر الاتصال بالخادم. يرجى التأكد من تشغيل السيرفر.' };
  }
};

// --- PITCHES ---
export async function fetchPitches(filters = {}) {
  const params = new URLSearchParams();
  if (filters.area && filters.area !== 'الكل') params.append('area', filters.area);
  if (filters.type && filters.type !== 'الكل') params.append('type', filters.type);
  if (filters.search) params.append('search', filters.search);
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);

  const url = `${API_BASE}/pitches?${params.toString()}`;
  return await safeFetch(url);
}

export async function fetchPitchDetails(id, date) {
  const params = date ? `?date=${date}` : '';
  return await safeFetch(`${API_BASE}/pitches/${id}${params}`);
}

export async function registerPitch(pitchData) {
  return await safeFetch(`${API_BASE}/pitches`, {
    method: 'POST',
    body: JSON.stringify(pitchData)
  });
}

export async function updatePitch(id, pitchData) {
  return await safeFetch(`${API_BASE}/pitches/${id}`, {
    method: 'PUT',
    body: JSON.stringify(pitchData)
  });
}

export async function deletePitch(id) {
  return await safeFetch(`${API_BASE}/pitches/${id}`, {
    method: 'DELETE'
  });
}

// --- BOOKINGS ---
export async function fetchBookings(filters = {}) {
  const params = new URLSearchParams();
  if (filters.phone) params.append('phone', filters.phone);
  if (filters.pitchId && filters.pitchId !== 'all') params.append('pitchId', filters.pitchId);
  if (filters.date) params.append('date', filters.date);
  if (filters.paymentStatus && filters.paymentStatus !== 'all') params.append('paymentStatus', filters.paymentStatus);
  if (filters.customerId) params.append('customerId', filters.customerId);

  return await safeFetch(`${API_BASE}/bookings?${params.toString()}`);
}

export async function fetchBookingDetails(id) {
  return await safeFetch(`${API_BASE}/bookings/${id}`);
}

export async function createBooking(bookingData) {
  return await safeFetch(`${API_BASE}/bookings`, {
    method: 'POST',
    body: JSON.stringify(bookingData)
  });
}

export async function cancelBooking(id) {
  return await safeFetch(`${API_BASE}/bookings/${id}`, {
    method: 'DELETE'
  });
}

export async function fetchUserBookings(phone) {
  return await fetchBookings({ phone });
}

// --- CUSTOMERS CRM ---
export async function fetchCustomers(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.status && filters.status !== 'all') params.append('status', filters.status);

  return await safeFetch(`${API_BASE}/customers?${params.toString()}`);
}

export async function fetchCustomerDetails(id) {
  return await safeFetch(`${API_BASE}/customers/${id}`);
}

export async function createCustomer(customerData) {
  return await safeFetch(`${API_BASE}/customers`, {
    method: 'POST',
    body: JSON.stringify(customerData)
  });
}

export async function updateCustomer(id, customerData) {
  return await safeFetch(`${API_BASE}/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(customerData)
  });
}

export async function deleteCustomer(id) {
  return await safeFetch(`${API_BASE}/customers/${id}`, {
    method: 'DELETE'
  });
}

// --- PAYMENTS & PARTIAL PAYMENTS ---
export async function fetchPayments(filters = {}) {
  const params = new URLSearchParams();
  if (filters.bookingId) params.append('bookingId', filters.bookingId);
  if (filters.customerId) params.append('customerId', filters.customerId);
  if (filters.phone) params.append('phone', filters.phone);

  return await safeFetch(`${API_BASE}/payments?${params.toString()}`);
}

export async function recordPayment(paymentData) {
  return await safeFetch(`${API_BASE}/payments`, {
    method: 'POST',
    body: JSON.stringify(paymentData)
  });
}

// --- FINANCES ---
export async function fetchFinances(period = 'all') {
  return await safeFetch(`${API_BASE}/finances?period=${period}`);
}

// --- AUTH ---
export async function loginUser(phone, role) {
  return await safeFetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ phone, role })
  });
}

// --- SETTINGS (TITLE, SLOGAN, LOGO, METADATA) ---
export async function fetchSettings() {
  return await safeFetch(`${API_BASE}/settings`);
}

export async function updateSettings(settingsData) {
  return await safeFetch(`${API_BASE}/settings`, {
    method: 'PUT',
    body: JSON.stringify(settingsData)
  });
}

// --- ADMIN AUTH & USERS MANAGEMENT ---
export async function adminLogin(username, password) {
  return await safeFetch(`${API_BASE}/auth/admin-login`, {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export async function fetchAdminUsers() {
  return await safeFetch(`${API_BASE}/admin-users`);
}

export async function createAdminUser(userData) {
  return await safeFetch(`${API_BASE}/admin-users`, {
    method: 'POST',
    body: JSON.stringify(userData)
  });
}

export async function updateAdminUser(id, userData) {
  return await safeFetch(`${API_BASE}/admin-users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData)
  });
}

export async function deleteAdminUser(id) {
  return await safeFetch(`${API_BASE}/admin-users/${id}`, {
    method: 'DELETE'
  });
}

