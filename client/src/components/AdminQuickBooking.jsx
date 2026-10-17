import React, { useState, useEffect } from 'react';
import { fetchPitches, fetchBookings, createBooking } from '../utils/api';
import { Calendar as CalendarIcon, Tag, DollarSign, Smartphone, CreditCard, User, Phone, CheckCircle2, AlertCircle } from 'lucide-react';
import AdminBookingDetailModal from './AdminBookingDetailModal';

export default function AdminQuickBooking({ showToast }) {
  const [pitches, setPitches] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [baseDate, setBaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPitchId, setSelectedPitchId] = useState('all');
  const [selectedSlots, setSelectedSlots] = useState([]); // Array of { pitchId, time, price }
  const [dates, setDates] = useState([]);

  // Customer & Payment state for new booking
  const [customerName, setCustomerName] = useState('حجز إداري');
  const [customerPhone, setCustomerPhone] = useState('01000000000');
  
  // Recurring booking state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringWeeks, setRecurringWeeks] = useState(4); // 4 weeks = 1 month

  // Discount state
  const [discountType, setDiscountType] = useState('none'); // 'none' | 'percentage' | 'fixed'
  const [discountValue, setDiscountValue] = useState(0);

  // Partial Payment state
  const [paymentOption, setPaymentOption] = useState('full'); // 'full' | 'partial' | 'unpaid'
  const [customPaidAmount, setCustomPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Detail Modal for clicked booked slot
  const [activeBookingId, setActiveBookingId] = useState(null);

  // Load pitches and bookings from API
  const loadData = async () => {
    setLoading(true);
    const [pRes, bRes] = await Promise.all([
      fetchPitches(),
      fetchBookings({ date: selectedDate })
    ]);

    if (pRes.success) setPitches(pRes.data || []);
    if (bRes.success) setBookings(bRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    // Generate 7 days starting from baseDate
    const nextDays = [];
    const start = new Date(baseDate);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      nextDays.push({
        full: d.toISOString().split('T')[0],
        dayName: d.toLocaleDateString('ar-EG', { weekday: 'short' }),
        dayNum: d.getDate()
      });
    }
    setDates(nextDays);
    setSelectedDate(baseDate);
  }, [baseDate]);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const toggleSlot = (pitchId, time, price) => {
    const isSelected = selectedSlots.find(s => s.pitchId === pitchId && s.time === time);
    if (isSelected) {
      setSelectedSlots(selectedSlots.filter(s => !(s.pitchId === pitchId && s.time === time)));
    } else {
      setSelectedSlots([...selectedSlots, { pitchId, time, price }]);
    }
  };

  // Find booking for a slot
  const getSlotBooking = (pitchId, time) => {
    return bookings.find(b => 
      b.pitchId === pitchId && 
      b.date === selectedDate && 
      b.timeSlots?.includes(time) && 
      b.status !== 'cancelled' && 
      b.status !== 'ملغي'
    );
  };

  // Pricing & Discount Calculations
  const grossTotalPrice = selectedSlots.reduce((sum, s) => sum + s.price, 0);
  const baseGrossPrice = isRecurring ? grossTotalPrice * recurringWeeks : grossTotalPrice;

  let calculatedDiscountAmount = 0;
  if (discountType === 'percentage') {
    const pct = Math.min(100, Math.max(0, Number(discountValue || 0)));
    calculatedDiscountAmount = Math.round((baseGrossPrice * pct) / 100);
  } else if (discountType === 'fixed') {
    calculatedDiscountAmount = Math.min(baseGrossPrice, Math.max(0, Number(discountValue || 0)));
  }

  const netTotalPrice = Math.max(0, baseGrossPrice - calculatedDiscountAmount);

  let finalPaidAmount = 0;
  if (paymentOption === 'full') {
    finalPaidAmount = netTotalPrice;
  } else if (paymentOption === 'unpaid') {
    finalPaidAmount = 0;
  } else if (paymentOption === 'partial') {
    finalPaidAmount = Math.min(netTotalPrice, Math.max(0, Number(customPaidAmount || 0)));
  }

  const handleConfirmBooking = async () => {
    if (selectedSlots.length === 0) return;
    
    // Group slots by pitch
    const byPitch = selectedSlots.reduce((acc, slot) => {
      if (!acc[slot.pitchId]) acc[slot.pitchId] = { slots: [], price: 0 };
      acc[slot.pitchId].slots.push(slot.time);
      acc[slot.pitchId].price += slot.price;
      return acc;
    }, {});

    const datesToBook = [];
    if (isRecurring) {
      for (let i = 0; i < recurringWeeks; i++) {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + (i * 7));
        datesToBook.push(d.toISOString().split('T')[0]);
      }
    } else {
      datesToBook.push(selectedDate);
    }

    const totalBookingsCount = datesToBook.length * Object.keys(byPitch).length;
    const paidPerBooking = totalBookingsCount > 0 ? Math.floor(finalPaidAmount / totalBookingsCount) : 0;
    const discountValPerBooking = totalBookingsCount > 0 && discountType === 'fixed' 
      ? Math.floor(Number(discountValue) / totalBookingsCount) 
      : Number(discountValue);

    for (const d of datesToBook) {
      for (const [pId, data] of Object.entries(byPitch)) {
        await createBooking({
          pitchId: pId,
          customerName: customerName || 'حجز إداري',
          customerPhone: customerPhone || '01000000000',
          date: d,
          timeSlots: data.slots,
          paymentMethod,
          paidAmount: paidPerBooking,
          discountType,
          discountValue: discountValPerBooking,
          discountNotes: discountType !== 'none' ? 'خصم إداري' : ''
        });
      }
    }
    
    showToast(isRecurring ? `تم تأكيد الحجز المتكرر (${datesToBook.length} أسبوع) بنجاح 🎉` : 'تم تأكيد الحجز بنجاح 🎉');
    setSelectedSlots([]);
    setIsRecurring(false);
    setDiscountType('none');
    setDiscountValue(0);
    setPaymentOption('full');
    setCustomPaidAmount('');
    loadData();
  };

  const pitchesToDisplay = selectedPitchId === 'all' 
    ? pitches 
    : pitches.filter(p => p.id === selectedPitchId);

  return (
    <div style={{ background: '#121212', color: '#fff', borderRadius: '20px', padding: '20px', minHeight: '600px' }}>
      
      {/* Date Picker Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarIcon size={20} color="#10b981" />
          جدول المواعيد والحجز السريع
        </h3>
        <div>
          <input 
            type="date" 
            value={baseDate}
            onChange={(e) => {
              if (e.target.value) setBaseDate(e.target.value);
            }}
            style={{
              background: '#222',
              color: '#fff',
              border: '1px solid #333',
              padding: '8px 12px',
              borderRadius: '8px',
              colorScheme: 'dark'
            }}
          />
        </div>
      </div>

      {/* Dates Row */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '10px' }}>
        {dates.map((d, i) => (
          <div 
            key={i}
            onClick={() => { setSelectedDate(d.full); setSelectedSlots([]); }}
            style={{
              minWidth: '65px',
              background: selectedDate === d.full ? '#10b981' : '#222',
              color: selectedDate === d.full ? '#000' : '#fff',
              borderRadius: '12px',
              padding: '12px 0',
              textAlign: 'center',
              cursor: 'pointer',
              fontWeight: '700',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ fontSize: '13px', marginBottom: '4px' }}>{d.dayName}</div>
            <div style={{ fontSize: '22px', fontWeight: '900' }}>{d.dayNum}</div>
          </div>
        ))}
      </div>

      {/* Guide Note */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: '#888', marginBottom: '20px', flexWrap: 'wrap' }}>
        <span>المواعيد المحجوزة يظهر بها اسم العميل وحالة السداد، ويمكن الضغط عليها لعرض التفاصيل:</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#4ade80' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' }}></span> مدفوع
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span> مدفوع جزئياً
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span> غير مدفوع
        </span>
      </div>

      {/* Pitch Filters */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '24px' }}>
        <button
          onClick={() => setSelectedPitchId('all')}
          style={{
            background: selectedPitchId === 'all' ? '#10b981' : '#222',
            color: selectedPitchId === 'all' ? '#000' : '#fff',
            border: 'none',
            padding: '8px 20px',
            borderRadius: '20px',
            fontWeight: '700',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          كل الملاعب
        </button>
        {pitches.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedPitchId(p.id)}
            style={{
              background: selectedPitchId === p.id ? '#10b981' : '#222',
              color: selectedPitchId === p.id ? '#000' : '#fff',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '20px',
              fontWeight: '700',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {p.nameAr || p.name}
          </button>
        ))}
      </div>

      {/* Pitches Slots Matrix */}
      <div style={{ paddingBottom: selectedSlots.length > 0 ? '300px' : '40px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>جاري تحميل المواعيد...</div>
        ) : pitchesToDisplay.map(pitch => {
          const slotsList = pitch.availableSlots && pitch.availableSlots.length > 0 
            ? pitch.availableSlots 
            : ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00'];

          return (
            <div key={pitch.id} style={{ background: '#1c1c1e', borderRadius: '16px', padding: '16px', marginBottom: '16px', border: '1px solid #2c2c2e' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '17px', fontWeight: '800' }}>{pitch.nameAr || pitch.name}</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#10b981' }}>{pitch.pricePerHour} ج.م/ساعة</div>
              </div>

              {/* Slot Grid: minmax adjusted so slot boxes can show name cleanly */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                {slotsList.map(time => {
                  const booking = getSlotBooking(pitch.id, time);
                  const isBooked = !!booking;
                  const selected = selectedSlots.find(s => s.pitchId === pitch.id && s.time === time);

                  if (isBooked) {
                    const custName = booking.customerName || 'عميل غير مسجل';
                    const payStatus = booking.paymentStatus || 'unpaid';
                    const hasDiscount = booking.discountAmount > 0;

                    let statusBadgeColor = '#ef4444';
                    let statusLabel = 'غير مدفوع';
                    if (payStatus === 'paid') {
                      statusBadgeColor = '#4ade80';
                      statusLabel = 'مدفوع';
                    } else if (payStatus === 'partial') {
                      statusBadgeColor = '#f59e0b';
                      statusLabel = 'مدفوع جزئياً';
                    }

                    return (
                      <div
                        key={time}
                        onClick={() => setActiveBookingId(booking.id)}
                        title={`حجز: ${custName}\nالحالة: ${statusLabel}\nاضغط لعرض تفاصيل الحجز وتعديل المدفوعات`}
                        style={{
                          background: '#28282b',
                          border: `1px solid ${statusBadgeColor}44`,
                          borderRadius: '10px',
                          padding: '10px 8px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          position: 'relative'
                        }}
                      >
                        {/* Time */}
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#fff' }}>
                          {time}
                        </div>

                        {/* Customer Name below slot box */}
                        <div style={{
                          fontSize: '12px',
                          fontWeight: '800',
                          color: '#e5e7eb',
                          marginTop: '4px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {custName}
                        </div>

                        {/* Payment Status indicator */}
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '10px',
                          fontWeight: '700',
                          color: statusBadgeColor,
                          marginTop: '4px'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusBadgeColor }}></span>
                          {statusLabel}
                        </div>

                        {/* Discount Badge if any */}
                        {hasDiscount && (
                          <div style={{
                            position: 'absolute',
                            top: '4px',
                            left: '4px',
                            background: '#d97706',
                            color: '#fff',
                            fontSize: '9px',
                            padding: '1px 4px',
                            borderRadius: '4px',
                            fontWeight: '700'
                          }}>
                            خصم
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Available slot button
                  return (
                    <button
                      key={time}
                      onClick={() => toggleSlot(pitch.id, time, pitch.pricePerHour)}
                      style={{
                        background: selected ? '#10b981' : '#222',
                        color: selected ? '#000' : '#fff',
                        border: selected ? '2px solid #10b981' : '1px solid #333',
                        borderRadius: '10px',
                        padding: '14px 8px',
                        fontWeight: '800',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>{time}</span>
                      <span style={{ fontSize: '11px', opacity: 0.8 }}>
                        {selected ? 'محدد ✓' : 'متاح'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {pitchesToDisplay.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>لا توجد ملاعب متاحة</div>
        )}
      </div>

      {/* Fixed Bottom Action Panel for Creating New Booking */}
      {selectedSlots.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          right: '20px',
          background: '#1a1a1c',
          padding: '20px',
          borderRadius: '20px',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.85)',
          border: '1px solid #333',
          zIndex: 100,
          maxHeight: '85vh',
          overflowY: 'auto'
        }}>
          {/* Row 1: Customer Info & Recurring */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>اسم العميل *</label>
              <input 
                type="text" 
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{ width: '100%', background: '#000', border: '1px solid #444', color: '#fff', padding: '8px 12px', borderRadius: '8px', fontSize: '14px' }}
                placeholder="اسم العميل"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>رقم الهاتف (لربطه بحساب العميل) *</label>
              <input 
                type="tel" 
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={{ width: '100%', background: '#000', border: '1px solid #444', color: '#fff', padding: '8px 12px', borderRadius: '8px', fontSize: '14px' }}
                placeholder="010XXXXXXXX"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: '#222', padding: '8px 12px', borderRadius: '8px', height: '38px' }}>
                <input 
                  type="checkbox" 
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  style={{ accentColor: '#10b981', width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '13px', fontWeight: '700' }}>حجز دوري أسبوعي</span>
              </label>

              {isRecurring && (
                <select 
                  value={recurringWeeks}
                  onChange={(e) => setRecurringWeeks(Number(e.target.value))}
                  style={{ background: '#000', border: '1px solid #444', color: '#fff', padding: '8px 10px', borderRadius: '8px', height: '38px', flex: 1, fontSize: '13px' }}
                >
                  <option value={4}>4 أسابيع (شهر)</option>
                  <option value={8}>8 أسابيع (شهرين)</option>
                  <option value={24}>24 أسبوع (6 شهور)</option>
                </select>
              )}
            </div>
          </div>

          {/* Row 2: Discount & Payment Config */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '14px', background: '#242426', padding: '12px', borderRadius: '12px' }}>
            {/* Discount Section */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>
                <Tag size={14} color="#f59e0b" /> تطبيق خصم
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={discountType}
                  onChange={(e) => { setDiscountType(e.target.value); setDiscountValue(0); }}
                  style={{ background: '#000', border: '1px solid #444', color: '#fff', padding: '8px', borderRadius: '8px', fontSize: '13px' }}
                >
                  <option value="none">بدون خصم</option>
                  <option value="percentage">نسبة مئوية (%)</option>
                  <option value="fixed">مبلغ ثابت (ج.م)</option>
                </select>

                {discountType !== 'none' && (
                  <input
                    type="number"
                    min="0"
                    max={discountType === 'percentage' ? 100 : baseGrossPrice}
                    placeholder={discountType === 'percentage' ? 'النسبة %' : 'المبلغ ج.م'}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    style={{ background: '#000', border: '1px solid #444', color: '#fff', padding: '8px', borderRadius: '8px', width: '90px', fontSize: '13px' }}
                  />
                )}
              </div>
            </div>

            {/* Payment Choice */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>طريقة سداد الدفعة الأولى</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <select
                  value={paymentOption}
                  onChange={(e) => setPaymentOption(e.target.value)}
                  style={{ background: '#000', border: '1px solid #444', color: '#fff', padding: '8px', borderRadius: '8px', fontSize: '13px' }}
                >
                  <option value="full">دفع كامل الصافي</option>
                  <option value="partial">دفع جزء (عربون/دفعة جزئية)</option>
                  <option value="unpaid">دفع لاحقاً (غير مدفوع الآن)</option>
                </select>

                {paymentOption === 'partial' && (
                  <input
                    type="number"
                    min="1"
                    max={netTotalPrice}
                    placeholder="المبلغ المدفوع"
                    value={customPaidAmount}
                    onChange={(e) => setCustomPaidAmount(e.target.value)}
                    style={{ background: '#000', border: '1px solid #444', color: '#fff', padding: '8px', borderRadius: '8px', width: '110px', fontSize: '13px' }}
                  />
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>وسيلة الدفع</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ background: '#000', border: '1px solid #444', color: '#fff', padding: '8px', borderRadius: '8px', fontSize: '13px', width: '100%' }}
              >
                <option value="cash">كاش بالملعب</option>
                <option value="vodafone">فودافون كاش</option>
                <option value="card">فيزا / كارت</option>
              </select>
            </div>
          </div>

          {/* Row 3: Live Financial Summary & Confirm */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', borderTop: '1px solid #333', paddingTop: '12px' }}>
            <div style={{ display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#888', display: 'block' }}>قبل الخصم</span>
                <span style={{ fontSize: '14px', fontWeight: '700', textDecoration: calculatedDiscountAmount > 0 ? 'line-through' : 'none', color: '#bbb' }}>
                  {baseGrossPrice} ج.م
                </span>
              </div>

              {calculatedDiscountAmount > 0 && (
                <div>
                  <span style={{ fontSize: '11px', color: '#f59e0b', display: 'block' }}>قيمة الخصم</span>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#f59e0b' }}>
                    -{calculatedDiscountAmount} ج.م
                  </span>
                </div>
              )}

              <div>
                <span style={{ fontSize: '11px', color: '#888', display: 'block' }}>الصافي المطلوب</span>
                <span style={{ fontSize: '20px', fontWeight: '900', color: '#10b981' }}>
                  {netTotalPrice} ج.م
                </span>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#888', display: 'block' }}>المدفوع الآن</span>
                <span style={{ fontSize: '16px', fontWeight: '800', color: '#4ade80' }}>
                  {finalPaidAmount} ج.م
                </span>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#888', display: 'block' }}>المتبقي</span>
                <span style={{ fontSize: '16px', fontWeight: '800', color: (netTotalPrice - finalPaidAmount) > 0 ? '#ef4444' : '#4ade80' }}>
                  {Math.max(0, netTotalPrice - finalPaidAmount)} ج.م
                </span>
              </div>
            </div>

            <button 
              onClick={handleConfirmBooking}
              style={{
                background: '#10b981',
                color: '#000',
                border: 'none',
                padding: '12px 28px',
                borderRadius: '12px',
                fontWeight: '900',
                fontSize: '15px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
              }}
            >
              {isRecurring ? 'تأكيد الحجز المتكرر' : 'تأكيد الحجز وحفظ البيانات 🎉'}
            </button>
          </div>
        </div>
      )}

      {/* Modal for viewing clicked booked slot */}
      {activeBookingId && (
        <AdminBookingDetailModal
          bookingId={activeBookingId}
          onClose={() => setActiveBookingId(null)}
          onUpdated={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
}
