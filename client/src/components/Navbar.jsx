import React, { useState, useEffect } from 'react';
import { Calendar, User, PlusCircle, Search, Menu, X, LogOut, Clock } from 'lucide-react';
import { getTimeFormat, setTimeFormat } from '../utils/timeFormat';

export default function Navbar({
  settings = {},
  user,
  onOpenLogin,
  onLogout,
  onOpenMyBookings,
  onOpenRegisterPitch,
  onScrollToPitches,
  onScrollToHow
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [timeFormat, setTimeFormatState] = useState(getTimeFormat());

  useEffect(() => {
    const handleFormatChange = (e) => setTimeFormatState(e.detail);
    window.addEventListener('timeFormatChanged', handleFormatChange);
    return () => window.removeEventListener('timeFormatChanged', handleFormatChange);
  }, []);

  const siteTitle = settings.title || 'مَلعبك';
  const siteLogo = settings.logoUrl;
  const siteEmoji = settings.logoEmoji || '⚽';

  return (
    <header style={{
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid #e7ece8',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div className="container" style={{
        height: '76px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px'
      }}>
        {/* Brand Logo */}
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{
            fontSize: '26px',
            fontWeight: 900,
            color: 'var(--dark)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {siteLogo ? (
            <img 
              src={siteLogo} 
              alt={siteTitle} 
              style={{ maxHeight: '42px', maxWidth: '140px', objectFit: 'contain' }} 
            />
          ) : null}
          <span>{siteTitle}</span>
          {!siteLogo && <span style={{ color: 'var(--primary)' }}>{siteEmoji}</span>}
        </div>

        {/* Desktop Nav Links */}
        <nav style={{
          display: 'flex',
          gap: '28px',
          alignItems: 'center',
          fontWeight: 600,
          fontSize: '15px'
        }} className="desktop-nav">
          <a href="#hero" style={{ textDecoration: 'none', color: 'var(--text-dark)' }}>الرئيسية</a>
          <a href="#pitches" onClick={(e) => { e.preventDefault(); onScrollToPitches(); }} style={{ textDecoration: 'none', color: 'var(--text-muted)' }}>الملاعب</a>
          <a href="#how" onClick={(e) => { e.preventDefault(); onScrollToHow(); }} style={{ textDecoration: 'none', color: 'var(--text-muted)' }}>كيف تحجز؟</a>
          <button
            onClick={onOpenRegisterPitch}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '15px'
            }}
          >
            <PlusCircle size={17} />
            <span>سجّل ملعبك</span>
          </button>
        </nav>

        {/* User Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="desktop-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* 12h / 24h Time Switcher */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#f1f5f2',
              borderRadius: '20px',
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
                  borderRadius: '14px',
                  fontSize: '11px',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
                title="عرض المواعيد بنظام 12 ساعة (ص / م)"
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
                  borderRadius: '14px',
                  fontSize: '11px',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
                title="عرض المواعيد بنظام 24 ساعة"
              >
                24 س
              </button>
            </div>

            <button
              className="btn btn-light"
              onClick={onOpenMyBookings}
              style={{ padding: '10px 18px', fontSize: '14px' }}
            >
              <Calendar size={17} />
              <span>حجوزاتي</span>
            </button>

            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  background: '#eaf7f0',
                  padding: '8px 14px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <User size={16} />
                  <span>{user.phone}</span>
                </div>
                <button
                  className="btn btn-outline"
                  onClick={onLogout}
                  title="تسجيل الخروج"
                  style={{ padding: '8px 12px', fontSize: '13px', color: '#dc2626', borderColor: '#fca5a5' }}
                >
                  <LogOut size={16} />
                  <span>خروج</span>
                </button>
              </div>
            ) : (
              <button
                className="btn btn-primary"
                onClick={onOpenLogin}
                style={{ padding: '10px 20px', fontSize: '14px' }}
              >
                <User size={17} />
                <span>تسجيل الدخول</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'none',
              padding: '6px'
            }}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div style={{
          background: '#ffffff',
          borderBottom: '1px solid var(--border)',
          padding: '16px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          fontWeight: 700
        }}>
          <a href="#hero" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none', color: 'var(--text-dark)' }}>الرئيسية</a>
          <a href="#pitches" onClick={() => { onScrollToPitches(); setMobileMenuOpen(false); }} style={{ textDecoration: 'none', color: 'var(--text-dark)' }}>الملاعب المتاحة</a>
          <a href="#how" onClick={() => { onScrollToHow(); setMobileMenuOpen(false); }} style={{ textDecoration: 'none', color: 'var(--text-dark)' }}>كيف تحجز؟</a>
          
          <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }}></div>
          
          <button onClick={() => { onOpenMyBookings(); setMobileMenuOpen(false); }} style={{ background: 'none', border: 'none', color: 'var(--text-dark)', textAlign: 'right', fontWeight: 700, fontSize: '16px' }}>
            حجوزاتي
          </button>
          <button onClick={() => { onOpenRegisterPitch(); setMobileMenuOpen(false); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', textAlign: 'right', fontWeight: 700, fontSize: '16px' }}>
            + ضيف ملعبك على المنصة
          </button>
          {user ? (
            <button onClick={() => { onLogout(); setMobileMenuOpen(false); }} style={{ background: 'none', border: 'none', color: '#dc2626', textAlign: 'right', fontWeight: 700, fontSize: '16px' }}>
              تسجيل الخروج (Logout)
            </button>
          ) : (
            <button onClick={() => { onOpenLogin(); setMobileMenuOpen(false); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', textAlign: 'right', fontWeight: 700, fontSize: '16px' }}>
              تسجيل الدخول
            </button>
          )}
        </div>
      )}
    </header>
  );
}
