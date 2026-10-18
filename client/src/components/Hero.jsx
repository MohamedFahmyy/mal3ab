import React from 'react';
import { Search, ShieldCheck, Clock } from 'lucide-react';

export default function Hero({ settings = {}, filters, setFilters, onSearch }) {
  const today = new Date().toISOString().split('T')[0];

  const slogan = settings.slogan || 'المنصة رقم #1 لحجز ملاعب كرة القدم في مصر';
  const heroTitle = settings.heroTitle || 'احجز ملعبك ولعبتك تبدأ في دقيقة ⚽';
  const heroSubtitle = settings.heroSubtitle || 'اختر أفضل الملاعب الخماسية والسباعية القريبة منك، قارن الأسعار والتقييمات، وأكّد حجزك أونلاين بضغطة واحدة.';
  const emoji = settings.logoEmoji || '⚽';

  return (
    <section id="hero" style={{
      background: 'linear-gradient(135deg, #061e12 0%, #0c4228 55%, #11834b 100%)',
      color: '#ffffff',
      padding: '45px 0 60px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Decorative Pitch Lines */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-5%',
        width: '350px',
        height: '350px',
        border: '40px solid rgba(255,255,255,0.03)',
        borderRadius: '50%',
        pointerEvents: 'none'
      }} />

      <div className="container hero-grid" style={{
        display: 'grid',
        gridTemplateColumns: '1.1fr 0.9fr',
        gap: '40px',
        alignItems: 'center'
      }}>
        {/* Hero Left Content */}
        <div>
          <div className="badge" style={{ marginBottom: '14px', maxWidth: '100%' }}>
            <span>{emoji}</span>
            <span style={{ fontSize: '12px' }}>{slogan}</span>
          </div>

          <h1 className="hero-title" style={{
            fontSize: '44px',
            lineHeight: '1.25',
            fontWeight: '900',
            marginBottom: '14px',
            whiteSpace: 'pre-line'
          }}>
            {heroTitle}
          </h1>

          <p style={{
            fontSize: '16px',
            color: '#d6e6dd',
            lineHeight: '1.7',
            marginBottom: '24px',
            maxWidth: '540px'
          }}>
            {heroSubtitle}
          </p>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#c4dcce' }}>
              <ShieldCheck size={18} color="var(--accent-lime)" />
              <span>تأكيد حجز فورى 100%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#c4dcce' }}>
              <Clock size={18} color="var(--accent-lime)" />
              <span>مواعيد متاحة ليل نهار</span>
            </div>
          </div>
        </div>

        {/* Hero Right Quick Search Box */}
        <div style={{
          background: '#ffffff',
          color: 'var(--text-dark)',
          borderRadius: '20px',
          padding: '22px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div style={{
            fontWeight: '900',
            fontSize: '18px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--dark)'
          }}>
            <Search size={20} color="var(--primary)" />
            <span>ابحث عن ملعبك المفضل</span>
          </div>

          <div className="hero-card-fields" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Area */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>المحافظة / المنطقة</label>
              <select
                className="form-select"
                value={filters.area || 'الكل'}
                onChange={(e) => setFilters({ ...filters, area: e.target.value })}
              >
                <option value="الكل">كل المناطق</option>
                <option value="مدينة نصر">مدينة نصر</option>
                <option value="التجمع الخامس">التجمع الخامس</option>
                <option value="المعادي">المعادي</option>
                <option value="6 أكتوبر">6 أكتوبر</option>
                <option value="الشيخ زايد">الشيخ زايد</option>
                <option value="الهرم">الهرم</option>
                <option value="سموحة">الإسكندرية - سموحة</option>
              </select>
            </div>

            {/* Type */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>نوع الملعب</label>
              <select
                className="form-select"
                value={filters.type || 'الكل'}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="الكل">جميع الأنواع</option>
                <option value="ملعب خماسي">ملعب خماسي (5v5)</option>
                <option value="ملعب سباعي">ملعب سباعي (7v7)</option>
                <option value="ملعب قانوني">ملعب قانوني (11v11)</option>
              </select>
            </div>

            {/* Date */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>التاريخ</label>
              <input
                type="date"
                className="form-input"
                min={today}
                value={filters.date || today}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              />
            </div>

            {/* Hours */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>مدة اللعب</label>
              <select
                className="form-select"
                value={filters.hours || 1}
                onChange={(e) => setFilters({ ...filters, hours: Number(e.target.value) })}
              >
                <option value={1}>ساعة واحدة</option>
                <option value={2}>ساعتين</option>
                <option value={3}>3 ساعات</option>
              </select>
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={onSearch}
            style={{
              width: '100%',
              marginTop: '16px',
              padding: '14px',
              fontSize: '15px',
              fontWeight: 800
            }}
          >
            <Search size={18} />
            <span>استكشف الملاعب المتاحة</span>
          </button>
        </div>
      </div>
    </section>
  );
}
