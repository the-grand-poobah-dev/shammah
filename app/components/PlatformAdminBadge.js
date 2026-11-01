import { Crown } from 'lucide-react';

export default function PlatformAdminBadge({ compact = false }) {
  return (
    <span
      className="platform-admin-badge"
      title="Platform Administrator"
      aria-label="Platform Administrator"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: compact ? '2px 7px' : '4px 10px', borderRadius: 999,
        color: '#facc15', background: 'rgba(234, 179, 8, 0.12)',
        border: '1px solid rgba(234, 179, 8, 0.65)',
        fontSize: compact ? 10 : 12, fontWeight: 750, lineHeight: 1.25,
        whiteSpace: 'nowrap', verticalAlign: 'middle',
      }}
    >
      <Crown size={compact ? 12 : 14} strokeWidth={2.5} aria-hidden="true" />
      Platform Admin
    </span>
  );
}
