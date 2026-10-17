import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, User, Phone, DollarSign, Printer, PlusCircle, AlertCircle, CheckCircle, Tag } from 'lucide-react';
import { fetchBookingDetails, cancelBooking } from '../utils/api';
import RecordPaymentModal from './RecordPaymentModal';
import ReceiptModal from './ReceiptModal';

export default function AdminBookingDetailModal({ bookingId, onClose, onUpdated }) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const loadBooking = async () => {
    setLoading(true);
    const res = await fetchBookingDetails(bookingId);
    if (res.success) {
      setBooking(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);

  if (!bookingId) return null;

  const handleCancel = async () => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذا الحجز؟ سيتم تحديث حالة الحجز مع الحفاظ على سجل العميل والمدفوعات.')) {
      return;
    }
    setCancelling(true);
    const res = await cancelBooking(booking.id);
    setCancelling(false);
    if (res.success) {
      loadBooking();
      if (onUpdated) onUpdated();
    } else {
      alert(res.message || 'تعذر إلغاء الحجز');
    }
  };

  const paymentStatusBadge = (status) => {
    switch(status) {
      case 'paid':
        return <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '800' }}>مدفوع بالكامل</span>;
      case 'partial':
        return <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '800' }}>مدفوع جزئياً</span>;
      default:
        return <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '800' }}>غير مدفوع</span>;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1050 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚽</span>
            <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 900 }}>تفاصيل الحجز #{bookingId}</h2>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>جاري تحميل تفاصيل الحجز...</div>
        ) : !booking ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#dc2626' }}>تعذر العثور على بيانات الحجز</div>
        ) : (
          <div>
            {/* Status Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8faf9', padding: '12px 16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--border)' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>حالة الحجز</span>
                <strong style={{ color: booking.status === 'cancelled' || booking.status === 'ملغي' ? '#dc2626' : 'var(--primary)' }}>
                  {booking.status === 'cancelled' || booking.status === 'ملغي' ? 'ملغي' : 'مؤكد'}
                </strong>
              </div>
              <div style={{ textAlign: 'left' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>حالة الدفع</span>
                {paymentStatusBadge(booking.paymentStatus)}
              </div>
            </div>

            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>
                  <User size={16} color="var(--primary)" /> اسم العميل
                </div>
                <div style={{ fontWeight: '800', fontSize: '15px' }}>{booking.customerName}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <Phone size={14} /> {booking.customerPhone}
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>
                  <MapPin size={16} color="var(--accent-amber)" /> الملعب
                </div>
                <div style={{ fontWeight: '800', fontSize: '15px' }}>{booking.pitchName}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {booking.pitchArea} • {booking.pricePerHour} ج.م/ساعة
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>
                  <Clock size={16} color="var(--primary)" /> التاريخ والمواعيد المحجوزة
                </div>
                <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '8px' }}>
                  📅 {booking.date}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {booking.timeSlots?.map(t => (
                    <span key={t} style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '6px', fontWeight: '800', fontSize: '12px' }}>
                      ⏰ {t}
                    </span>
                  ))}
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', alignSelf: 'center', marginRight: '6px' }}>
                    ({booking.hours || booking.timeSlots?.length} ساعة)
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Breakdown Table */}
            <div style={{ background: '#f8faf9', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <DollarSign size={18} color="var(--primary)" /> الحسابات المالية للحجز
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', textAlign: 'center' }}>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>إجمالي الحجز</span>
                  <strong style={{ fontSize: '16px' }}>{booking.totalAmount} ج.م</strong>
                </div>

                <div style={{ background: '#fff', padding: '10px', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>الخصم</span>
                  <strong style={{ fontSize: '16px', color: booking.discountAmount > 0 ? '#d97706' : '#666' }}>
                    {booking.discountAmount > 0 ? `-${booking.discountAmount} ج.م` : '0 ج.م'}
                  </strong>
                  {booking.discountType === 'percentage' && (
                    <span style={{ fontSize: '10px', color: '#d97706', display: 'block' }}>({booking.discountValue}%)</span>
                  )}
                </div>

                <div style={{ background: '#fff', padding: '10px', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>الصافي المطلوب</span>
                  <strong style={{ fontSize: '16px', color: 'var(--primary)' }}>{booking.netAmount} ج.م</strong>
                </div>

                <div style={{ background: '#fff', padding: '10px', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>المدفوع</span>
                  <strong style={{ fontSize: '16px', color: '#10b981' }}>{booking.paidAmount} ج.م</strong>
                </div>

                <div style={{ background: '#fff', padding: '10px', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>المتبقي</span>
                  <strong style={{ fontSize: '16px', color: booking.remainingAmount > 0 ? '#dc2626' : '#10b981' }}>
                    {booking.remainingAmount} ج.م
                  </strong>
                </div>
              </div>
            </div>

            {/* Payments Ledger for this booking */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800' }}>
                  سجل الدفعات المسجلة ({booking.payments?.length || 0})
                </h4>
                {booking.remainingAmount > 0 && booking.status !== 'cancelled' && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    style={{
                      background: 'var(--primary)',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <PlusCircle size={15} /> تسجيل دفعة جديدة
                  </button>
                )}
              </div>

              {(!booking.payments || booking.payments.length === 0) ? (
                <div style={{ background: '#f9f9f9', padding: '16px', borderRadius: '10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  لم يتم تسجيل أي دفعات نقدية بعد لهذا الحجز.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'right' }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
                        <th style={{ padding: '8px' }}>رقم الدفعة</th>
                        <th style={{ padding: '8px' }}>المبلغ</th>
                        <th style={{ padding: '8px' }}>الطريقة</th>
                        <th style={{ padding: '8px' }}>التاريخ</th>
                        <th style={{ padding: '8px' }}>بواسطة</th>
                        <th style={{ padding: '8px' }}>إيصال</th>
                      </tr>
                    </thead>
                    <tbody>
                      {booking.payments.map((p, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '8px', fontWeight: '700' }}>{p.id}</td>
                          <td style={{ padding: '8px', fontWeight: '800', color: '#10b981' }}>{p.amount} ج.م</td>
                          <td style={{ padding: '8px' }}>{p.paymentMethod === 'vodafone' ? 'فودافون كاش' : p.paymentMethod === 'card' ? 'فيزا' : 'كاش'}</td>
                          <td style={{ padding: '8px', color: 'var(--text-muted)' }}>
                            {new Date(p.createdAt).toLocaleDateString('ar-EG')}
                          </td>
                          <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{p.createdBy || 'النظام'}</td>
                          <td style={{ padding: '8px' }}>
                            <button
                              onClick={() => {
                                setSelectedPayment(p);
                                setShowReceiptModal(true);
                              }}
                              style={{ background: '#f0f5f2', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', color: 'var(--primary)', fontWeight: '700' }}
                            >
                              <Printer size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <button
                onClick={() => {
                  setSelectedPayment(booking.payments?.[0] || null);
                  setShowReceiptModal(true);
                }}
                className="btn"
                style={{ background: '#f0f5f2', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={16} /> طباعة إيصال الحجز
              </button>

              {booking.status !== 'cancelled' && booking.status !== 'ملغي' && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="btn"
                  style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}
                >
                  {cancelling ? 'جاري الإلغاء...' : 'إلغاء الحجز'}
                </button>
              )}

              <button onClick={onClose} className="btn" style={{ background: '#eee', color: '#333' }}>
                إغلاق
              </button>
            </div>
          </div>
        )}
      </div>

      {showPaymentModal && (
        <RecordPaymentModal
          booking={booking}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={(newPayment, updatedBooking) => {
            setShowPaymentModal(false);
            loadBooking();
            if (onUpdated) onUpdated();
          }}
        />
      )}

      {showReceiptModal && (
        <ReceiptModal
          booking={booking}
          payment={selectedPayment}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
}
