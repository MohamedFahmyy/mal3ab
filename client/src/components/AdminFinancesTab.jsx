import React, { useState, useEffect } from 'react';
import { fetchFinances, fetchPayments } from '../utils/api';
import { Plus, Trash2, DollarSign, TrendingUp, TrendingDown, Users, Tag, AlertCircle, CheckCircle, PieChart } from 'lucide-react';

export default function AdminFinancesTab({ showToast }) {
  const [period, setPeriod] = useState('all'); // 'weekly', 'monthly', 'all'
  const [financeData, setFinanceData] = useState(null);
  const [paymentsList, setPaymentsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Local operational expenses tracking
  const [expenses, setExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem('malaeb_expenses');
      return saved ? JSON.parse(saved) : [
        { id: 'exp-1', description: 'صيانة كشافات الإضاءة LED', amount: 350, date: '2026-10-10' },
        { id: 'exp-2', description: 'كرات قدم تدريب ومعدات', amount: 450, date: '2026-10-12' }
      ];
    } catch {
      return [];
    }
  });

  const [employees, setEmployees] = useState(() => {
    try {
      const saved = localStorage.getItem('malaeb_employees');
      return saved ? JSON.parse(saved) : [
        { id: 'emp-1', name: 'عامل صيانة ونظافة الملعب', salary: 3000 }
      ];
    } catch {
      return [];
    }
  });

  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
  const [employeeForm, setEmployeeForm] = useState({ name: '', salary: '' });

  const loadFinances = async () => {
    setLoading(true);
    const [finRes, payRes] = await Promise.all([
      fetchFinances(period),
      fetchPayments()
    ]);
    if (finRes.success) setFinanceData(finRes.data);
    if (payRes.success) setPaymentsList(payRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadFinances();
  }, [period]);

  const saveExpenses = (newExp) => {
    setExpenses(newExp);
    localStorage.setItem('malaeb_expenses', JSON.stringify(newExp));
  };

  const saveEmployees = (newEmp) => {
    setEmployees(newEmp);
    localStorage.setItem('malaeb_employees', JSON.stringify(newEmp));
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!expenseForm.description || !expenseForm.amount) return;
    const newExp = [
      { id: 'exp-' + Date.now(), ...expenseForm, amount: Number(expenseForm.amount) },
      ...expenses
    ];
    saveExpenses(newExp);
    showToast('تم تسجيل المصروف بنجاح');
    setExpenseForm({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleDeleteExpense = (id) => {
    const newExp = expenses.filter(e => e.id !== id);
    saveExpenses(newExp);
    showToast('تم حذف المصروف');
  };

  const handleAddEmployee = (e) => {
    e.preventDefault();
    if (!employeeForm.name || !employeeForm.salary) return;
    const newEmp = [
      { id: 'emp-' + Date.now(), ...employeeForm, salary: Number(employeeForm.salary) },
      ...employees
    ];
    saveEmployees(newEmp);
    showToast('تم تسجيل الموظف بنجاح');
    setEmployeeForm({ name: '', salary: '' });
  };

  const handleDeleteEmployee = (id) => {
    const newEmp = employees.filter(e => e.id !== id);
    saveEmployees(newEmp);
    showToast('تم حذف الموظف');
  };

  // Calculations
  const grossBookings = financeData?.grossTotal || 0;
  const totalDiscounts = financeData?.totalDiscounts || 0;
  const netBookings = financeData?.netTotal || 0;
  const collectedRevenue = financeData?.collectedTotal || 0; // Strictly from actual payments
  const dueReceivables = financeData?.dueTotal || 0; // Remaining debt

  const totalExpensesAmount = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalSalariesAmount = employees.reduce((sum, e) => sum + Number(e.salary || 0), 0);
  const totalOperationalOutflow = totalExpensesAmount + totalSalariesAmount;

  // Real Net Operating Profit based on strictly collected revenue minus expenses
  const netOperatingProfit = collectedRevenue - totalOperationalOutflow;

  const byPaymentMethod = financeData?.byPaymentMethod || { cash: 0, vodafone: 0, card: 0 };
  const statusCounts = financeData?.statusCounts || { paid: 0, partial: 0, unpaid: 0 };

  return (
    <div style={{ paddingBottom: '40px' }}>
      
      {/* Financial Core Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: '16px',
        marginBottom: '30px'
      }}>
        {/* Gross Bookings */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', borderTop: '4px solid #64748b' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>
            إجمالي الحجوزات قبل الخصم
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--dark)' }}>
            {grossBookings.toLocaleString()} ج.م
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            قيمة الحجوزات الإجمالية
          </div>
        </div>

        {/* Discounts */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', borderTop: '4px solid #f59e0b' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Tag size={16} color="#f59e0b" /> إجمالي الخصومات الممنوحة
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#f59e0b' }}>
            {totalDiscounts.toLocaleString()} ج.م
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            مجموع الخصومات المطبقة
          </div>
        </div>

        {/* Net Bookings */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', borderTop: '4px solid #3b82f6' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>
            صافي قيمة الحجوزات
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#1e3a8a' }}>
            {netBookings.toLocaleString()} ج.م
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            (الإجمالي - الخصم)
          </div>
        </div>

        {/* Actually Collected Revenue */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', borderTop: '4px solid #10b981' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={16} color="#10b981" /> الإيرادات المحصلة فعلياً
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#10b981' }}>
            {collectedRevenue.toLocaleString()} ج.م
          </div>
          <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px', fontWeight: '700' }}>
            من واقع سجل الدفعات الفعلي ✓
          </div>
        </div>

        {/* Due Balance (Debt) */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', borderTop: '4px solid #dc2626' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={16} color="#dc2626" /> الأرصدة المستحقة (المتبقي)
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#dc2626' }}>
            {dueReceivables.toLocaleString()} ج.م
          </div>
          <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>
            مبالغ حجز مستحقة التحصيل
          </div>
        </div>

        {/* Net Profit */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', borderTop: netOperatingProfit >= 0 ? '4px solid #10b981' : '4px solid #dc2626' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>
            صافي الأرباح التشغيلية
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: netOperatingProfit >= 0 ? '#10b981' : '#dc2626' }}>
            {netOperatingProfit.toLocaleString()} ج.م
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            (المحصل الفعلي - المصروفات والرواتب)
          </div>
        </div>
      </div>

      {/* Breakdown Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        {/* Payment Methods */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 16px 0', color: 'var(--dark)' }}>
            توزيع الإيراد المحصل حسب وسيلة الدفع
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8faf9', borderRadius: '10px' }}>
              <span style={{ fontWeight: '700' }}>💵 كاش بالملعب</span>
              <strong style={{ fontSize: '16px', color: 'var(--primary)' }}>{(byPaymentMethod.cash || 0).toLocaleString()} ج.م</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8faf9', borderRadius: '10px' }}>
              <span style={{ fontWeight: '700' }}>📱 فودافون كاش (Vodafone Cash)</span>
              <strong style={{ fontSize: '16px', color: '#e11d48' }}>{(byPaymentMethod.vodafone || 0).toLocaleString()} ج.م</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8faf9', borderRadius: '10px' }}>
              <span style={{ fontWeight: '700' }}>💳 بطاقة بنكية / فيزا (Card)</span>
              <strong style={{ fontSize: '16px', color: '#2563eb' }}>{(byPaymentMethod.card || 0).toLocaleString()} ج.م</strong>
            </div>
          </div>
        </div>

        {/* Bookings Payment Status */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 16px 0', color: 'var(--dark)' }}>
            موقف سداد الحجوزات
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
              <span style={{ fontWeight: '700', color: '#166534' }}>✓ حجوزات مسددة بالكامل</span>
              <strong style={{ fontSize: '16px', color: '#166534' }}>{statusCounts.paid || 0} حجز</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a' }}>
              <span style={{ fontWeight: '700', color: '#92400e' }}>⏳ حجوزات مسددة جزئياً (عربون)</span>
              <strong style={{ fontSize: '16px', color: '#92400e' }}>{statusCounts.partial || 0} حجز</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca' }}>
              <span style={{ fontWeight: '700', color: '#991b1b' }}>⚠️ حجوزات غير مدفوعة حتى الآن</span>
              <strong style={{ fontSize: '16px', color: '#991b1b' }}>{statusCounts.unpaid || 0} حجز</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Expenses & Salaries Management */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Expenses Section */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 16px 0', color: 'var(--dark)', display: 'flex', justifyContent: 'space-between' }}>
            <span>مصروفات التشغيل والصيانة</span>
            <span style={{ color: '#dc2626' }}>{totalExpensesAmount.toLocaleString()} ج.م</span>
          </h3>

          <form onSubmit={handleAddExpense} style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="وصف المصروف (مثال: صيانة شبك)"
              value={expenseForm.description}
              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              className="form-input"
              style={{ flex: '1 1 150px' }}
              required
            />
            <input
              type="number"
              placeholder="المبلغ"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              className="form-input"
              style={{ width: '90px' }}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 14px' }}>
              <Plus size={16} /> إضافة
            </button>
          </form>

          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {expenses.map((e) => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}>
                <div>
                  <div style={{ fontWeight: '700' }}>{e.description}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{e.date}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <strong style={{ color: '#dc2626' }}>{Number(e.amount).toLocaleString()} ج.م</strong>
                  <button 
                    onClick={() => handleDeleteExpense(e.id)}
                    style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Employees Section */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 16px 0', color: 'var(--dark)', display: 'flex', justifyContent: 'space-between' }}>
            <span>رواتب العاملين الشهرية</span>
            <span style={{ color: '#dc2626' }}>{totalSalariesAmount.toLocaleString()} ج.م</span>
          </h3>

          <form onSubmit={handleAddEmployee} style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="اسم الموظف أو الوظيفة"
              value={employeeForm.name}
              onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
              className="form-input"
              style={{ flex: '1 1 150px' }}
              required
            />
            <input
              type="number"
              placeholder="الراتب"
              value={employeeForm.salary}
              onChange={(e) => setEmployeeForm({ ...employeeForm, salary: e.target.value })}
              className="form-input"
              style={{ width: '90px' }}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 14px' }}>
              <Plus size={16} /> إضافة
            </button>
          </form>

          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {employees.map((emp) => (
              <div key={emp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}>
                <div style={{ fontWeight: '700' }}>{emp.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <strong style={{ color: '#dc2626' }}>{Number(emp.salary).toLocaleString()} ج.م</strong>
                  <button 
                    onClick={() => handleDeleteEmployee(emp.id)}
                    style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
