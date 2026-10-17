import React, { useState } from 'react';
import { X, CheckCircle, ShieldCheck, CreditCard, DollarSign, Smartphone, Tag } from 'lucide-react';
import { createBooking } from '../utils/api';
import { formatSlotTime } from '../utils/timeFormat';

export default function BookingModal({ bookingData, onClose, onBookingSuccess }) {
  const { pitch, date, timeSlots, totalPrice } = bookingData || {};

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Discount / Promo code
  const [promoCode, setPromoCode] = useState('');
  const [discountType, setDiscountType] = useState('none');
  const [discountValue, setDiscountValue] = useState(0);
  const [promoMessage, setPromoMessage] = useState('');

  // Payment Option (Full, Partial Deposit, Pay at Pitch)
  const [paymentPlan, setPaymentPlan] = useState('full'); // 'full' | 'deposit' | 'later'
  const [customDeposit, setCustomDeposit] = useState(100);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!bookingData) return null;

  const basePrice = totalPrice || 0;

  // Apply promo code
  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (code === 'MALAEB10' || code === 'KORA10') {
      setDiscountType('percentage');
      setDiscountValue(10);
      setPromoMessage('تم تطبيق خصم 10% بنجاح! ⚽');
    } else if (code === 'WELCOME50' || code === 'EGP50') {
      setDiscountType('fixed');
      setDiscountValue(50);
      setPromoMessage('تم تطبيق خصم 50 ج.م بنجاح! 🎉');
    } else if (!code) {
      setDiscountType('none');
      setDiscountValue(0);
      setPromoMessage('');
    } else {
      setDiscountType('none');
      setDiscountValue(0);
      setPromoMessage('كود الخصم غير صحيح أو منتهي الصلاحية');
    }
  };

  // Discount calculation
  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = Math.round((basePrice * discountValue) / 100);
  } else if (discountType === 'fixed') {
    discountAmount = Math.min(basePrice, discountValue);
  }
  const netAmount = Math.max(0, basePrice - discountAmount);

  // Initial Paid amount calculation
  let initialPaid = 0;
  if (paymentPlan === 'full') {
    initialPaid = netAmount;
  } else if (paymentPlan === 'deposit') {
    initialPaid = Math.min(netAmount, Math.max(0, Number(customDeposit || 0)));
  } else if (paymentPlan === 'later') {
    initialPaid = 0;
  }

  const remainingAmount = Math.max(0, netAmount - initialPaid);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMessage('يرجى كتابة الاسم ورقم الهاتف لمتابعة الحجز');
      return;
    }

    if (customerPhone.trim().length < 10) {
      setErrorMessage('يرجى إدخال رقم هاتف صحيح يتكون من 11 رقم');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    const res = await createBooking({
      pitchId: pitch.id,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      date,
      timeSlots,
      paymentMethod,
      discountType,
      discountValue,
      discountNotes: promoCode ? `كوبون: ${promoCode}` : '',
      paidAmount: initialPaid
    });

    setSubmitting(false);

    if (res.success) {
      onBookingSuccess(res.data);
    } else {
      setErrorMessage(res.message || 'عذراً، حدث خطأ في تأكيد الحجز');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <h2>تأكيد الحجز النهائي ⚽</h2>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Summary Card */}
        <div style={{
          background: '#f4f8f5',
          border: '1px solid #dce8df',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--dark)' }}>
            {pitch.nameAr || pitch.name}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            📍 {pitch.area} • 📅 {date}
          </div>

          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            margin: '10px 0'
          }}>
            {timeSlots.map((t) => (
              <span key={t} style={{
                background: '#ffffff',
                border: '1px solid #d0e0d5',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '800',
                color: 'var(--primary)'
              }}>
                ⏰ {formatSlotTime(t)}
              </span>
            ))}
          </div>

          <hr style={{ border: 0, borderTop: '1px solid #dce8df', margin: '10px 0' }} />

          {/* Pricing Breakdown */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-muted)' }}>إجمالي الساعات قبل الخصم:</span>
            <strong>{basePrice} ج.م</strong>
          </div>

          {discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#d97706', marginBottom: '4px' }}>
              <span>قيمة الخصم ({discountType === 'percentage' ? `${discountValue}%` : 'ثابت'}):</span>
              <strong>- {discountAmount} ج.م</strong>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
            <span style={{ fontWeight: '800', fontSize: '14px' }}>الصافي النهائي المطلوب:</span>
            <span style={{ fontSize: '22px', fontWeight: '900', color: 'var(--primary)' }}>
              {netAmount} ج.م
            </span>
          </div>

          {initialPaid > 0 && remainingAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '6px', color: '#2563eb' }}>
              <span>مدفوع الآن: {initialPaid} ج.م</span>
              <span style={{ color: '#dc2626', fontWeight: '800' }}>متبقي بالملعب: {remainingAmount} ج.م</span>
            </div>
          )}
        </div>

        {/* Promo Code Input */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="هل لديك كود خصم؟ (جرب: KORA10 أو WELCOME50)"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              className="form-input"
              style={{ fontSize: '13px' }}
            />
            <button
              type="button"
              onClick={handleApplyPromo}
              style={{
                background: '#f0f5f2',
                border: '1px solid #dce8df',
                color: 'var(--primary)',
                fontWeight: '800',
                padding: '0 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              تطبيق
            </button>
          </div>
          {promoMessage && (
            <div style={{ fontSize: '12px', fontWeight: '700', marginTop: '4px', color: discountAmount > 0 ? '#15803d' : '#dc2626' }}>
              {promoMessage}
            </div>
          )}
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div style={{
            background: '#fde8e8',
            color: '#b91c1c',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '700',
            marginBottom: '16px'
          }}>
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>اسمك بالكامل (صاحب الحجز) *</label>
            <input
              type="text"
              className="form-input"
              placeholder="مثال: أحمد محمود"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>رقم المحمول (لإرسال كود التأكيد) *</label>
            <input
              type="tel"
              className="form-input"
              placeholder="010XXXXXXXX"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              required
            />
          </div>

          {/* Payment Plan (Full / Partial / At Pitch) */}
          <div className="form-group">
            <label>خطة سداد الحجز</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={() => setPaymentPlan('full')}
                style={{
                  border: paymentPlan === 'full' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: paymentPlan === 'full' ? 'var(--primary-light)' : '#fff',
                  borderRadius: '8px',
                  padding: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                سداد كامل المبلغ
              </button>
              <button
                type="button"
                onClick={() => setPaymentPlan('deposit')}
                style={{
                  border: paymentPlan === 'deposit' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: paymentPlan === 'deposit' ? 'var(--primary-light)' : '#fff',
                  borderRadius: '8px',
                  padding: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                عربون جزئي
              </button>
              <button
                type="button"
                onClick={() => setPaymentPlan('later')}
                style={{
                  border: paymentPlan === 'later' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: paymentPlan === 'later' ? 'var(--primary-light)' : '#fff',
                  borderRadius: '8px',
                  padding: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                الدفع بالملعب كاش
              </button>
            </div>

            {paymentPlan === 'deposit' && (
              <div style={{ marginTop: '8px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>مبلغ العربون المطلوب سداده (ج.م):</label>
                <input
                  type="number"
                  min="50"
                  max={netAmount}
                  value={customDeposit}
                  onChange={(e) => setCustomDeposit(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', fontWeight: '800' }}
                />
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="form-group">
            <label>طريقة الدفع الفضلى</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div
                onClick={() => setPaymentMethod('cash')}
                style={{
                  border: paymentMethod === 'cash' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: paymentMethod === 'cash' ? 'var(--primary-light)' : '#ffffff',
                  borderRadius: '10px',
                  padding: '10px 8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '12px'
                }}
              >
                <DollarSign size={20} style={{ margin: '0 auto 4px', display: 'block', color: 'var(--primary)' }} />
                <span>كاش بالملعب</span>
              </div>

              <div
                onClick={() => setPaymentMethod('vodafone')}
                style={{
                  border: paymentMethod === 'vodafone' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: paymentMethod === 'vodafone' ? 'var(--primary-light)' : '#ffffff',
                  borderRadius: '10px',
                  padding: '10px 8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '12px'
                }}
              >
                <Smartphone size={20} style={{ margin: '0 auto 4px', display: 'block', color: 'var(--primary)' }} />
                <span>فودافون كاش</span>
              </div>

              <div
                onClick={() => setPaymentMethod('card')}
                style={{
                  border: paymentMethod === 'card' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: paymentMethod === 'card' ? 'var(--primary-light)' : '#ffffff',
                  borderRadius: '10px',
                  padding: '10px 8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '12px'
                }}
              >
                <CreditCard size={20} style={{ margin: '0 auto 4px', display: 'block', color: 'var(--primary)' }} />
                <span>فيزا / كارت</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '16px', marginTop: '10px' }}
          >
            {submitting ? 'جاري تأكيد حجزك...' : `تأكيد الحجز النهائي (${netAmount} ج.م) 🎉`}
          </button>
        </form>
      </div>
    </div>
  );
}
