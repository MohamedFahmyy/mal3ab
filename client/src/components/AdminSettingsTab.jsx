import React, { useState, useEffect } from 'react';
import { 
  Palette, Globe, Image, Phone, Mail, FileText, CheckCircle, Save, 
  RotateCcw, Sparkles, AlertCircle, Eye, Upload
} from 'lucide-react';
import { fetchSettings, updateSettings } from '../utils/api';

export default function AdminSettingsTab({ showToast }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    title: 'مَلعبك',
    slogan: 'المنصة رقم #1 لحجز ملاعب كرة القدم في مصر',
    heroTitle: 'احجز ملعبك ولعبتك تبدأ في دقيقة ⚽',
    heroSubtitle: 'اختر أفضل الملاعب الخماسية والسباعية القريبة منك، قارن الأسعار والتقييمات، وأكّد حجزك أونلاين بضغطة واحدة.',
    logoUrl: '',
    logoEmoji: '⚽',
    contactPhone: '19989',
    contactEmail: 'support@malaeb.eg',
    footerAbout: 'المنصة الأولى المخصصة لحجز ملاعب كرة القدم في مصر. نهدف لتسهيل تجربة حجز الملاعب للاعبين وأصحاب الملاعب بأحدث التقنيات.'
  });

  const loadCurrentSettings = async () => {
    setLoading(true);
    const res = await fetchSettings();
    if (res.success && res.data) {
      setSettings(prev => ({ ...prev, ...res.data }));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صالح (PNG, JPG, SVG, WebP)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 2 ميجابايت');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      handleChange('logoUrl', event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateSettings(settings);
      if (res.success) {
        showToast('تم حفظ وتحديث إعدادات وبيانات المنصة بنجاح 🎉');
      } else {
        alert(res.message || 'حدث خطأ أثناء حفظ الإعدادات');
      }
    } catch {
      alert('تعذر الاتصال بالخادم لحفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const emojiList = ['⚽', '🏟️', '🏆', '🥇', '🥅', '🎯', '👟', '⭐'];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '28px', marginBottom: '10px' }}>⏳</div>
        <div>جاري تحميل إعدادات المنصة...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Palette size={24} color="var(--primary)" />
            <span>إعدادات وهوية المنصة</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            تحكم في اسم الموقع، الشعار اللفظي (Slogan)، شعار اللوجو، والنصوص الترويجية وبيانات الاتصال.
          </p>
        </div>

        <button 
          onClick={handleSubmit} 
          disabled={saving}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
        >
          <Save size={18} />
          <span>{saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          {/* Card 1: Brand & Logo */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--dark)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={19} color="var(--primary)" />
              <span>بيانات الموقع والهوية البصرية</span>
            </h3>

            <div className="form-group">
              <label>اسم المنصة / عنوان الموقع (Title)</label>
              <input
                type="text"
                className="form-input"
                value={settings.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="مثال: مَلعبك أو كوورة أرينا"
                required
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>يظهر في شريط التنقل العلوي وتبويب المتصفح</span>
            </div>

            <div className="form-group">
              <label>الشعار اللفظي للمنصة (Slogan)</label>
              <input
                type="text"
                className="form-input"
                value={settings.slogan}
                onChange={(e) => handleChange('slogan', e.target.value)}
                placeholder="مثال: المنصة رقم #1 لحجز ملاعب كرة القدم في مصر"
                required
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>يظهر في الشارة أعلى الصفحة الرئيسية ومحركات البحث</span>
            </div>

            <div className="form-group">
              <label>شعار المنصة (Logo Image)</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-input"
                  value={settings.logoUrl}
                  onChange={(e) => handleChange('logoUrl', e.target.value)}
                  placeholder="ضع رابط صورة الشعار هنا (URL) أو ارفع ملف من جهازك"
                />
                <label 
                  className="btn" 
                  style={{ 
                    background: '#f1f5f2', 
                    color: 'var(--dark)', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #dce4de'
                  }}
                >
                  <Upload size={16} />
                  <span>رفع صورة</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                </label>
              </div>
              {settings.logoUrl && (
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px', background: '#f8faf9', padding: '10px 14px', borderRadius: '10px' }}>
                  <img src={settings.logoUrl} alt="معاينة الشعار" style={{ maxHeight: '40px', maxWidth: '120px', objectFit: 'contain' }} />
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>معاينة الشعار المرفوع</span>
                  <button 
                    type="button" 
                    onClick={() => handleChange('logoUrl', '')}
                    style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '12px', fontWeight: 700, marginRight: 'auto' }}
                  >
                    إزالة الشعار
                  </button>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>الأيقونة التعبيرية المصاحبة (Logo Emoji)</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {emojiList.map(em => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => handleChange('logoEmoji', em)}
                    style={{
                      fontSize: '20px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: settings.logoEmoji === em ? '2px solid var(--primary)' : '1px solid #e2e8e4',
                      background: settings.logoEmoji === em ? '#e8f5ee' : '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    {em}
                  </button>
                ))}
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '60px', textAlign: 'center', fontSize: '18px', padding: '6px' }}
                  value={settings.logoEmoji}
                  onChange={(e) => handleChange('logoEmoji', e.target.value)}
                  maxLength={4}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Hero Section Texts */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--dark)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={19} color="var(--primary)" />
              <span>نصوص واجهة الهيدر (Hero Banner)</span>
            </h3>

            <div className="form-group">
              <label>العنوان الرئيسي في الصفحة (Hero Title)</label>
              <textarea
                className="form-input"
                rows={3}
                value={settings.heroTitle}
                onChange={(e) => handleChange('heroTitle', e.target.value)}
                placeholder="احجز ملعبك ولعبتك تبدأ في دقيقة ⚽"
                required
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>يمكنك الضغط على Enter للنزول لسطر جديد</span>
            </div>

            <div className="form-group">
              <label>الوصف والفقرة الترحيبية (Hero Subtitle)</label>
              <textarea
                className="form-input"
                rows={4}
                value={settings.heroSubtitle}
                onChange={(e) => handleChange('heroSubtitle', e.target.value)}
                placeholder="اختر أفضل الملاعب الخماسية والسباعية القريبة منك، قارن الأسعار والتقييمات، وأكّد حجزك أونلاين بضغطة واحدة."
                required
              />
            </div>
          </div>

          {/* Card 3: Contact & Customer Support */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--dark)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Phone size={19} color="var(--primary)" />
              <span>بيانات خدمة العملاء والفوتر</span>
            </h3>

            <div className="form-group">
              <label>رقم خدمة العملاء والخط الساخن</label>
              <input
                type="text"
                className="form-input"
                value={settings.contactPhone}
                onChange={(e) => handleChange('contactPhone', e.target.value)}
                placeholder="مثال: 19989 أو 01012345678"
              />
            </div>

            <div className="form-group">
              <label>البريد الإلكتروني للدعم الفني</label>
              <input
                type="email"
                className="form-input"
                value={settings.contactEmail}
                onChange={(e) => handleChange('contactEmail', e.target.value)}
                placeholder="support@malaeb.eg"
              />
            </div>

            <div className="form-group">
              <label>نبذة عن المنصة في الفوتر (Footer About)</label>
              <textarea
                className="form-input"
                rows={4}
                value={settings.footerAbout}
                onChange={(e) => handleChange('footerAbout', e.target.value)}
                placeholder="نبذة مختصرة تظهر في أسفل كل الصفحات"
              />
            </div>
          </div>

          {/* Card 4: Live Preview */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--dark)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye size={19} color="var(--primary)" />
              <span>معاينة حية وفورية (Live Preview)</span>
            </h3>

            {/* Navbar Preview */}
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                شريط التنقل (Navbar):
              </span>
              <div style={{
                background: '#ffffff',
                border: '1px solid #e7ece8',
                borderRadius: '12px',
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" style={{ maxHeight: '36px', maxWidth: '120px', objectFit: 'contain' }} />
                  ) : null}
                  <span>{settings.title || 'مَلعبك'}</span>
                  {!settings.logoUrl && <span style={{ color: 'var(--primary)' }}>{settings.logoEmoji || '⚽'}</span>}
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <span>الرئيسية</span>
                  <span>الملاعب</span>
                </div>
              </div>
            </div>

            {/* Hero Badge & Title Preview */}
            <div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                الهيدر الترويجي (Hero):
              </span>
              <div style={{
                background: 'linear-gradient(135deg, #061e12 0%, #0c4228 100%)',
                color: '#fff',
                borderRadius: '12px',
                padding: '20px',
                direction: 'rtl'
              }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255,255,255,0.12)',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  marginBottom: '10px'
                }}>
                  <span>{settings.logoEmoji || '⚽'}</span>
                  <span>{settings.slogan || 'شعار الموقع'}</span>
                </div>

                <div style={{ fontSize: '18px', fontWeight: 900, marginBottom: '6px', whiteSpace: 'pre-line' }}>
                  {settings.heroTitle || 'العنوان الرئيسي'}
                </div>

                <p style={{ fontSize: '12px', color: '#cfdfd5', lineHeight: '1.5', margin: 0 }}>
                  {settings.heroSubtitle || 'الوصف المختصر'}
                </p>
              </div>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button 
                type="submit" 
                disabled={saving}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Save size={18} />
                <span>{saving ? 'جاري الحفظ...' : 'حفظ التعديلات ونشرها'}</span>
              </button>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}
