import { useRef } from "react";

interface TotpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
}

const TotpInput: React.FC<TotpInputProps> = ({ value, onChange, onComplete }) => {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    if (val.length > 1) {
      // Handle paste
      const pastedValue = val.slice(0, 6).replace(/\D/g, '');
      onChange(pastedValue);
      if (pastedValue.length === 6) {
        onComplete?.(pastedValue);
        inputs.current[5]?.focus();
      }
      return;
    }

    if (!/^\d*$/.test(val)) return;

    const newValue = value.split('');
    newValue[index] = val;
    const finalValue = newValue.join('');
    onChange(finalValue);

    if (val && index < 5) {
      inputs.current[index + 1]?.focus();
    }

    if (finalValue.length === 6 && onComplete) {
      onComplete(finalValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          type="text"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          className="w-12 h-14 text-center text-2xl font-bold bg-surface border-2 border-border rounded-lg focus:border-primary focus:outline-none transition-colors"
        />
      ))}
    </div>
  );
};

export default TotpInput;
