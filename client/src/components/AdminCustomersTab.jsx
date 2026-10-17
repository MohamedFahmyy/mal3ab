import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Plus, Edit, Trash2, Eye, Phone, Calendar, 
  DollarSign, CheckCircle2, Clock, X, AlertCircle, ShieldAlert, Award, FileSpreadsheet
} from 'lucide-react';
import { fetchCustomers, createCustomer, updateCustomer, deleteCustomer, fetchCustomerDetails } from '../utils/api';
import RecordPaymentModal from './RecordPaymentModal';
import ReceiptModal from './ReceiptModal';

export default function AdminCustomersTab({ showToast }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewingCustomer, setViewingCustomer] = useState(null);
  const [payingBooking, setPayingBooking] = useState(null);
  const [receiptPayment, setReceiptPayment] = useState(null);

  const loadCustomers = async () => {
    setLoading(true);
    const res = await fetchCustomers({
      search,
      sortBy,
      status: statusFilter
    });
    if (res.success) {
      setCustomers(res.data || []);
    } else {
      showToast('تعذر تحميل بيانات العملاء', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCustomers();
  }, [search, sortBy, statusFilter]);

  const handleDelete = async (customer) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف العميل (${customer.name})؟`)) {
      return;
    }

    const res = await deleteCustomer(customer.id);
    if (res.success) {
      showToast('تم حذف العميل بنجاح');
      loadCustomers();
      if (viewingCustomer?.id === customer.id) setViewingCustomer(null);
    } else {
      alert(`⚠️ لا يمكن حذف العميل:\n${res.message}`);
    }
  };

  // Aggregated CRM metrics
  const totalCustomersCount = customers.length;
  const totalDueBalance = customers.reduce((sum, c) => sum + (c.remainingBalance || 0), 0);
  const totalRevenue = customers.reduce((sum, c) => sum + (c.totalPaid || 0), 0);

  return (
    <div>
      {/* Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '700' }}>
            <Users size={18} color="var(--primary)" /> إجمالي العملاء المسجلين
          </div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: 'var(--dark)', marginTop: '6px' }}>
            {totalCustomersCount}
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '700' }}>
            <DollarSign size={18} color="#10b981" /> إجمالي مدفوعات العملاء
          </div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#10b981', marginTop: '6px' }}>
            {totalRevenue.toLocaleString()} ج.م
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '700' }}>
            <AlertCircle size={18} color="#dc2626" /> المديونيات المعلقة (المتبقي)
          </div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#dc2626', marginTop: '6px' }}>
            {totalDueBalance.toLocaleString()} ج.م
          </div>
        </div>
      </div>

      {/* Action Bar (Search & Filter) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: '1 1 320px' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <input
              type="text"
              placeholder="بحث بالاسم أو رقم الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ width: '100%', paddingRight: '36px' }}
            />
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="form-input"
            style={{ width: 'auto' }}
          >
            <option value="date">الأحدث تسجيلاً</option>
            <option value="name">ترتيب بالاسم أبجدياً</option>
            <option value="bookings">الأكثر حجزاً</option>
            <option value="balance">الأعلى مديونية (المتبقي)</option>
            <option value="paid">الأعلى سداداً</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-input"
            style={{ width: 'auto' }}
          >
            <option value="all">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="vip">عميل VIP</option>
            <option value="inactive">غير نشط</option>
          </select>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            padding: '10px 18px',
            borderRadius: '10px',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Plus size={18} /> إضافة عميل جديد
        </button>
      </div>

      {/* Customers Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ background: 'var(--bg-page)', borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '14px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '13px' }}>العميل</th>
              <th style={{ padding: '14px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '13px' }}>رقم الهاتف</th>
              <th style={{ padding: '14px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '13px' }}>الحجوزات</th>
              <th style={{ padding: '14px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '13px' }}>إجمالي الحجوزات</th>
              <th style={{ padding: '14px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '13px' }}>المدفوع</th>
              <th style={{ padding: '14px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '13px' }}>المتبقي (المديونية)</th>
              <th style={{ padding: '14px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '13px' }}>آخر حجز</th>
              <th style={{ padding: '14px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '13px' }}>الحالة</th>
              <th style={{ padding: '14px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '13px' }}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>جاري تحميل العملاء...</td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>لا يوجد عملاء يطابقون خيارات البحث</td>
              </tr>
            ) : customers.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '14px' }}>
                  <div style={{ fontWeight: '800', color: 'var(--dark)' }}>{c.name}</div>
                  {c.notes && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.notes}</div>}
                </td>
                <td style={{ padding: '14px', fontWeight: '700', color: 'var(--primary)' }}>{c.phone}</td>
                <td style={{ padding: '14px', fontWeight: '800' }}>
                  <span style={{ background: '#f0f5f2', padding: '4px 10px', borderRadius: '12px', fontSize: '12px' }}>
                    {c.totalBookings || 0}
                  </span>
                </td>
                <td style={{ padding: '14px', fontWeight: '700' }}>{(c.totalNet || 0).toLocaleString()} ج.م</td>
                <td style={{ padding: '14px', fontWeight: '800', color: '#10b981' }}>{(c.totalPaid || 0).toLocaleString()} ج.م</td>
                <td style={{ padding: '14px' }}>
                  {c.remainingBalance > 0 ? (
                    <span style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '900' }}>
                      {c.remainingBalance.toLocaleString()} ج.م
                    </span>
                  ) : (
                    <span style={{ color: '#10b981', fontSize: '13px', fontWeight: '800' }}>خالص ✓</span>
                  )}
                </td>
                <td style={{ padding: '14px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  {c.lastBooking || 'لا يوجد بعد'}
                </td>
                <td style={{ padding: '14px' }}>
                  {c.status === 'vip' ? (
                    <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' }}>VIP ★</span>
                  ) : c.status === 'inactive' ? (
                    <span style={{ background: '#f3f4f6', color: '#6b7280', padding: '4px 8px', borderRadius: '6px', fontSize: '11px' }}>غير نشط</span>
                  ) : (
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>نشط</span>
                  )}
                </td>
                <td style={{ padding: '14px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={async () => {
                        const res = await fetchCustomerDetails(c.id);
                        if (res.success) setViewingCustomer(res.data);
                      }}
                      title="عرض تفاصيل وسجل العميل"
                      style={{ background: '#f0f5f2', border: 'none', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', color: 'var(--primary)' }}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => setEditingCustomer(c)}
                      title="تعديل بيانات العميل"
                      style={{ background: '#f0f5f2', border: 'none', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', color: '#3b82f6' }}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      title="حذف العميل"
                      style={{ background: '#fde8e8', border: 'none', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', color: '#dc2626' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Customer Detail Modal */}
      {viewingCustomer && (
        <CustomerDetailModal
          customer={viewingCustomer}
          onClose={() => setViewingCustomer(null)}
          onRecordPayment={(booking) => {
            setPayingBooking(booking);
          }}
          onViewReceipt={(payment) => {
            setReceiptPayment(payment);
          }}
          onRefresh={async () => {
            const res = await fetchCustomerDetails(viewingCustomer.id);
            if (res.success) setViewingCustomer(res.data);
            loadCustomers();
          }}
        />
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <CustomerFormModal
          title="إضافة عميل جديد"
          onClose={() => setShowAddModal(false)}
          onSubmit={async (data) => {
            const res = await createCustomer(data);
            if (res.success) {
              showToast('تم إضافة العميل بنجاح');
              setShowAddModal(false);
              loadCustomers();
            } else {
              alert(res.message || 'حدث خطأ');
            }
          }}
        />
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <CustomerFormModal
          title={`تعديل بيانات العميل: ${editingCustomer.name}`}
          initialData={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSubmit={async (data) => {
            const res = await updateCustomer(editingCustomer.id, data);
            if (res.success) {
              showToast('تم تحديث بيانات العميل بنجاح');
              setEditingCustomer(null);
              loadCustomers();
            } else {
              alert(res.message || 'حدث خطأ');
            }
          }}
        />
      )}

      {/* Pay Booking Modal */}
      {payingBooking && (
        <RecordPaymentModal
          booking={payingBooking}
          onClose={() => setPayingBooking(null)}
          onSuccess={() => {
            setPayingBooking(null);
            showToast('تم تسجيل الدفعة بنجاح! 💵');
            loadCustomers();
            if (viewingCustomer) {
              fetchCustomerDetails(viewingCustomer.id).then(res => {
                if (res.success) setViewingCustomer(res.data);
              });
            }
          }}
        />
      )}

      {/* Receipt Modal */}
      {receiptPayment && (
        <ReceiptModal
          payment={receiptPayment}
          onClose={() => setReceiptPayment(null)}
        />
      )}
    </div>
  );
}

// Sub-component: Customer Details Modal
function CustomerDetailModal({ customer, onClose, onRecordPayment, onViewReceipt, onRefresh }) {
  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings' | 'payments'

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1040 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={24} color="var(--primary)" />
            <div>
              <h2 style={{ fontSize: '18px', margin: 0 }}>ملف العميل: {customer.name}</h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>📞 {customer.phone} • مسجل منذ {new Date(customer.createdAt).toLocaleDateString('ar-EG')}</span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Financial KPI Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '10px',
          margin: '16px 0 20px',
          textAlign: 'center'
        }}>
          <div style={{ background: '#f8faf9', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>إجمالي الحجوزات</span>
            <strong style={{ fontSize: '16px' }}>{customer.totalBookings || 0}</strong>
          </div>
          <div style={{ background: '#f8faf9', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>صافي المطلوب</span>
            <strong style={{ fontSize: '16px', color: 'var(--dark)' }}>{(customer.totalNet || 0).toLocaleString()} ج.م</strong>
          </div>
          <div style={{ background: '#f8faf9', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>إجمالي المدفوع</span>
            <strong style={{ fontSize: '16px', color: '#10b981' }}>{(customer.totalPaid || 0).toLocaleString()} ج.م</strong>
          </div>
          <div style={{ background: '#f8faf9', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>المتبقي (المديونية)</span>
            <strong style={{ fontSize: '16px', color: customer.remainingBalance > 0 ? '#dc2626' : '#10b981' }}>
              {(customer.remainingBalance || 0).toLocaleString()} ج.م
            </strong>
          </div>
        </div>

        {/* Tabs for Bookings and Payments */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
          <button
            onClick={() => setActiveTab('bookings')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'bookings' ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === 'bookings' ? 'var(--primary)' : 'var(--text-muted)',
              padding: '8px 16px',
              fontWeight: '800',
              cursor: 'pointer'
            }}
          >
            سجل الحجوزات ({customer.bookings?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'payments' ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === 'payments' ? 'var(--primary)' : 'var(--text-muted)',
              padding: '8px 16px',
              fontWeight: '800',
              cursor: 'pointer'
            }}
          >
            سجل المدفوعات ({customer.payments?.length || 0})
          </button>
        </div>

        {activeTab === 'bookings' ? (
          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {(!customer.bookings || customer.bookings.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>لا توجد حجوزات مسجلة لهذا العميل بعد</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px' }}>كود الحجز</th>
                    <th style={{ padding: '8px' }}>الملعب</th>
                    <th style={{ padding: '8px' }}>الموعد</th>
                    <th style={{ padding: '8px' }}>الصافي</th>
                    <th style={{ padding: '8px' }}>المدفوع</th>
                    <th style={{ padding: '8px' }}>المتبقي</th>
                    <th style={{ padding: '8px' }}>الحالة</th>
                    <th style={{ padding: '8px' }}>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.bookings.map((b) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '8px', fontWeight: '800', color: 'var(--primary)' }}>{b.id}</td>
                      <td style={{ padding: '8px' }}>{b.pitchName}</td>
                      <td style={{ padding: '8px' }}>{b.date} ({b.timeSlots?.join(' , ')})</td>
                      <td style={{ padding: '8px', fontWeight: '700' }}>{b.netAmount} ج.م</td>
                      <td style={{ padding: '8px', color: '#10b981', fontWeight: '700' }}>{b.paidAmount} ج.م</td>
                      <td style={{ padding: '8px', color: b.remainingAmount > 0 ? '#dc2626' : '#10b981', fontWeight: '800' }}>
                        {b.remainingAmount} ج.م
                      </td>
                      <td style={{ padding: '8px' }}>
                        {b.paymentStatus === 'paid' ? (
                          <span style={{ color: '#15803d', fontSize: '11px', fontWeight: '800' }}>مدفوع</span>
                        ) : b.paymentStatus === 'partial' ? (
                          <span style={{ color: '#b45309', fontSize: '11px', fontWeight: '800' }}>جزئي</span>
                        ) : (
                          <span style={{ color: '#b91c1c', fontSize: '11px', fontWeight: '800' }}>غير مدفوع</span>
                        )}
                      </td>
                      <td style={{ padding: '8px' }}>
                        {b.remainingAmount > 0 && b.status !== 'cancelled' && (
                          <button
                            onClick={() => onRecordPayment(b)}
                            style={{
                              background: 'var(--primary)',
                              color: '#fff',
                              border: 'none',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            سداد
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {(!customer.payments || customer.payments.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>لا توجد حركات دفع مسجلة لهذا العميل</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px' }}>رقم الإيصال</th>
                    <th style={{ padding: '8px' }}>الحجز المرتبط</th>
                    <th style={{ padding: '8px' }}>المبلغ</th>
                    <th style={{ padding: '8px' }}>وسيلة الدفع</th>
                    <th style={{ padding: '8px' }}>التاريخ</th>
                    <th style={{ padding: '8px' }}>إيصال</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.payments.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '8px', fontWeight: '700' }}>{p.id}</td>
                      <td style={{ padding: '8px', color: 'var(--primary)', fontWeight: '700' }}>{p.bookingId}</td>
                      <td style={{ padding: '8px', fontWeight: '800', color: '#10b981' }}>{p.amount} ج.م</td>
                      <td style={{ padding: '8px' }}>
                        {p.paymentMethod === 'vodafone' ? 'فودافون كاش' : p.paymentMethod === 'card' ? 'فيزا' : 'كاش'}
                      </td>
                      <td style={{ padding: '8px', color: 'var(--text-muted)' }}>
                        {new Date(p.createdAt).toLocaleDateString('ar-EG')}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <button
                          onClick={() => onViewReceipt(p)}
                          style={{ background: '#f0f5f2', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', color: 'var(--primary)' }}
                        >
                          عرض
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
          <button onClick={onClose} className="btn" style={{ background: '#eee', color: '#333' }}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}

// Sub-component: Customer Create / Edit Form Modal
function CustomerFormModal({ title, initialData = {}, onClose, onSubmit }) {
  const [name, setName] = useState(initialData.name || '');
  const [phone, setPhone] = useState(initialData.phone || '');
  const [notes, setNotes] = useState(initialData.notes || '');
  const [status, setStatus] = useState(initialData.status || 'active');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setSubmitting(true);
    await onSubmit({ name, phone, notes, status });
    setSubmitting(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>اسم العميل *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              placeholder="مثال: محمد علي"
            />
          </div>

          <div className="form-group">
            <label>رقم الهاتف *</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="form-input"
              placeholder="010XXXXXXXX"
            />
          </div>

          <div className="form-group">
            <label>حالة العميل</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="form-input"
            >
              <option value="active">نشط (Active)</option>
              <option value="vip">عميل VIP</option>
              <option value="inactive">غير نشط (Inactive)</option>
            </select>
          </div>

          <div className="form-group">
            <label>ملاحظات إضافية</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-input"
              rows="3"
              placeholder="أي ملاحظات خاصة بالعميل..."
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '15px', marginTop: '10px' }}
          >
            {submitting ? 'جاري الحفظ...' : 'حفظ البيانات ✓'}
          </button>
        </form>
      </div>
    </div>
  );
}
