import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Shield, ShieldCheck, Check, X, Edit, Trash2, 
  Lock, CheckSquare, Square, AlertCircle, Key, UserCheck, UserX
} from 'lucide-react';
import { fetchAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser } from '../utils/api';

const ALL_PERMISSIONS = [
  { id: 'quick_booking', label: 'حجز سريع', desc: 'إجراء حجوزات سريعة وتسجيل العربون', icon: '⚡' },
  { id: 'manage_bookings', label: 'إدارة الحجوزات', desc: 'عرض تفاصيل الحجوزات وإلغاء الحجز', icon: '📅' },
  { id: 'manage_customers', label: 'إدارة العملاء (CRM)', desc: 'إدارة بيانات العملاء، الحالات والملاحظات', icon: '👥' },
  { id: 'manage_pitches', label: 'إدارة الملاعب', desc: 'إضافة ملاعب، تعديل الأسعار، المواعيد والحذف', icon: '🏟️' },
  { id: 'manage_finances', label: 'المالية والتحصيلات', desc: 'استعراض الإيرادات، تسجيل الدفعات وتصدير التقارير', icon: '💰' },
  { id: 'manage_settings', label: 'الهوية والإعدادات', desc: 'تعديل اسم الموقع، الشعار اللفظي واللوجو والبيانات', icon: '🎨' },
  { id: 'manage_users', label: 'المستخدمين والصلاحيات', desc: 'إضافة وتعديل المستخدمين وتخصيص الصلاحيات', icon: '🛡️' }
];

const ROLE_PRESETS = [
  {
    id: 'superadmin',
    name: 'مدير عام (Superadmin)',
    desc: 'كامل الصلاحيات دون قيود',
    perms: ['quick_booking', 'manage_bookings', 'manage_customers', 'manage_pitches', 'manage_finances', 'manage_settings', 'manage_users']
  },
  {
    id: 'booking_agent',
    name: 'مسؤول حجوزات واستقبال (Agent)',
    desc: 'الحجز السريع وإدارة الحجوزات وقاعدة العملاء',
    perms: ['quick_booking', 'manage_bookings', 'manage_customers']
  },
  {
    id: 'accountant',
    name: 'محاسب مالي (Accountant)',
    desc: 'إدارة الحجوزات والمالية والتحصيلات والتقارير',
    perms: ['manage_bookings', 'manage_finances']
  },
  {
    id: 'pitch_manager',
    name: 'مدير الملاعب (Pitch Manager)',
    desc: 'إدارة وتعديل الملاعب والأسعار والحجوزات',
    perms: ['manage_pitches', 'manage_bookings']
  },
  {
    id: 'custom',
    name: 'صلاحيات مخصصة (Custom)',
    desc: 'تحديد صلاحيات يدوي مخصص للمستخدم',
    perms: []
  }
];

export default function AdminUsersTab({ currentUser, showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Form states for Add / Edit
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'booking_agent',
    permissions: ['quick_booking', 'manage_bookings', 'manage_customers'],
    isActive: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadUsersList = async () => {
    setLoading(true);
    const res = await fetchAdminUsers();
    if (res.success && Array.isArray(res.data)) {
      setUsers(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsersList();
  }, []);

  const openAddModal = () => {
    setFormData({
      name: '',
      username: '',
      password: '',
      role: 'booking_agent',
      permissions: ['quick_booking', 'manage_bookings', 'manage_customers'],
      isActive: true
    });
    setFormError('');
    setShowAddModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      username: user.username || '',
      password: '', // leave empty unless changing
      role: user.role || 'custom',
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
      isActive: Boolean(user.isActive)
    });
    setFormError('');
  };

  const handlePresetSelect = (presetId) => {
    const preset = ROLE_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setFormData(prev => ({
        ...prev,
        role: presetId,
        permissions: presetId === 'custom' ? prev.permissions : [...preset.perms]
      }));
    }
  };

  const togglePermission = (permId) => {
    setFormData(prev => {
      const exists = prev.permissions.includes(permId);
      const newPerms = exists 
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId];
      return {
        ...prev,
        role: 'custom', // custom selection when manually modified
        permissions: newPerms
      };
    });
  };

  const selectAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      role: 'superadmin',
      permissions: ALL_PERMISSIONS.map(p => p.id)
    }));
  };

  const clearAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      role: 'custom',
      permissions: []
    }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim() || !formData.username.trim() || !formData.password.trim()) {
      setFormError('يرجى ملء جميع الحقول المطلوبة (الاسم، اسم المستخدم، وكلمة المرور)');
      return;
    }

    if (formData.permissions.length === 0) {
      if (!window.confirm('لم تحدد أي صلاحيات لهذا المستخدم. هل أنت متأكد من المتابعة؟')) return;
    }

    setSubmitting(true);
    const res = await createAdminUser(formData);
    setSubmitting(false);

    if (res.success) {
      showToast(`تم إنشاء المستخدم "${formData.name}" وتعيين صلاحياته بنجاح`);
      setShowAddModal(false);
      loadUsersList();
    } else {
      setFormError(res.message || 'فشل في إنشاء المستخدم');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setFormError('');

    if (!formData.name.trim() || !formData.username.trim()) {
      setFormError('الاسم واسم المستخدم مطلوبان');
      return;
    }

    setSubmitting(true);
    const updatePayload = {
      name: formData.name,
      username: formData.username,
      role: formData.role,
      permissions: formData.permissions,
      isActive: formData.isActive
    };
    if (formData.password.trim()) {
      updatePayload.password = formData.password.trim();
    }

    const res = await updateAdminUser(editingUser.id, updatePayload);
    setSubmitting(false);

    if (res.success) {
      showToast(`تم تحديث بيانات وصلاحيات "${formData.name}" بنجاح`);
      setEditingUser(null);
      loadUsersList();
    } else {
      setFormError(res.message || 'فشل في تحديث بيانات المستخدم');
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.username === 'admin') {
      alert('لا يمكن حذف الحساب الإداري الأساسي (admin)');
      return;
    }

    if (currentUser?.id === user.id) {
      alert('لا يمكنك حذف الحساب الذي تسجل الدخول به حالياً');
      return;
    }

    if (!window.confirm(`هل أنت متأكد من حذف المستخدم "${user.name}" (${user.username}) نهائياً؟`)) {
      return;
    }

    const res = await deleteAdminUser(user.id);
    if (res.success) {
      showToast(`تم حذف المستخدم "${user.name}" بنجاح`);
      loadUsersList();
    } else {
      alert(res.message || 'تعذر حذف المستخدم');
    }
  };

  const handleToggleStatus = async (user) => {
    if (user.username === 'admin') {
      alert('لا يمكن تعطيل الحساب الإداري الأساسي');
      return;
    }

    const newActive = !user.isActive;
    const res = await updateAdminUser(user.id, { isActive: newActive });
    if (res.success) {
      showToast(newActive ? `تم تفعيل حساب ${user.name}` : `تم تعطيل حساب ${user.name}`);
      loadUsersList();
    } else {
      alert(res.message || 'تعذر تغيير حالة الحساب');
    }
  };

  return (
    <div>
      {/* Top Header */}
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
            <Shield size={24} color="var(--primary)" />
            <span>إدارة المستخدمين والصلاحيات</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            إنشاء حسابات الموظفين والمشرفين وتحديد الصلاحيات بدقة لكل مستخدم (الحجوزات، الملاعب، المالية، الهوية).
          </p>
        </div>

        <button 
          onClick={openAddModal}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px' }}
        >
          <UserPlus size={18} />
          <span>إضافة مستخدم جديد</span>
        </button>
      </div>

      {/* Users List Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '28px', marginBottom: '10px' }}>⏳</div>
          <div>جاري تحميل قائمة المستخدمين...</div>
        </div>
      ) : users.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Users size={48} color="#c2dcd0" style={{ margin: '0 auto 16px' }} />
          <h3>لا يوجد مستخدمين مسجلين</h3>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {users.map(u => {
            const isMe = currentUser?.id === u.id || (currentUser?.username && currentUser.username === u.username);
            const userPerms = Array.isArray(u.permissions) ? u.permissions : [];

            return (
              <div 
                key={u.id}
                style={{
                  background: '#fff',
                  borderRadius: '16px',
                  padding: '22px',
                  boxShadow: 'var(--shadow-sm)',
                  border: isMe ? '2px solid var(--primary)' : '1px solid var(--border)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  {/* Top Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--dark)' }}>{u.name}</span>
                        {isMe && (
                          <span style={{ background: '#e8f5ee', color: 'var(--primary)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
                            أنت (الحساب الحالي)
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', direction: 'ltr', textAlign: 'right', marginTop: '2px' }}>
                        @{u.username}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(u)}
                      disabled={u.username === 'admin'}
                      title={u.isActive ? 'انقر للتعطيل' : 'انقر للتفعيل'}
                      style={{
                        background: u.isActive ? '#ecfdf5' : '#fef2f2',
                        color: u.isActive ? '#059669' : '#dc2626',
                        border: `1px solid ${u.isActive ? '#a7f3d0' : '#fecaca'}`,
                        borderRadius: '20px',
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: u.username === 'admin' ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {u.isActive ? <UserCheck size={13} /> : <UserX size={13} />}
                      <span>{u.isActive ? 'نشط' : 'معطل'}</span>
                    </button>
                  </div>

                  {/* Role Tag */}
                  <div style={{ marginBottom: '14px' }}>
                    <span style={{
                      background: '#f1f5f2',
                      color: 'var(--dark)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700
                    }}>
                      الدور: {
                        u.role === 'superadmin' ? '👑 مدير عام (Superadmin)' :
                        u.role === 'booking_agent' ? '⚡ مسؤول حجوزات واستقبال' :
                        u.role === 'accountant' ? '💰 محاسب مالي' :
                        u.role === 'pitch_manager' ? '🏟️ مدير ملاعب' : '⚙️ مخصص'
                      }
                    </span>
                  </div>

                  {/* Permissions Pills */}
                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                      الصلاحيات الممنوحة ({userPerms.length}):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {ALL_PERMISSIONS.map(p => {
                        const has = userPerms.includes(p.id);
                        return (
                          <span
                            key={p.id}
                            style={{
                              background: has ? '#e8f5ee' : '#f5f7f6',
                              color: has ? '#065f46' : '#9ca3af',
                              border: `1px solid ${has ? '#bbf7d0' : '#e5e7eb'}`,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: has ? 700 : 500,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              textDecoration: has ? 'none' : 'line-through',
                              opacity: has ? 1 : 0.6
                            }}
                          >
                            <span>{p.icon}</span>
                            <span>{p.label}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid var(--border)',
                  paddingTop: '14px',
                  marginTop: '10px'
                }}>
                  <button
                    onClick={() => openEditModal(u)}
                    className="btn"
                    style={{
                      background: '#f1f5f2',
                      color: 'var(--dark)',
                      border: '1px solid #dce4de',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Edit size={14} />
                    <span>تعديل الصلاحيات</span>
                  </button>

                  {u.username !== 'admin' && (
                    <button
                      onClick={() => handleDeleteUser(u)}
                      className="btn"
                      style={{
                        background: '#fef2f2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Trash2 size={14} />
                      <span>حذف</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add User */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '640px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={22} color="var(--primary)" />
                <span>إضافة مستخدم جديد وتحديد الصلاحيات</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>

            {formError && (
              <div style={{ background: '#fde8e8', color: '#b91c1c', padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, marginBottom: '16px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>الاسم الكامل</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: أحمد عبد الله"
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>اسم المستخدم للدخول (Username)</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ direction: 'ltr', textAlign: 'left' }}
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="مثال: ahmed"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>كلمة المرور (Password)</label>
                <input
                  type="password"
                  className="form-input"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="كلمة مرور الدخول للوحة التحكم"
                  required
                />
              </div>

              {/* Role Presets */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
                  قوالب الأدوار الجاهزة (Role Template):
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  {ROLE_PRESETS.map(preset => {
                    const isSelected = formData.role === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handlePresetSelect(preset.id)}
                        style={{
                          padding: '10px 8px',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid var(--primary)' : '1px solid #dce4de',
                          background: isSelected ? '#e8f5ee' : '#fff',
                          color: isSelected ? 'var(--dark)' : 'var(--text-dark)',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        {preset.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Permissions Checkbox Matrix */}
              <div style={{ marginBottom: '20px', background: '#f8faf9', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8e4' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--dark)' }}>
                    حدد الصلاحيات المخصصة لهذا المستخدم:
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      type="button" 
                      onClick={selectAllPermissions} 
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      تحديد الكل
                    </button>
                    <span style={{ color: '#ccc' }}>|</span>
                    <button 
                      type="button" 
                      onClick={clearAllPermissions} 
                      style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      إلغاء الكل
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {ALL_PERMISSIONS.map(p => {
                    const isChecked = formData.permissions.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          background: isChecked ? '#ffffff' : 'transparent',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: isChecked ? '1px solid #bbf7d0' : '1px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermission(p.id)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                        />
                        <span style={{ fontSize: '18px' }}>{p.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--dark)' }}>{p.label}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Active Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <input
                  type="checkbox"
                  id="userActiveCheck"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                />
                <label htmlFor="userActiveCheck" style={{ fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                  حساب نشط ومتاح للدخول فوراً
                </label>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn"
                  style={{ background: '#f1f5f2', padding: '10px 20px', fontWeight: 700 }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ padding: '10px 24px', fontWeight: 800 }}
                >
                  {submitting ? 'جاري الإنشاء...' : 'إنشاء المستخدم'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '640px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit size={22} color="var(--primary)" />
                <span>تعديل المستخدم والصلاحيات: {editingUser.name}</span>
              </h3>
              <button onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>

            {formError && (
              <div style={{ background: '#fde8e8', color: '#b91c1c', padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, marginBottom: '16px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>الاسم الكامل</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>اسم المستخدم (Username)</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ direction: 'ltr', textAlign: 'left' }}
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>تغيير كلمة المرور (اتركه فارغاً إذا كنت لا ترغب بتغييرها)</label>
                <input
                  type="password"
                  className="form-input"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="اتركه فارغاً للاحتفاظ بكلمة المرور الحالية"
                />
              </div>

              {/* Role Presets */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
                  تطبيق قالب صلاحيات سريع:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  {ROLE_PRESETS.map(preset => {
                    const isSelected = formData.role === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handlePresetSelect(preset.id)}
                        style={{
                          padding: '10px 8px',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid var(--primary)' : '1px solid #dce4de',
                          background: isSelected ? '#e8f5ee' : '#fff',
                          color: isSelected ? 'var(--dark)' : 'var(--text-dark)',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        {preset.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Permissions Checkbox Matrix */}
              <div style={{ marginBottom: '20px', background: '#f8faf9', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8e4' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--dark)' }}>
                    صلاحيات هذا المستخدم:
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      type="button" 
                      onClick={selectAllPermissions} 
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      تحديد الكل
                    </button>
                    <span style={{ color: '#ccc' }}>|</span>
                    <button 
                      type="button" 
                      onClick={clearAllPermissions} 
                      style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      إلغاء الكل
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {ALL_PERMISSIONS.map(p => {
                    const isChecked = formData.permissions.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          background: isChecked ? '#ffffff' : 'transparent',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: isChecked ? '1px solid #bbf7d0' : '1px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermission(p.id)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                        />
                        <span style={{ fontSize: '18px' }}>{p.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--dark)' }}>{p.label}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Active Toggle */}
              {editingUser.username !== 'admin' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <input
                    type="checkbox"
                    id="editUserActiveCheck"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                  />
                  <label htmlFor="editUserActiveCheck" style={{ fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                    حساب نشط ومسموح له بتسجيل الدخول
                  </label>
                </div>
              )}

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="btn"
                  style={{ background: '#f1f5f2', padding: '10px 20px', fontWeight: 700 }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ padding: '10px 24px', fontWeight: 800 }}
                >
                  {submitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
