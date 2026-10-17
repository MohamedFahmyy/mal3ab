import React, { useState } from 'react';
import { X, DollarSign, Smartphone, CreditCard, CheckCircle2 } from 'lucide-react';
import { recordPayment } from '../utils/api';

export default function RecordPaymentModal({ booking, onClose, onSuccess }) {
  const [amount, setAmount] = useState(booking.remainingAmount || 0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!booking) return null;

  const maxPayable = booking.remainingAmount || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = Number(amount);

    if (numAmount <= 0) {
      setError('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    if (numAmount > maxPayable) {
      setError(`المبلغ المطلوب سداده (${numAmount} ج.م) يتجاوز الرصيد المتبقي (${maxPayable} ج.م)`);
      return;
    }

    setSubmitting(true);
    setError('');

    const res = await recordPayment({
      bookingId: booking.id,
      amount: numAmount,
      paymentMethod,
      type: 'payment',
      notes: notes.trim(),
      createdBy: 'إدارة المنصة'
    });

    setSubmitting(false);

    if (res.success) {
      onSuccess(res.data, res.booking);
    } else {
      setError(res.message || 'حدث خطأ أثناء تسجيل الدفعة');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={20} color="var(--primary)" />
            تسجيل دفعة نقدية لحجز #{booking.id}
          </h2>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Financial Summary Card */}
        <div style={{
          background: '#f8faf9',
          border: '1px solid #dce8df',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>العميل:</span>
            <span style={{ fontWeight: '800' }}>{booking.customerName} ({booking.customerPhone})</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>الملعب:</span>
            <span style={{ fontWeight: '700' }}>{booking.pitchName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>صافي قيمة الحجز:</span>
            <span style={{ fontWeight: '700' }}>{booking.netAmount || booking.totalAmount} ج.م</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>إجمالي المدفوع سابقاً:</span>
            <span style={{ fontWeight: '700', color: '#10b981' }}>{booking.paidAmount || 0} ج.م</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2ece5', paddingTop: '8px' }}>
            <span style={{ fontWeight: '800', color: '#dc2626' }}>المبلغ المتبقي المطلوب:</span>
            <span style={{ fontWeight: '900', fontSize: '18px', color: '#dc2626' }}>{maxPayable} ج.م</span>
          </div>
        </div>

        {error && (
          <div style={{
            background: '#fde8e8',
            color: '#b91c1c',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '700',
            marginBottom: '16px'
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>قيمة الدفعة الحالية (ج.م) *</span>
              <button 
                type="button" 
                onClick={() => setAmount(maxPayable)}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}
              >
                سداد كامل المتبقي ({maxPayable} ج.م)
              </button>
            </label>
            <input
              type="number"
              min="1"
              max={maxPayable}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="form-input"
              required
              style={{ fontSize: '18px', fontWeight: '800' }}
            />
          </div>

          <div className="form-group">
            <label>طريقة الدفع *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div
                onClick={() => setPaymentMethod('cash')}
                style={{
                  border: paymentMethod === 'cash' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: paymentMethod === 'cash' ? 'var(--primary-light)' : '#fff',
                  borderRadius: '10px',
                  padding: '10px 6px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '12px'
                }}
              >
                <DollarSign size={18} style={{ margin: '0 auto 4px', display: 'block', color: 'var(--primary)' }} />
                <span>كاش</span>
              </div>

              <div
                onClick={() => setPaymentMethod('vodafone')}
                style={{
                  border: paymentMethod === 'vodafone' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: paymentMethod === 'vodafone' ? 'var(--primary-light)' : '#fff',
                  borderRadius: '10px',
                  padding: '10px 6px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '12px'
                }}
              >
                <Smartphone size={18} style={{ margin: '0 auto 4px', display: 'block', color: 'var(--primary)' }} />
                <span>فودافون كاش</span>
              </div>

              <div
                onClick={() => setPaymentMethod('card')}
                style={{
                  border: paymentMethod === 'card' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: paymentMethod === 'card' ? 'var(--primary-light)' : '#fff',
                  borderRadius: '10px',
                  padding: '10px 6px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '12px'
                }}
              >
                <CreditCard size={18} style={{ margin: '0 auto 4px', display: 'block', color: 'var(--primary)' }} />
                <span>فيزا / بطاقة</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>ملاحظات على الدفعة (اختياري)</label>
            <input
              type="text"
              placeholder="مثال: دفعة تأكيد حجز / تحويل محفظة..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-input"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || maxPayable <= 0}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '15px', marginTop: '10px' }}
          >
            {submitting ? 'جاري التسجيل...' : `تأكيد تسجيل دفعة ${amount || 0} ج.م 💵`}
          </button>
        </form>
      </div>
    </div>
  );
}
