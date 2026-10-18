import React from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';

export default function Footer({ settings = {} }) {
  const siteTitle = settings.title || 'مَلعبك';
  const siteLogo = settings.logoUrl;
  const siteEmoji = settings.logoEmoji || '⚽';
  const footerAbout = settings.footerAbout || 'المنصة الأولى المخصصة لحجز ملاعب كرة القدم في مصر. نهدف لتسهيل تجربة حجز الملاعب للاعبين وأصحاب الملاعب بأحدث التقنيات.';
  const contactPhone = settings.contactPhone || '19989';
  const contactEmail = settings.contactEmail || 'support@malaeb.eg';

  return (
    <footer style={{
      background: '#06170e',
      color: '#9cb5a7',
      padding: '50px 0 30px',
      borderTop: '1px solid #112d1e'
    }}>
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '35px',
          marginBottom: '40px'
        }}>
          {/* Col 1: About */}
          <div>
            <div style={{ fontSize: '24px', fontWeight: '900', color: '#ffffff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {siteLogo ? (
                <img src={siteLogo} alt={siteTitle} style={{ maxHeight: '36px', maxWidth: '120px', objectFit: 'contain' }} />
              ) : null}
              <span>{siteTitle}</span>
              {!siteLogo && <span style={{ color: 'var(--primary)' }}>{siteEmoji}</span>}
            </div>
            <p style={{ fontSize: '14px', lineHeight: '1.8' }}>
              {footerAbout}
            </p>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4 style={{ color: '#ffffff', fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>روابط سريعة</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
              <li><a href="#hero" style={{ color: 'inherit', textDecoration: 'none' }}>الرئيسية</a></li>
              <li><a href="#pitches" style={{ color: 'inherit', textDecoration: 'none' }}>ملاعب القاهرة والجيزة</a></li>
              <li><a href="#how" style={{ color: 'inherit', textDecoration: 'none' }}>كيفية الحجز</a></li>
            </ul>
          </div>

          {/* Col 3: Popular Cities */}
          <div>
            <h4 style={{ color: '#ffffff', fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>أشهر المناطق</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
              <li>ملاعب مدينة نصر</li>
              <li>ملاعب التجمع الخامس</li>
              <li>ملاعب 6 أكتوبر والشيخ زايد</li>
              <li>ملاعب المعادي والهرم</li>
            </ul>
          </div>

          {/* Col 4: Contact */}
          <div>
            <h4 style={{ color: '#ffffff', fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>خدمة العملاء</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={16} color="var(--primary)" />
                <span>الخط الساخن: {contactPhone} (24/7)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={16} color="var(--primary)" />
                <span>{contactEmail}</span>
              </div>
            </div>
          </div>
        </div>

        <hr style={{ border: 0, borderTop: '1px solid #112d1e', margin: '20px 0' }} />

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '13px'
        }}>
          <div>جميع الحقوق محفوظة © 2026 — منصة مَلعبك ⚽</div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span>صُنع بشغف للاعبي كرة القدم في مصر 🇪🇬</span>
            <span style={{ fontWeight: '800', color: 'var(--accent-lime)' }}>Powered By AT LOOPS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
