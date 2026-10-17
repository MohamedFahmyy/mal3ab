/**
 * Time formatting utility supporting 12-hour (ص / م) and 24-hour modes
 */

export const getTimeFormat = () => {
  if (typeof window === 'undefined') return '12h';
  return localStorage.getItem('malaeb_time_format') || '12h';
};

export const setTimeFormat = (format) => {
  if (typeof window === 'undefined') return;
  const valid = format === '24h' ? '24h' : '12h';
  localStorage.setItem('malaeb_time_format', valid);
  window.dispatchEvent(new CustomEvent('timeFormatChanged', { detail: valid }));
};

/**
 * Format a slot string like "16:00" or "00:00" to either "04:00 م" (12h) or "16:00" (24h)
 */
export const formatSlotTime = (slotStr, format = null) => {
  if (!slotStr) return '';
  const currentFormat = format || getTimeFormat();

  if (currentFormat === '24h') {
    return slotStr;
  }

  const parts = String(slotStr).split(':');
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1] || '00';

  if (isNaN(hours)) return slotStr;

  const isPm = hours >= 12;
  const period = isPm ? 'م' : 'ص';
  hours = hours % 12;
  if (hours === 0) hours = 12;

  const paddedH = String(hours).padStart(2, '0');
  return `${paddedH}:${minutes} ${period}`;
};

/**
 * Generate range of hours between startHour and endHour
 * Handles wrap-around midnight (e.g. 16:00 to 02:00)
 */
export const generateHoursRange = (startHour, endHour) => {
  const slots = [];
  let current = parseInt(startHour, 10);
  const target = parseInt(endHour, 10);

  if (isNaN(current) || isNaN(target)) return [];

  // Loop until reaching target
  let count = 0;
  while (count < 24) {
    const formatted = String(current).padStart(2, '0') + ':00';
    slots.push(formatted);
    if (current === target) break;
    current = (current + 1) % 24;
    count++;
  }
  return slots;
};
