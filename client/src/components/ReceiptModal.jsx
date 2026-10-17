import React from 'react';
import { X, Printer, CheckCircle, ShieldCheck } from 'lucide-react';

export default function ReceiptModal({ booking, payment, onClose }) {
  if (!booking && !payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const receiptDate = payment?.createdAt || booking?.createdAt || new Date().toISOString();
  const formattedDate = new Date(receiptDate).toLocaleString('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const paymentMethodLabel = (method) => {
    if (method === 'vodafone') return 'فودافون كاش (Vodafone Cash)';
    if (method === 'card') return 'بطاقة بنكية / فيزا (Card/Visa)';
    return 'نقداً (كاش بالملعب)';
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '550px', background: '#fff', color: '#111' }}
      >
        <div className="modal-header" style={{ borderBottom: '1px dashed #ccc', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px' }}>⚽</span>
            <div>
              <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 900 }}>إيصال دفع رسمي — منصة مَلعبك</h2>
              <span style={{ fontSize: '11px', color: '#666' }}>رقم الإيصال: {payment?.id || booking?.id}</span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Printable Receipt Body */}
        <div id="printable-receipt" style={{ padding: '20px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#e8f5e9',
              color: '#1b5e20',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 800
            }}>
              <CheckCircle size={16} /> تم اعتماد المعاملة المالية بنجاح
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>{formattedDate}</div>
          </div>

          <div style={{ background: '#f9fbf9', border: '1px solid #e0eae2', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#777', display: 'block', fontSize: '11px' }}>اسم العميل</span>
                <strong>{booking?.customerName || payment?.customerName}</strong>
              </div>
              <div>
                <span style={{ color: '#777', display: 'block', fontSize: '11px' }}>رقم الهاتف</span>
                <strong>{booking?.customerPhone || payment?.customerPhone}</strong>
              </div>
              <div>
                <span style={{ color: '#777', display: 'block', fontSize: '11px' }}>الملعب</span>
                <strong>{booking?.pitchName || 'ملعب كرة قدم'}</strong>
              </div>
              <div>
                <span style={{ color: '#777', display: 'block', fontSize: '11px' }}>تاريخ وموعد اللعب</span>
                <strong>{booking?.date} ({booking?.timeSlots?.join(' , ')})</strong>
              </div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '16px' }}>
            <tbody>
              {booking && (
                <>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px 0', color: '#666' }}>إجمالي الحجز قبل الخصم:</td>
                    <td style={{ padding: '8px 0', textAlign: 'left', fontWeight: '700' }}>{booking.totalAmount} ج.م</td>
                  </tr>
                  {booking.discountAmount > 0 && (
                    <tr style={{ borderBottom: '1px solid #eee', color: '#d97706' }}>
                      <td style={{ padding: '8px 0' }}>
                        الخصم المطبق ({booking.discountType === 'percentage' ? `${booking.discountValue}%` : 'ثابت'}):
                      </td>
                      <td style={{ padding: '8px 0', textAlign: 'left', fontWeight: '700' }}>- {booking.discountAmount} ج.م</td>
                    </tr>
                  )}
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px 0', color: '#666' }}>صافي المطلوب بعد الخصم:</td>
                    <td style={{ padding: '8px 0', textAlign: 'left', fontWeight: '700' }}>{booking.netAmount} ج.م</td>
                  </tr>
                </>
              )}
              {payment && (
                <tr style={{ borderBottom: '2px solid #333', background: '#f0f9f3' }}>
                  <td style={{ padding: '10px 8px', fontWeight: '800', color: '#10b981' }}>قيمة هذه الدفعة:</td>
                  <td style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '900', fontSize: '17px', color: '#10b981' }}>
                    {payment.amount} ج.م
                  </td>
                </tr>
              )}
              {booking && (
                <>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px 0', color: '#666' }}>إجمالي المسدد حتى الآن:</td>
                    <td style={{ padding: '8px 0', textAlign: 'left', fontWeight: '700', color: '#10b981' }}>{booking.paidAmount} ج.م</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px 0', color: '#666', fontWeight: '800' }}>المبلغ المتبقي:</td>
                    <td style={{ padding: '8px 0', textAlign: 'left', fontWeight: '900', color: booking.remainingAmount > 0 ? '#dc2626' : '#10b981' }}>
                      {booking.remainingAmount} ج.م
                    </td>
                  </tr>
                </>
              )}
              <tr>
                <td style={{ padding: '8px 0', color: '#666' }}>طريقة السداد:</td>
                <td style={{ padding: '8px 0', textAlign: 'left', fontWeight: '700' }}>
                  {paymentMethodLabel(payment?.paymentMethod || booking?.paymentMethod)}
                </td>
              </tr>
              {payment?.notes && (
                <tr>
                  <td style={{ padding: '8px 0', color: '#666' }}>ملاحظات:</td>
                  <td style={{ padding: '8px 0', textAlign: 'left' }}>{payment.notes}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ textAlign: 'center', fontSize: '11px', color: '#888', marginTop: '14px', borderTop: '1px dashed #ccc', paddingTop: '10px' }}>
            شكراً لاختياركم منصة مَلعبك • نتمنى لكم مباراة ممتعة ⚽
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button 
            onClick={handlePrint}
            className="btn btn-primary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Printer size={18} /> طباعة الإيصال
          </button>
          <button 
            onClick={onClose}
            className="btn"
            style={{ background: '#eee', color: '#333' }}
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
