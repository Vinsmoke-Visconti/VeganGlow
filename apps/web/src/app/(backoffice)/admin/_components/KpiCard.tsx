import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import styles from '../admin-shared.module.css';

type Props = {
  label: string;
  value: string;
  delta?: number | null;
  deltaSuffix?: string;
  icon?: LucideIcon;
  hint?: string;
};

function formatDelta(d: number): string {
  const sign = d >= 0 ? '+' : '';
  return `${sign}${d.toFixed(1)}%`;
}

export function KpiCard({ label, value, delta, deltaSuffix, icon: Icon, hint }: Props) {
  const trend =
    delta == null ? 'flat' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';

  return (
    <div className={styles.kpiCard}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className={styles.kpiLabel}>
          {label}
        </span>
        {Icon && (
          <span style={{ display: 'flex', height: '32px', width: '32px', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--vg-radius-sm)', background: 'var(--vg-parchment-100)', color: 'var(--vg-ink-500)' }}>
            <Icon size={15} strokeWidth={1.75} />
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span className={styles.kpiValue}>
          {value}
        </span>

        <div className={styles.kpiDelta}>
          {trend === 'up' && (
            <span className={styles.kpiDeltaUp}>
              <ArrowUpRight size={13} strokeWidth={2.25} />
              {delta != null && formatDelta(delta)}
            </span>
          )}
          {trend === 'down' && (
            <span className={styles.kpiDeltaDown}>
              <ArrowDownRight size={13} strokeWidth={2.25} />
              {delta != null && formatDelta(delta)}
            </span>
          )}
          {trend === 'flat' && delta != null && (
            <span style={{ color: 'var(--vg-ink-500)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Minus size={13} strokeWidth={2.25} />
              0%
            </span>
          )}
          {hint && <span style={{ color: 'var(--vg-ink-500)' }}>{hint}</span>}
          {delta != null && deltaSuffix && trend !== 'flat' && (
            <span style={{ color: 'var(--vg-ink-500)' }}>{deltaSuffix}</span>
          )}
        </div>
      </div>
    </div>
  );
}
