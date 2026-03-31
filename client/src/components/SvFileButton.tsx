import { useRef } from 'react';
import { Upload } from 'lucide-react';

type Props = {
  onFile: (file: File) => void;
  accept?: string;
  label?: string;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
};

export function SvFileButton({
  onFile,
  accept = 'image/*',
  label = 'Choose File',
  loading = false,
  disabled = false,
  icon,
  style,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  };

  const isDisabled = disabled || loading;

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        onChange={handleChange}
        style={{ display: 'none' }}
        disabled={isDisabled}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={isDisabled}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '7px 14px',
          background: 'hsl(var(--surface-2))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 7,
          cursor: isDisabled ? 'default' : 'pointer',
          fontSize: 13,
          color: 'hsl(var(--fg))',
          transition: 'border-color 150ms, background 150ms',
          opacity: isDisabled ? 0.5 : 1,
          whiteSpace: 'nowrap',
          ...style,
        }}
        onMouseEnter={(e) => {
          if (!isDisabled)
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'hsl(var(--primary))';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'hsl(var(--border))';
        }}
      >
        {icon ?? <Upload style={{ width: 14, height: 14, flexShrink: 0 }} />}
        {loading ? 'Processing…' : label}
      </button>
    </>
  );
}
