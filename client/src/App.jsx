import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import PitchGrid from './components/PitchGrid';
import PitchDetailModal from './components/PitchDetailModal';
import BookingModal from './components/BookingModal';
import MyBookingsModal from './components/MyBookingsModal';
import RegisterPitchModal from './components/RegisterPitchModal';
import LoginModal from './components/LoginModal';
import HowItWorks from './components/HowItWorks';
import PitchOwnerCTA from './components/PitchOwnerCTA';
import Footer from './components/Footer';
import Toast from './components/Toast';
import { fetchPitches, fetchSettings } from './utils/api';

export default function App() {
  const [pitches, setPitches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    title: 'مَلعبك',
    slogan: 'المنصة رقم #1 لحجز ملاعب كرة القدم في مصر',
    heroTitle: 'احجز ملعبك ولعبتك تبدأ في دقيقة ⚽',
    heroSubtitle: 'اختر أفضل الملاعب الخماسية والسباعية القريبة منك، قارن الأسعار والتقييمات، وأكّد حجزك أونلاين بضغطة واحدة.',
    logoUrl: '',
    logoEmoji: '⚽'
  });
  const [filters, setFilters] = useState({
    area: 'الكل',
    type: 'الكل',
    search: '',
    sortBy: 'rating',
    date: new Date().toISOString().split('T')[0],
    hours: 1
  });

  // Modal States
  const [activeModal, setActiveModal] = useState(null); // 'detail' | 'booking' | 'myBookings' | 'registerPitch' | 'login'
  const [selectedPitch, setSelectedPitch] = useState(null);
  const [bookingParams, setBookingParams] = useState(null);
  const [toast, setToast] = useState(null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('malaeb_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const loadSettingsData = async () => {
    const res = await fetchSettings();
    if (res.success && res.data) {
      setSettings(res.data);
      if (res.data.title) {
        document.title = `${res.data.title} | ${res.data.slogan || ''}`;
      }
    }
  };

  const loadPitchesData = async () => {
    setLoading(true);
    const res = await fetchPitches(filters);
    if (res.success) {
      setPitches(res.data || []);
    } else {
      showToast('تعذر الاتصال بالسيرفر', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSettingsData();
  }, []);

  useEffect(() => {
    loadPitchesData();
  }, [filters.area, filters.type, filters.sortBy]);

  const handleSearchClick = () => {
    loadPitchesData();
    const el = document.getElementById('pitches');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleResetFilters = () => {
    setFilters({
      area: 'الكل',
      type: 'الكل',
      search: '',
      sortBy: 'rating',
      date: new Date().toISOString().split('T')[0],
      hours: 1
    });
  };

  const handleSelectPitch = (pitch) => {
    setSelectedPitch(pitch);
    setActiveModal('detail');
  };

  const handleProceedToBooking = (pitch, date, timeSlots, totalPrice) => {
    setBookingParams({ pitch, date, timeSlots, totalPrice });
    setActiveModal('booking');
  };

  const handleBookingSuccess = (newBooking) => {
    setActiveModal(null);
    showToast(`تم تأكيد الحجز بنجاح 🎉 كود الحجز: ${newBooking.id}`, 'success');
    loadPitchesData();
  };

  const handlePitchRegistered = (newPitch) => {
    setActiveModal(null);
    showToast(`تم إضافة ملعبك (${newPitch.name}) بنجاح 🎉`, 'success');
    loadPitchesData();
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('malaeb_user', JSON.stringify(userData));
    setActiveModal(null);
    showToast(`أهلاً بك! تم تسجيل الدخول بنجاح`, 'success');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('malaeb_user');
    showToast('تم تسجيل الخروج بنجاح 👋', 'info');
  };

  return (
    <div>
      {/* Top Navbar */}
      <Navbar
        settings={settings}
        user={user}
        onOpenLogin={() => setActiveModal('login')}
        onLogout={handleLogout}
        onOpenMyBookings={() => setActiveModal('myBookings')}
        onOpenRegisterPitch={() => setActiveModal('registerPitch')}
        onScrollToPitches={() => {
          document.getElementById('pitches')?.scrollIntoView({ behavior: 'smooth' });
        }}
        onScrollToHow={() => {
          document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Hero Search Section */}
      <Hero
        settings={settings}
        filters={filters}
        setFilters={setFilters}
        onSearch={handleSearchClick}
      />

      {/* Pitch Discovery Section */}
      <PitchGrid
        pitches={pitches}
        loading={loading}
        filters={filters}
        setFilters={setFilters}
        onSelectPitch={handleSelectPitch}
        onResetFilters={handleResetFilters}
      />

      {/* How it Works Section */}
      <HowItWorks />

      {/* Pitch Owner Banner */}
      <PitchOwnerCTA onRegisterClick={() => setActiveModal('registerPitch')} />

      {/* Footer */}
      <Footer settings={settings} />

      {/* Modals */}
      {activeModal === 'detail' && selectedPitch && (
        <PitchDetailModal
          pitch={selectedPitch}
          onClose={() => setActiveModal(null)}
          onProceedToBooking={handleProceedToBooking}
        />
      )}

      {activeModal === 'booking' && bookingParams && (
        <BookingModal
          bookingData={bookingParams}
          onClose={() => setActiveModal(null)}
          onBookingSuccess={handleBookingSuccess}
        />
      )}

      {activeModal === 'myBookings' && (
        <MyBookingsModal
          user={user}
          onClose={() => setActiveModal(null)}
          showToast={showToast}
        />
      )}

      {activeModal === 'registerPitch' && (
        <RegisterPitchModal
          onClose={() => setActiveModal(null)}
          onPitchRegistered={handlePitchRegistered}
        />
      )}

      {activeModal === 'login' && (
        <LoginModal
          onClose={() => setActiveModal(null)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* Toast Popups */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
