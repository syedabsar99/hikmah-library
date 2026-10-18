import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface WarningMeterProps {
  count: number; // 0 to 10
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const WarningMeter: React.FC<WarningMeterProps> = ({
  count,
  showLabel = true,
  size = 'md',
}) => {
  const safeCount = Math.min(10, Math.max(0, count));

  // Determine segment coloring
  const getSegmentClass = (segmentIndex: number) => {
    if (segmentIndex >= safeCount) return ''; // inactive
    if (safeCount <= 3) return 'active-low';
    if (safeCount <= 7) return 'active-mid';
    return 'active-high';
  };

  const getStatusText = () => {
    if (safeCount === 0) return { label: 'Clear Record', color: '#10B981', bg: '#ECFDF5' };
    if (safeCount <= 3) return { label: `${safeCount}/10 (Minor Advisory)`, color: '#D97706', bg: '#FFFBEB' };
    if (safeCount <= 7) return { label: `${safeCount}/10 (Severe Warning)`, color: '#EA580C', bg: '#FFF7ED' };
    if (safeCount < 10) return { label: `${safeCount}/10 (Critical Watchlist)`, color: '#DC2626', bg: '#FEF2F2' };
    return { label: '10/10 (Registration Review Triggered)', color: '#991B1B', bg: '#FEE2E2' };
  };

  const status = getStatusText();
  const height = size === 'sm' ? '6px' : size === 'lg' ? '12px' : '8px';

  return (
    <div className="warning-meter-container" style={{ width: '100%' }}>
      {showLabel && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span
            style={{
              fontSize: size === 'sm' ? '0.75rem' : '0.82rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              color: status.color,
            }}
          >
            {safeCount >= 8 ? <ShieldAlert size={14} /> : safeCount > 0 ? <AlertTriangle size={14} /> : null}
            {status.label}
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: status.color }}>
            {safeCount}/10
          </span>
        </div>
      )}

      {/* 10 Individual Visual Segments */}
      <div className="warning-segments">
        {Array.from({ length: 10 }).map((_, idx) => (
          <div
            key={idx}
            className={`warning-segment ${getSegmentClass(idx)}`}
            style={{ height }}
            title={`Warning Segment ${idx + 1}/10`}
          />
        ))}
      </div>
    </div>
  );
};
