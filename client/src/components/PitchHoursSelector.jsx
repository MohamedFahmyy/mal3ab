import React, { useState } from 'react';
import { Clock, Check, Sparkles, RefreshCw } from 'lucide-react';
import { formatSlotTime, generateHoursRange } from '../utils/timeFormat';

const ALL_24_HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + ':00');

export default function PitchHoursSelector({ selectedSlots = [], onChange, timeFormat = '12h' }) {
  const [startRange, setStartRange] = useState('16:00');
  const [endRange, setEndRange] = useState('01:00');

  const isSelected = (slot) => selectedSlots.includes(slot);

  const toggleSlot = (slot) => {
    if (isSelected(slot)) {
      onChange(selectedSlots.filter(s => s !== slot));
    } else {
      // Keep sorted chronologically or in order of addition
      const updated = [...selectedSlots, slot];
      onChange(updated);
    }
  };

  const handleApplyRange = () => {
    const range = generateHoursRange(startRange.split(':')[0], endRange.split(':')[0]);
    onChange(range);
  };

  const setPreset = (presetName) => {
    if (presetName === 'evening') {
      onChange(['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00', '01:00']);
    } else if (presetName === 'all24') {
      onChange([...ALL_24_HOURS]);
    } else if (presetName === 'day_evening') {
      onChange(['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00']);
    } else if (presetName === 'night') {
      onChange(['20:00', '21:00', '22:00', '23:00', '00:00', '01:00', '02:00', '03:00']);
    }
  };

  return (
    <div style={{
      background: '#f8faf9',
      border: '1px solid #dce8e0',
      borderRadius: '14px',
      padding: '16px',
      marginTop: '6px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '14px', color: 'var(--dark)' }}>
          <Clock size={16} color="var(--primary)" />
          <span>ساعات عمل وتشغيل الملعب:</span>
        </div>
        <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--primary)', background: '#e8f5ed', padding: '3px 10px', borderRadius: '20px' }}>
          {selectedSlots.length} ساعة عمل محددة
        </div>
      </div>

      {/* Quick Presets */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '700' }}>
          نماذج سريعة جاهزة:
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setPreset('evening')}
            style={{
              background: '#ffffff',
              border: '1px solid #d0e0d5',
              borderRadius: '8px',
              padding: '5px 10px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              color: '#166534'
            }}
          >
            🌙 مسائي شائع (4 م إلى 2 ص)
          </button>

          <button
            type="button"
            onClick={() => setPreset('all24')}
            style={{
              background: '#ffffff',
              border: '1px solid #d0e0d5',
              borderRadius: '8px',
              padding: '5px 10px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              color: '#075985'
            }}
          >
            ⏰ 24 ساعة (طوال اليوم)
          </button>

          <button
            type="button"
            onClick={() => setPreset('day_evening')}
            style={{
              background: '#ffffff',
              border: '1px solid #d0e0d5',
              borderRadius: '8px',
              padding: '5px 10px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              color: '#854d0e'
            }}
          >
            ☀️ نهار ومساء (10 ص - 12 ص)
          </button>

          <button
            type="button"
            onClick={() => onChange([])}
            style={{
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              padding: '5px 10px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              color: '#991b1b'
            }}
          >
            مسح الكل
          </button>
        </div>
      </div>

      {/* Custom Range Generator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '8px 12px',
        marginBottom: '14px',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>من الساعة:</span>
        <select
          value={startRange}
          onChange={(e) => setStartRange(e.target.value)}
          style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
        >
          {ALL_24_HOURS.map(h => (
            <option key={h} value={h}>{formatSlotTime(h, timeFormat)} ({h})</option>
          ))}
        </select>

        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>إلى الساعة:</span>
        <select
          value={endRange}
          onChange={(e) => setEndRange(e.target.value)}
          style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
        >
          {ALL_24_HOURS.map(h => (
            <option key={h} value={h}>{formatSlotTime(h, timeFormat)} ({h})</option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleApplyRange}
          style={{
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '5px 12px',
            fontSize: '12px',
            fontWeight: '800',
            cursor: 'pointer'
          }}
        >
          تطبيق الفترة
        </button>
      </div>

      {/* 24-Hours Clickable Matrix */}
      <div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '700' }}>
          اضغط على أي ساعة لتفعيلها أو تعطيلها في الملعب:
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))',
          gap: '6px',
          maxHeight: '170px',
          overflowY: 'auto',
          padding: '4px'
        }}>
          {ALL_24_HOURS.map(slot => {
            const active = isSelected(slot);
            return (
              <button
                key={slot}
                type="button"
                onClick={() => toggleSlot(slot)}
                style={{
                  background: active ? '#10b981' : '#ffffff',
                  color: active ? '#ffffff' : '#475569',
                  border: active ? '1px solid #059669' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '6px 2px',
                  fontSize: '11px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  transition: 'all 0.15s'
                }}
              >
                {active && <Check size={12} strokeWidth={3} />}
                <span>{formatSlotTime(slot, timeFormat)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
