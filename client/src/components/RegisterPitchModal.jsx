import React, { useState } from 'react';
import { X, PlusCircle, Building2, MapPin, Phone } from 'lucide-react';
import { registerPitch } from '../utils/api';
import PitchHoursSelector from './PitchHoursSelector';
import { getTimeFormat } from '../utils/timeFormat';

export default function RegisterPitchModal({ onClose, onPitchRegistered }) {
  const [formData, setFormData] = useState({
    name: '',
    area: 'مدينة نصر',
    type: 'ملعب خماسي',
    pricePerHour: 250,
    address: '',
    surface: 'نجيل صناعي تركيا معتمد',
    ownerPhone: '',
    image: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1000&q=80',
    facilities: ['إضاءة ليلية', 'غرف تغيير ملابس وشاور', 'كافيه ومشروبات'],
    availableSlots: ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00']
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.ownerPhone.trim()) {
      setErrorMessage('يرجى كتابة اسم الملعب ورقم تليفون المالـك');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    const res = await registerPitch(formData);
    setSubmitting(false);

    if (res.success) {
      onPitchRegistered(res.data);
    } else {
      setErrorMessage(res.message || 'فشل إضافة الملعب');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ width: 'min(600px, 100%)' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>سجّل ملعبك على المنصة ⚽</h2>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
          انضم إلى أكبر تجمع ملاعب في مصر واستقبل حجوزات يومية بآلاف اللاعبين!
        </p>

        {errorMessage && (
          <div style={{ background: '#fde8e8', color: '#b91c1c', padding: '12px', borderRadius: '10px', fontSize: '14px', marginBottom: '16px' }}>
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>اسم الملعب بالكامل *</label>
            <input
              type="text"
              className="form-input"
              placeholder="مثال: ستاد الرواد الخماسي"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label>المنطقة / المحافظة *</label>
              <select
                className="form-select"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              >
                <option value="مدينة نصر">مدينة نصر</option>
                <option value="التجمع الخامس">التجمع الخامس</option>
                <option value="المعادي">المعادي</option>
                <option value="6 أكتوبر">6 أكتوبر</option>
                <option value="الشيخ زايد">الشيخ زايد</option>
                <option value="الهرم">الهرم</option>
                <option value="سموحة">سموحة (الإسكندرية)</option>
              </select>
            </div>

            <div className="form-group">
              <label>نوع الملعب *</label>
              <select
                className="form-select"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="ملعب خماسي">ملعب خماسي (5v5)</option>
                <option value="ملعب سباعي">ملعب سباعي (7v7)</option>
                <option value="ملعب قانوني">ملعب قانوني (11v11)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label>سعر الساعة (بالجنيه المصري) *</label>
              <input
                type="number"
                className="form-input"
                min={50}
                max={2000}
                value={formData.pricePerHour}
                onChange={(e) => setFormData({ ...formData, pricePerHour: Number(e.target.value) })}
                required
              />
            </div>

            <div className="form-group">
              <label>رقم موبايل المالك (للتواصل والحجوزات) *</label>
              <input
                type="tel"
                className="form-input"
                placeholder="010XXXXXXXX"
                value={formData.ownerPhone}
                onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>العنوان التفصيلي للملعب</label>
            <input
              type="text"
              className="form-input"
              placeholder="مثال: شارع النصر، بجوار النادي الأهلي"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <PitchHoursSelector
              selectedSlots={formData.availableSlots}
              onChange={(slots) => setFormData({ ...formData, availableSlots: slots })}
              timeFormat={getTimeFormat()}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '16px', marginTop: '10px' }}
          >
            {submitting ? 'جاري حفظ الملعب...' : 'نشر الملعب فوراً 🚀'}
          </button>
        </form>
      </div>
    </div>
  );
}
