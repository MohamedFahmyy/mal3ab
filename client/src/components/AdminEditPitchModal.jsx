import React, { useState } from 'react';
import { X, MapPin, DollarSign, Phone, Edit, Image, Shield } from 'lucide-react';
import { updatePitch } from '../utils/api';
import PitchHoursSelector from './PitchHoursSelector';
import { getTimeFormat } from '../utils/timeFormat';

export default function AdminEditPitchModal({ pitch, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: pitch.name || '',
    nameAr: pitch.nameAr || pitch.name || '',
    area: pitch.area || '',
    city: pitch.city || 'القاهرة',
    type: pitch.type || 'ملعب خماسي',
    pricePerHour: pitch.pricePerHour || '',
    address: pitch.address || '',
    surface: pitch.surface || 'نجيل صناعي',
    description: pitch.description || '',
    ownerPhone: pitch.ownerPhone || '',
    image: pitch.image || '',
    facilities: Array.isArray(pitch.facilities) ? pitch.facilities : ['إضاءة ليلية', 'غرف ملابس'],
    availableSlots: Array.isArray(pitch.availableSlots) && pitch.availableSlots.length > 0 
      ? pitch.availableSlots 
      : ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00']
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const timeFormat = getTimeFormat();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.area || !formData.pricePerHour) {
      setErrorMessage('يرجى إكمال الحقول الأساسية المطلوبة');
      return;
    }

    if (formData.availableSlots.length === 0) {
      setErrorMessage('يرجى تحديد ساعات عمل وتشغيل الملعب (ساعة واحدة على الأقل)');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    const res = await updatePitch(pitch.id, {
      ...formData,
      pricePerHour: Number(formData.pricePerHour)
    });

    setSubmitting(false);

    if (res.success) {
      onSuccess(res.data);
    } else {
      setErrorMessage(res.message || 'حدث خطأ في تعديل الملعب');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      direction: 'rtl',
      padding: '16px'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '20px',
        padding: '28px',
        width: 'min(640px, 98%)',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit size={20} color="var(--primary)" />
              <span>تعديل بيانات الملعب</span>
            </h2>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              كود الملعب: {pitch.id}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={24} />
          </button>
        </div>

        {errorMessage && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px' }}>
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Name & Arabic Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '700', fontSize: '13px' }}>الاسم بالعربية</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.nameAr}
                onChange={e => setFormData({ ...formData, nameAr: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '700', fontSize: '13px' }}>الاسم بالإنجليزية</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          {/* Area, City & Type */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '700', fontSize: '13px' }}>المنطقة</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.area}
                onChange={e => setFormData({ ...formData, area: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '700', fontSize: '13px' }}>المحافظة / المدينة</label>
              <select
                className="form-input"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
              >
                <option value="القاهرة">القاهرة</option>
                <option value="الجيزة">الجيزة</option>
                <option value="الإسكندرية">الإسكندرية</option>
                <option value="الشرقية">الشرقية</option>
                <option value="الدقهلية">الدقهلية</option>
                <option value="القليوبية">القليوبية</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '700', fontSize: '13px' }}>نوع الملعب</label>
              <select
                className="form-input"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="ملعب خماسي">ملعب خماسي</option>
                <option value="ملعب سباعي">ملعب سباعي</option>
                <option value="ملعب قانوني">ملعب قانوني (11 ضد 11)</option>
              </select>
            </div>
          </div>

          {/* Price, Phone & Surface */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '700', fontSize: '13px' }}>السعر / ساعة (ج.م)</label>
              <input
                type="number"
                className="form-input"
                required
                min="10"
                value={formData.pricePerHour}
                onChange={e => setFormData({ ...formData, pricePerHour: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '700', fontSize: '13px' }}>هاتف الملعب / الإدارة</label>
              <input
                type="text"
                className="form-input"
                value={formData.ownerPhone}
                onChange={e => setFormData({ ...formData, ownerPhone: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '700', fontSize: '13px' }}>نوع الأرضية</label>
              <input
                type="text"
                className="form-input"
                value={formData.surface}
                onChange={e => setFormData({ ...formData, surface: e.target.value })}
              />
            </div>
          </div>

          {/* Operating Hours Selector */}
          <div style={{ marginBottom: '16px' }}>
            <PitchHoursSelector
              selectedSlots={formData.availableSlots}
              onChange={(slots) => setFormData({ ...formData, availableSlots: slots })}
              timeFormat={timeFormat}
            />
          </div>

          {/* Address & Image URL */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '700', fontSize: '13px' }}>العنوان بالتفصيل</label>
            <input
              type="text"
              className="form-input"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '700', fontSize: '13px' }}>رابط صورة الملعب</label>
            <input
              type="url"
              className="form-input"
              value={formData.image}
              onChange={e => setFormData({ ...formData, image: e.target.value })}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{ flex: 1, padding: '12px', fontSize: '15px', fontWeight: '800' }}
            >
              {submitting ? 'جاري الحفظ...' : 'حفظ التعديلات ✅'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '10px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
