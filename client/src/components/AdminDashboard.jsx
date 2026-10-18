import React, { useState, useEffect } from 'react';
import { 
  Users, CalendarCheck, MapPin, LogOut, Search, Activity, Plus, Trash2, 
  Edit, Download, DollarSign, Eye, AlertCircle, CheckCircle, Tag,
  Palette, Shield, User
} from 'lucide-react';
import { fetchBookings, fetchPitches, cancelBooking, deletePitch, fetchSettings } from '../utils/api';
import AdminQuickBooking from './AdminQuickBooking';
import AdminFinancesTab from './AdminFinancesTab';
import AdminCustomersTab from './AdminCustomersTab';
import AdminSettingsTab from './AdminSettingsTab';
import AdminUsersTab from './AdminUsersTab';
import AdminAddPitchModal from './AdminAddPitchModal';
import AdminEditPitchModal from './AdminEditPitchModal';
import AdminBookingDetailModal from './AdminBookingDetailModal';
import RecordPaymentModal from './RecordPaymentModal';
import Toast from './Toast';
import { getTimeFormat, setTimeFormat, formatSlotTime } from '../utils/timeFormat';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('quick'); // 'quick' | 'bookings' | 'customers' | 'pitches' | 'finances' | 'settings' | 'users'
  const [toast, setToast] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [showAddPitchModal, setShowAddPitchModal] = useState(false);
  const [editingPitch, setEditingPitch] = useState(null);
  const [timeFormat, setTimeFormatState] = useState(getTimeFormat());

  // Logged-in admin user and site settings
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const saved = localStorage.getItem('malaeb_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [siteSettings, setSiteSettings] = useState({ title: 'مَلعبك', logoUrl: '', logoEmoji: '⚽' });

  // Data states
  const [bookings, setBookings] = useState([]);
  const [pitches, setPitches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals for bookings
  const [viewBookingId, setViewBookingId] = useState(null);
  const [paymentBooking, setPaymentBooking] = useState(null);

  const hasPerm = (perm) => {
    if (!adminUser) return true;
    if (adminUser.role === 'superadmin') return true;
    const perms = Array.isArray(adminUser.permissions) ? adminUser.permissions : [];
    return perms.includes(perm);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setRefresh(prev => prev + 1);
  };

  const loadDashboardData = async () => {
    setLoading(true);
    const [bRes, pRes, sRes] = await Promise.all([
      fetchBookings(),
      fetchPitches(),
      fetchSettings()
    ]);
    if (bRes.success) setBookings(bRes.data || []);
    if (pRes.success) setPitches(pRes.data || []);
    if (sRes.success && sRes.data) setSiteSettings(sRes.data);
    setLoading(false);
  };

  useEffect(() => {
    const isAdmin = localStorage.getItem('malaeb_admin');
    if (!isAdmin) {
      window.location.href = '/admin-login';
    }
    loadDashboardData();

    const handleTimeFormatChange = (e) => {
      setTimeFormatState(e.detail);
    };
    window.addEventListener('timeFormatChanged', handleTimeFormatChange);
    return () => window.removeEventListener('timeFormatChanged', handleTimeFormatChange);
  }, [refresh]);

  // Ensure user is on a permitted tab
  useEffect(() => {
    const permMap = {
      quick: 'quick_booking',
      bookings: 'manage_bookings',
      customers: 'manage_customers',
      pitches: 'manage_pitches',
      finances: 'manage_finances',
      settings: 'manage_settings',
      users: 'manage_users'
    };

    if (adminUser && !hasPerm(permMap[activeTab])) {
      const order = ['quick', 'bookings', 'customers', 'pitches', 'finances', 'settings', 'users'];
      const firstAllowed = order.find(t => hasPerm(permMap[t])) || 'quick';
      setActiveTab(firstAllowed);
    }
  }, [adminUser]);

  const handleLogout = () => {
    localStorage.removeItem('malaeb_admin');
    window.location.href = '/admin-login';
  };

  const handleDeletePitch = async (id, name) => {
    if (!window.confirm(`هل أنت متأكد من حذف ملعب "${name}" نهائياً؟\n⚠️ سيتم حذف هذا الملعب مع الحجوزات المرتبطة به.`)) return;
    const res = await deletePitch(id);
    if (res.success) {
      showToast('تم حذف الملعب بنجاح');
      loadDashboardData();
    } else {
      alert(res.message || 'تعذر حذف الملعب');
    }
  };

  const handleCancelBooking = async (id) => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذا الحجز؟')) return;
    const res = await cancelBooking(id);
    if (res.success) {
      showToast('تم إلغاء الحجز بنجاح مع الحفاظ على البيانات');
      loadDashboardData();
    } else {
      alert(res.message || 'تعذر إلغاء الحجز');
    }
  };

  const handleExportExcel = () => {
    // Generate CSV string with new financial & customer fields
    const headers = [
      'كود الحجز', 
      'اسم العميل', 
      'رقم الهاتف', 
      'اسم الملعب', 
      'التاريخ', 
      'المواعيد', 
      'إجمالي قبل الخصم',
      'قيمة الخصم',
      'صافي المطلوب',
      'المبلغ المدفوع',
      'المبلغ المتبقي',
      'حالة الدفع',
      'حالة الحجز',
      'طريقة الدفع'
    ];

    const rows = bookings.map(b => {
      const payStatusLabel = b.paymentStatus === 'paid' ? 'مدفوع بالكامل' : b.paymentStatus === 'partial' ? 'مدفوع جزئياً' : 'غير مدفوع';
      return [
        b.id,
        `"${b.customerName || 'عميل غير مسجل'}"`,
        `"${b.customerPhone || ''}"`,
        `"${b.pitchName || ''}"`,
        b.date,
        `"${b.timeSlots?.join(' و ') || ''}"`,
        b.totalAmount || 0,
        b.discountAmount || 0,
        b.netAmount || b.totalAmount || 0,
        b.paidAmount || 0,
        b.remainingAmount || 0,
        payStatusLabel,
        b.status === 'cancelled' || b.status === 'ملغي' ? 'ملغي' : 'مؤكد',
        b.paymentMethod === 'vodafone' ? 'فودافون كاش' : b.paymentMethod === 'card' ? 'فيزا' : 'كاش'
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + 
      headers.join(',') + '\n' + 
      rows.map(e => e.join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `malaeb_bookings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('تم تصدير ملف الإكسل بنجاح 📊');
  };

  // KPI Calculations
  const validBookings = bookings.filter(b => b.status !== 'cancelled' && b.status !== 'ملغي');
  const totalCollectedRevenue = validBookings.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
  const totalDueDebt = validBookings.reduce((sum, b) => sum + (b.remainingAmount || 0), 0);

  // Filtered Bookings for Table
  const filteredBookings = bookings.filter(b => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      b.id?.toLowerCase().includes(q) ||
      b.customerName?.toLowerCase().includes(q) ||
      b.customerPhone?.includes(q) ||
      b.pitchName?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', direction: 'rtl' }}>
      {/* Admin Sidebar & Header wrapper */}
      <header style={{
        background: 'var(--dark)',
        color: '#fff',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '22px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {siteSettings.logoUrl ? (
              <img src={siteSettings.logoUrl} alt="Logo" style={{ maxHeight: '32px', maxWidth: '100px', objectFit: 'contain' }} />
            ) : null}
            <span>لوحة تحكم {siteSettings.title || 'مَلعبك'}</span>
            {!siteSettings.logoUrl && <span style={{ color: 'var(--accent-lime)' }}>{siteSettings.logoEmoji || '⚽'}</span>}
          </div>
          
          <nav style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {hasPerm('quick_booking') && (
              <button 
                onClick={() => setActiveTab('quick')}
                style={{
                  background: activeTab === 'quick' ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: activeTab === 'quick' ? 'var(--accent-lime)' : '#c2dcd0',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={17} />
                حجز سريع
              </button>
            )}

            {hasPerm('manage_bookings') && (
              <button 
                onClick={() => setActiveTab('bookings')}
                style={{
                  background: activeTab === 'bookings' ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: activeTab === 'bookings' ? 'var(--accent-lime)' : '#c2dcd0',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <CalendarCheck size={17} />
                الحجوزات
              </button>
            )}

            {hasPerm('manage_customers') && (
              <button 
                onClick={() => setActiveTab('customers')}
                style={{
                  background: activeTab === 'customers' ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: activeTab === 'customers' ? 'var(--accent-lime)' : '#c2dcd0',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Users size={17} />
                العملاء
              </button>
            )}

            {hasPerm('manage_pitches') && (
              <button 
                onClick={() => setActiveTab('pitches')}
                style={{
                  background: activeTab === 'pitches' ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: activeTab === 'pitches' ? 'var(--accent-lime)' : '#c2dcd0',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <MapPin size={17} />
                الملاعب
              </button>
            )}

            {hasPerm('manage_finances') && (
              <button 
                onClick={() => setActiveTab('finances')}
                style={{
                  background: activeTab === 'finances' ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: activeTab === 'finances' ? 'var(--accent-lime)' : '#c2dcd0',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <DollarSign size={17} />
                الماليات
              </button>
            )}

            {hasPerm('manage_settings') && (
              <button 
                onClick={() => setActiveTab('settings')}
                style={{
                  background: activeTab === 'settings' ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: activeTab === 'settings' ? 'var(--accent-lime)' : '#c2dcd0',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Palette size={17} />
                الهوية والإعدادات
              </button>
            )}

            {hasPerm('manage_users') && (
              <button 
                onClick={() => setActiveTab('users')}
                style={{
                  background: activeTab === 'users' ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: activeTab === 'users' ? 'var(--accent-lime)' : '#c2dcd0',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Shield size={17} />
                المستخدمين والصلاحيات
              </button>
            )}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {/* User profile pill */}
          {adminUser && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255,255,255,0.08)',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '13px'
            }}>
              <User size={15} color="var(--accent-lime)" />
              <span style={{ fontWeight: 800 }}>{adminUser.name || adminUser.username}</span>
              <span style={{
                background: adminUser.role === 'superadmin' ? 'var(--accent-lime)' : 'rgba(255,255,255,0.15)',
                color: adminUser.role === 'superadmin' ? '#000' : '#fff',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 800
              }}>
                {adminUser.role === 'superadmin' ? 'مدير عام' : 
                 adminUser.role === 'booking_agent' ? 'حجوزات' :
                 adminUser.role === 'accountant' ? 'محاسب' : 'مشرف'}
              </span>
            </div>
          )}

          {/* 12h / 24h Time Format Switcher */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '3px',
            border: '1px solid rgba(255,255,255,0.15)'
          }}>
            <button
              onClick={() => setTimeFormat('12h')}
              style={{
                background: timeFormat === '12h' ? 'var(--accent-lime)' : 'transparent',
                color: timeFormat === '12h' ? '#000' : '#fff',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer'
              }}
              title="عرض الساعات بنظام 12 ساعة (ص / م)"
            >
              12 ساعة
            </button>
            <button
              onClick={() => setTimeFormat('24h')}
              style={{
                background: timeFormat === '24h' ? 'var(--accent-lime)' : 'transparent',
                color: timeFormat === '24h' ? '#000' : '#fff',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer'
              }}
              title="عرض الساعات بنظام 24 ساعة"
            >
              24 ساعة
            </button>
          </div>

          <a href="/" style={{ color: '#fff', textDecoration: 'none', fontSize: '13px', fontWeight: '700', opacity: 0.9 }}>
            زيارة الموقع
          </a>
          <button 
            onClick={handleLogout}
            style={{
              background: 'rgba(220, 38, 38, 0.2)',
              color: '#fca5a5',
              border: '1px solid rgba(220, 38, 38, 0.4)',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <LogOut size={16} />
            خروج
          </button>
        </div>
      </header>

      <main className="container" style={{ padding: '30px 0' }}>
        {/* KPI Stats Banner */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '30px'
        }}>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '700', fontSize: '13px' }}>
              <CalendarCheck size={18} color="var(--primary)" />
              إجمالي الحجوزات
            </div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--dark)' }}>
              {validBookings.length}
            </div>
          </div>
          
          <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '700', fontSize: '13px' }}>
              <Activity size={18} color="#10b981" />
              المبالغ المحصلة فعلياً
            </div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#10b981' }}>
              {totalCollectedRevenue.toLocaleString()} ج.م
            </div>
          </div>

          <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '700', fontSize: '13px' }}>
              <AlertCircle size={18} color="#dc2626" />
              المبالغ المتبقية (الديون)
            </div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#dc2626' }}>
              {totalDueDebt.toLocaleString()} ج.م
            </div>
          </div>

          <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '700', fontSize: '13px' }}>
              <MapPin size={18} color="var(--accent-amber)" />
              الملاعب المتاحة
            </div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--dark)' }}>
              {pitches.length}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--dark)', margin: 0 }}>
              {activeTab === 'bookings' ? 'إدارة الحجوزات والمدفوعات' : 
               activeTab === 'quick' ? 'إضافة حجز سريع وجدول المواعيد' : 
               activeTab === 'customers' ? 'نظام إدارة العملاء (CRM)' :
               activeTab === 'finances' ? 'التقارير المالية والمصروفات' :
               activeTab === 'settings' ? 'إعدادات وهوية المنصة والشعار' :
               activeTab === 'users' ? 'إدارة المستخدمين والصلاحيات' : 'إدارة الملاعب'}
            </h2>

            {activeTab === 'bookings' && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', width: '220px' }}>
                  <input 
                    type="text" 
                    placeholder="بحث بالحجز أو العميل..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-input"
                    style={{ paddingRight: '36px', width: '100%', fontSize: '13px' }}
                  />
                  <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
                <button 
                  onClick={handleExportExcel}
                  style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}
                >
                  <Download size={16} /> تصدير Excel
                </button>
              </div>
            )}

            {activeTab === 'pitches' && hasPerm('manage_pitches') && (
              <button 
                onClick={() => setShowAddPitchModal(true)}
                style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}
              >
                <Plus size={16} /> إضافة ملعب
              </button>
            )}
          </div>

          {/* Tab Contents */}
          {activeTab === 'quick' ? (
            <AdminQuickBooking showToast={showToast} />
          ) : activeTab === 'customers' ? (
            <AdminCustomersTab showToast={showToast} />
          ) : activeTab === 'finances' ? (
            <AdminFinancesTab showToast={showToast} />
          ) : activeTab === 'settings' ? (
            <AdminSettingsTab showToast={showToast} />
          ) : activeTab === 'users' ? (
            <AdminUsersTab currentUser={adminUser} showToast={showToast} />
          ) : activeTab === 'bookings' ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-page)', borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '13px' }}>كود الحجز</th>
                    <th style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '13px' }}>العميل</th>
                    <th style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '13px' }}>الملعب</th>
                    <th style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '13px' }}>الموعد</th>
                    <th style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '13px' }}>الصافي بعد الخصم</th>
                    <th style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '13px' }}>المدفوع / المتبقي</th>
                    <th style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '13px' }}>حالة الدفع</th>
                    <th style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '13px' }}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        لا توجد حجوزات مسجلة
                      </td>
                    </tr>
                  ) : filteredBookings.map((b) => {
                    const isCancelled = b.status === 'cancelled' || b.status === 'ملغي';
                    return (
                      <tr key={b.id} style={{ borderBottom: '1px solid var(--border)', opacity: isCancelled ? 0.6 : 1 }}>
                        <td style={{ padding: '12px', fontWeight: '800', color: isCancelled ? '#dc2626' : 'var(--primary)' }}>
                          {b.id}
                          {isCancelled && <span style={{ display: 'block', fontSize: '10px', color: '#dc2626' }}>(ملغي)</span>}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: '800' }}>{b.customerName || 'عميل غير مسجل'}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{b.customerPhone}</div>
                        </td>
                        <td style={{ padding: '12px', fontWeight: '600' }}>{b.pitchName}</td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: '700' }}>{b.date}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{b.timeSlots?.join(' , ')}</div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: '800', fontSize: '14px' }}>{b.netAmount || b.totalAmount} ج.م</div>
                          {b.discountAmount > 0 && (
                            <div style={{ fontSize: '11px', color: '#d97706', fontWeight: '700' }}>
                              خصم: -{b.discountAmount} ج.م
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ color: '#10b981', fontWeight: '800', fontSize: '13px' }}>
                            مدفوع: {b.paidAmount || 0} ج.م
                          </div>
                          <div style={{ color: b.remainingAmount > 0 ? '#dc2626' : '#10b981', fontWeight: '800', fontSize: '12px' }}>
                            متبقي: {b.remainingAmount || 0} ج.م
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          {b.paymentStatus === 'paid' ? (
                            <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' }}>
                              مدفوع بالكامل
                            </span>
                          ) : b.paymentStatus === 'partial' ? (
                            <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' }}>
                              مدفوع جزئياً
                            </span>
                          ) : (
                            <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' }}>
                              غير مدفوع
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {b.remainingAmount > 0 && !isCancelled && hasPerm('manage_finances') && (
                              <button
                                onClick={() => setPaymentBooking(b)}
                                title="تسجيل دفعة سداد"
                                style={{
                                  background: '#10b981',
                                  color: '#fff',
                                  border: 'none',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  cursor: 'pointer'
                                }}
                              >
                                سداد دفعة
                              </button>
                            )}
                            <button 
                              onClick={() => setViewBookingId(b.id)}
                              title="عرض تفاصيل الحجز"
                              style={{ background: '#f0f5f2', border: 'none', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', color: 'var(--primary)' }}
                            >
                              <Eye size={16} />
                            </button>
                            {!isCancelled && hasPerm('manage_bookings') && (
                              <button 
                                onClick={() => handleCancelBooking(b.id)}
                                title="إلغاء الحجز"
                                style={{ background: '#fde8e8', border: 'none', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', color: '#dc2626' }}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Pitches Management Table */
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-page)', borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '14px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '14px' }}>اسم الملعب</th>
                    <th style={{ padding: '14px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '14px' }}>المنطقة</th>
                    <th style={{ padding: '14px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '14px' }}>النوع</th>
                    <th style={{ padding: '14px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '14px' }}>السعر/ساعة</th>
                    <th style={{ padding: '14px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '14px' }}>ساعات العمل</th>
                    <th style={{ padding: '14px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '14px' }}>هاتف الملعب</th>
                    <th style={{ padding: '14px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '14px' }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {pitches.map((p, i) => {
                    const slotsCount = Array.isArray(p.availableSlots) ? p.availableSlots.length : 0;
                    const slotsSummary = slotsCount > 0 
                      ? `${slotsCount} ساعة (${formatSlotTime(p.availableSlots[0], timeFormat)} - ${formatSlotTime(p.availableSlots[slotsCount - 1], timeFormat)})`
                      : '24 ساعة (افتراضي)';

                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '14px', fontWeight: '800' }}>{p.nameAr || p.name}</td>
                        <td style={{ padding: '14px', color: 'var(--text-muted)' }}>{p.area} - {p.city}</td>
                        <td style={{ padding: '14px' }}>
                          <span style={{ background: '#f0f5f2', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>
                            {p.type}
                          </span>
                        </td>
                        <td style={{ padding: '14px', fontWeight: '800', color: 'var(--primary)' }}>{p.pricePerHour} ج.م</td>
                        <td style={{ padding: '14px', fontSize: '13px', fontWeight: '700', color: '#0f766e' }}>
                          <span style={{ background: '#f0fdfa', border: '1px solid #ccfbf1', padding: '3px 8px', borderRadius: '6px' }}>
                            ⏰ {slotsSummary}
                          </span>
                        </td>
                        <td style={{ padding: '14px', color: 'var(--text-muted)' }}>{p.ownerPhone}</td>
                        <td style={{ padding: '14px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {hasPerm('manage_pitches') ? (
                              <>
                                <button
                                  onClick={() => setEditingPitch(p)}
                                  title="تعديل بيانات وساعات الملعب"
                                  style={{
                                    background: '#f0fdf4',
                                    border: '1px solid #bbf7d0',
                                    color: '#16a34a',
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '12px',
                                    fontWeight: '800'
                                  }}
                                >
                                  <Edit size={14} />
                                  تعديل
                                </button>
                                <button
                                  onClick={() => handleDeletePitch(p.id, p.nameAr || p.name)}
                                  title="حذف الملعب نهائياً"
                                  style={{
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    color: '#dc2626',
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '12px',
                                    fontWeight: '800'
                                  }}
                                >
                                  <Trash2 size={14} />
                                  حذف
                                </button>
                              </>
                            ) : (
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>عرض فقط</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add Pitch Modal */}
      {showAddPitchModal && (
        <AdminAddPitchModal 
          onClose={() => setShowAddPitchModal(false)}
          onSuccess={(newPitch) => {
            setShowAddPitchModal(false);
            showToast('تم إضافة الملعب بنجاح! 🎉');
            loadDashboardData();
          }}
        />
      )}

      {/* Edit Pitch Modal */}
      {editingPitch && (
        <AdminEditPitchModal
          pitch={editingPitch}
          onClose={() => setEditingPitch(null)}
          onSuccess={(updatedPitch) => {
            setEditingPitch(null);
            showToast('تم تعديل بيانات الملعب وساعات العمل بنجاح! 🎉');
            loadDashboardData();
          }}
        />
      )}

      {/* Booking Details Modal */}
      {viewBookingId && (
        <AdminBookingDetailModal
          bookingId={viewBookingId}
          onClose={() => setViewBookingId(null)}
          onUpdated={() => {
            loadDashboardData();
          }}
        />
      )}

      {/* Record Payment Modal */}
      {paymentBooking && (
        <RecordPaymentModal
          booking={paymentBooking}
          onClose={() => setPaymentBooking(null)}
          onSuccess={() => {
            setPaymentBooking(null);
            showToast('تم تسجيل الدفعة بنجاح! 💵');
            loadDashboardData();
          }}
        />
      )}
      
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
