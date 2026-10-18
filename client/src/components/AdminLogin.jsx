import React, { useState, useEffect } from 'react';
import { User, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { adminLogin, fetchSettings } from '../utils/api';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({ title: 'مَلعبك', logoUrl: '', logoEmoji: '⚽' });

  useEffect(() => {
    fetchSettings().then(res => {
      if (res.success && res.data) {
        setSettings(res.data);
      }
    });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await adminLogin(username, password);
      if (res.success && res.data) {
        localStorage.setItem('malaeb_admin', 'true');
        localStorage.setItem('malaeb_admin_user', JSON.stringify(res.data));
        window.location.href = '/admin';
      } else {
        // Fallback for offline / demo
        if (username === 'admin' && password === 'admin') {
          const fallbackUser = {
            id: 'user-admin',
            name: 'مدير النظام (Admin)',
            username: 'admin',
            role: 'superadmin',
            permissions: ['quick_booking', 'manage_bookings', 'manage_customers', 'manage_pitches', 'manage_finances', 'manage_settings', 'manage_users']
          };
          localStorage.setItem('malaeb_admin', 'true');
          localStorage.setItem('malaeb_admin_user', JSON.stringify(fallbackUser));
          window.location.href = '/admin';
          return;
        }
        setError(res.message || 'بيانات الدخول غير صحيحة');
      }
    } catch {
      setError('تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-page)',
      direction: 'rtl'
    }}>
      <div style={{
        background: '#fff',
        padding: '40px',
        borderRadius: '20px',
        boxShadow: 'var(--shadow-md)',
        width: 'min(420px, 92%)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            fontSize: '32px',
            fontWeight: 900,
            color: 'var(--dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '8px'
          }}>
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.title} style={{ maxHeight: '48px', maxWidth: '160px', objectFit: 'contain' }} />
            ) : null}
            <span>{settings.title || 'مَلعبك'}</span>
            {!settings.logoUrl && <span style={{ color: 'var(--primary)' }}>{settings.logoEmoji || '⚽'}</span>}
          </div>
          <h1 style={{ fontSize: '18px', color: 'var(--text-muted)' }}>تسجيل دخول لوحة التحكم الإدارية</h1>
        </div>

        {error && (
          <div style={{
            background: '#fde8e8',
            color: '#b91c1c',
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '700',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>اسم المستخدم</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                style={{ paddingRight: '40px' }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <User size={18} color="var(--text-muted)" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label>كلمة المرور</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="form-input"
                style={{ paddingRight: '40px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ width: '100%', padding: '14px', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spin" />
                <span>جاري التحقق والدخول...</span>
              </>
            ) : (
              <>
                <span>دخول للوحة التحكم</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <a href="/" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '14px', fontWeight: '700' }}>
            العودة للصفحة الرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}
