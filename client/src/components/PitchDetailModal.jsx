import React, { useState, useEffect } from 'react';
import { X, MapPin, Star, Clock, Calendar, CheckCircle2, Shield, PhoneCall } from 'lucide-react';
import { fetchPitchDetails } from '../utils/api';
import { formatSlotTime, getTimeFormat, setTimeFormat } from '../utils/timeFormat';

export default function PitchDetailModal({ pitch, onClose, onProceedToBooking }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [slotsStatus, setSlotsStatus] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeFormat, setTimeFormatState] = useState(getTimeFormat());

  useEffect(() => {
    const handleFormatChange = (e) => setTimeFormatState(e.detail);
    window.addEventListener('timeFormatChanged', handleFormatChange);
    return () => window.removeEventListener('timeFormatChanged', handleFormatChange);
  }, []);

  useEffect(() => {
    if (!pitch) return;
    loadSlots(pitch.id, selectedDate);
  }, [pitch, selectedDate]);

  const loadSlots = async (pitchId, dateStr) => {
    setLoading(true);
    const res = await fetchPitchDetails(pitchId, dateStr);
    if (res.success && res.data) {
      setSlotsStatus(res.data.slots || []);
    }
    setLoading(false);
  };

  const toggleSlot = (time, isAvailable) => {
    if (!isAvailable) return;
    if (selectedSlots.includes(time)) {
      setSelectedSlots(selectedSlots.filter(t => t !== time));
    } else {
      setSelectedSlots([...selectedSlots, time].sort());
    }
  };

  if (!pitch) return null;

  const totalHours = selectedSlots.length;
  const totalPrice = totalHours * pitch.pricePerHour;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ width: 'min(680px, 100%)', padding: 0, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
        {/* Header Image Cover */}
        <div style={{ position: 'relative', height: '220px', background: '#092014' }}>
          <img
            src={pitch.image}
            alt={pitch.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <button
            className="close-btn"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              background: 'rgba(0,0,0,0.6)',
              color: '#ffffff'
            }}
          >
            <X size={20} />
          </button>
          <div style={{
            position: 'absolute',
            bottom: '16px',
            right: '20px',
            color: '#ffffff',
            textShadow: '0 2px 10px rgba(0,0,0,0.8)'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: '900', margin: 0 }}>{pitch.nameAr || pitch.name}</h2>
            <div style={{ fontSize: '14px', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={16} color="var(--accent-lime)" />
              <span>{pitch.address || pitch.area}</span>
            </div>
          </div>
        </div>

        {/* Modal Main Body */}
        <div style={{ padding: '24px' }}>
          {/* Quick Meta Stats Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            background: '#f4f7f5',
            borderRadius: '14px',
            padding: '12px 16px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>السعر بالساعة</div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: 'var(--primary)' }}>{pitch.pricePerHour} ج.م</div>
            </div>
            <div style={{ borderLeft: '1px solid #dce4de', borderRight: '1px solid #dce4de' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>نوع الملعب</div>
              <div style={{ fontSize: '15px', fontWeight: '800' }}>{pitch.type}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>نوع الأرضية</div>
              <div style={{ fontSize: '14px', fontWeight: '800' }}>{pitch.surface || 'نجيل صناعي'}</div>
            </div>
          </div>

          {/* Description & Facilities */}
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.7', marginBottom: '20px' }}>
            {pitch.description}
          </p>

          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '10px' }}>الخدمات والمرافق المتاحة:</h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {pitch.facilities && pitch.facilities.map((fac, i) => (
                <span key={i} style={{
                  background: '#eaf7f0',
                  color: 'var(--primary)',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <CheckCircle2 size={14} />
                  <span>{fac}</span>
                </span>
              ))}
            </div>
          </div>

          <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '20px 0' }} />

          {/* Interactive Date & Slot Selector */}
          <div>
            <div style={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '14px'
            }}>
              <h4 style={{ fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Clock size={18} color="var(--primary)" />
                <span>حدد تاريخ وساعات اللعب:</span>
              </h4>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#f1f5f2',
                  borderRadius: '16px',
                  padding: '2px',
                  border: '1px solid #dce4de'
                }}>
                  <button
                    type="button"
                    onClick={() => setTimeFormat('12h')}
                    style={{
                      background: timeFormat === '12h' ? 'var(--primary)' : 'transparent',
                      color: timeFormat === '12h' ? '#fff' : 'var(--text-muted)',
                      border: 'none',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    12 س
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeFormat('24h')}
                    style={{
                      background: timeFormat === '24h' ? 'var(--primary)' : 'transparent',
                      color: timeFormat === '24h' ? '#fff' : 'var(--text-muted)',
                      border: 'none',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    24 س
                  </button>
                </div>

                <input
                  type="date"
                  className="form-input"
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }}
                  min={new Date().toISOString().split('T')[0]}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlots([]);
                  }}
                />
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
                جاري التحقق من المواعيد المتاحة...
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                gap: '10px',
                marginBottom: '20px'
              }}>
                {slotsStatus.map((slot) => {
                  const isSelected = selectedSlots.includes(slot.time);
                  return (
                    <button
                      key={slot.time}
                      disabled={!slot.isAvailable}
                      onClick={() => toggleSlot(slot.time, slot.isAvailable)}
                      style={{
                        background: !slot.isAvailable ? '#f2f2f2' : isSelected ? 'var(--primary)' : '#ffffff',
                        color: !slot.isAvailable ? '#a0a0a0' : isSelected ? '#ffffff' : 'var(--text-dark)',
                        border: !slot.isAvailable ? '1px dashed #d0d0d0' : isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                        borderRadius: '10px',
                        padding: '10px 4px',
                        textAlign: 'center',
                        fontWeight: '800',
                        fontSize: '13px',
                        cursor: slot.isAvailable ? 'pointer' : 'not-allowed',
                        transition: 'var(--transition)'
                      }}
                    >
                      <div>{formatSlotTime(slot.time, timeFormat)}</div>
                      <div style={{ fontSize: '10px', fontWeight: '600', opacity: 0.8 }}>
                        {!slot.isAvailable ? 'محجوز' : isSelected ? 'محدد ✓' : 'متاح'}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Booking Price Footer & Action */}
          <div style={{
            background: '#092014',
            color: '#ffffff',
            borderRadius: '16px',
            padding: '18px 24px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginTop: '10px'
          }}>
            <div>
              <div style={{ fontSize: '13px', color: '#b6cfc2' }}>
                الساعات المختارة: <strong>{totalHours} ساعة</strong>
              </div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--accent-lime)' }}>
                الإجمالي: {totalPrice.toLocaleString('ar-EG')} ج.م
              </div>
            </div>

            <button
              className="btn btn-lime"
              disabled={totalHours === 0}
              onClick={() => onProceedToBooking(pitch, selectedDate, selectedSlots, totalPrice)}
              style={{
                padding: '12px 28px',
                opacity: totalHours === 0 ? 0.5 : 1,
                cursor: totalHours === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              متابعة الحجز ⚽
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
