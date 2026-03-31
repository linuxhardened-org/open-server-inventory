import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion } from 'framer-motion';

export type SvSelectOption = {
  value: string;
  label: string;
  /** Image URL shown as an icon */
  icon?: string;
  /** Coloured dot (hex / hsl string) */
  iconColor?: string;
  /** Small badge label, e.g. "soon" */
  badge?: string;
  disabled?: boolean;
};

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: SvSelectOption[];
  placeholder?: string;
  /** Compact inline mode — smaller padding, auto width */
  compact?: boolean;
  style?: React.CSSProperties;
};

export function SvSelect({ value, onChange, options, placeholder, compact, style }: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div style={{ position: 'relative', display: compact ? 'inline-block' : 'block', ...style }}>
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => setOpen(false)} />
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: compact ? 'auto' : '100%',
          display: 'inline-flex',
          alignItems: 'center',
          gap: compact ? 5 : 8,
          padding: compact ? '3px 8px' : '8px 12px',
          background: 'hsl(var(--surface-2))',
          border: `1px solid ${open ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
          borderRadius: compact ? 5 : 7,
          cursor: 'pointer',
          transition: 'border-color 150ms',
          fontSize: compact ? 12 : 13,
          color: selected ? 'hsl(var(--fg))' : 'hsl(var(--fg-3))',
          whiteSpace: 'nowrap',
        }}
      >
        {selected?.iconColor && (
          <span style={{
            width: compact ? 7 : 8,
            height: compact ? 7 : 8,
            borderRadius: '50%',
            background: selected.iconColor,
            flexShrink: 0,
          }} />
        )}
        {selected?.icon && (
          <img
            src={selected.icon}
            alt=""
            style={{ width: compact ? 14 : 18, height: compact ? 14 : 18, objectFit: 'contain', flexShrink: 0 }}
          />
        )}
        <span style={{ flex: compact ? undefined : 1, textAlign: 'left' }}>
          {selected?.label ?? placeholder ?? 'Select…'}
        </span>
        <ChevronDown style={{
          width: compact ? 11 : 13,
          height: compact ? 11 : 13,
          color: 'hsl(var(--fg-3))',
          flexShrink: 0,
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 180ms',
        }} />
      </button>

      {/* Dropdown */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.12 }}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            minWidth: compact ? 120 : '100%',
            zIndex: 99,
            background: 'hsl(var(--surface))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 9,
            boxShadow: '0 8px 24px hsl(var(--bg) / 0.5)',
            padding: 4,
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={opt.disabled}
                onClick={() => {
                  if (opt.disabled) return;
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: compact ? '5px 8px' : '7px 10px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: opt.disabled ? 'default' : 'pointer',
                  background: isSelected ? 'hsl(var(--primary) / 0.1)' : 'transparent',
                  opacity: opt.disabled ? 0.4 : 1,
                  transition: 'background 100ms',
                  fontSize: compact ? 12 : 13,
                  color: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--fg))',
                  fontWeight: isSelected ? 600 : 400,
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (!opt.disabled && !isSelected)
                    (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--surface-3))';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected)
                    (e.currentTarget as HTMLButtonElement).style.background = isSelected
                      ? 'hsl(var(--primary) / 0.1)'
                      : 'transparent';
                }}
              >
                {opt.iconColor && (
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.iconColor, flexShrink: 0 }} />
                )}
                {opt.icon && (
                  <img src={opt.icon} alt="" style={{ width: 18, height: 18, objectFit: 'contain', flexShrink: 0 }} />
                )}
                <span style={{ flex: 1 }}>{opt.label}</span>
                {opt.badge && (
                  <span style={{
                    fontSize: 10,
                    padding: '1px 5px',
                    borderRadius: 4,
                    background: 'hsl(var(--surface-3))',
                    color: 'hsl(var(--fg-3))',
                    border: '1px solid hsl(var(--border))',
                  }}>
                    {opt.badge}
                  </span>
                )}
                {isSelected && (
                  <Check style={{ width: 12, height: 12, color: 'hsl(var(--primary))', flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
