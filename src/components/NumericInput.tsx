import { useState, type InputHTMLAttributes } from 'react';
import { MAX_INPUT_VALUE, parseNumericInput } from '../utils/numericInput';

type NumericInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'type' | 'onChange' | 'min' | 'max'> & {
  value: number;
  onValueChange: (value: number) => void;
  max?: number;
};

export function NumericInput({ value, onValueChange, max = MAX_INPUT_VALUE, onFocus, onBlur, ...props }: NumericInputProps) {
  const [draft, setDraft] = useState<{ text: string; value: number } | null>(null);
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  // External updates (room selection, catalog prices, geometry) override stale drafts.
  const displayValue = draft?.value === safeValue ? draft.text : String(safeValue);
  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onFocus={(event) => {
        if (safeValue === 0) setDraft({ text: '', value: 0 });
        onFocus?.(event);
      }}
      onChange={(event) => {
        const next = parseNumericInput(event.target.value, max);
        if (!next) return;
        setDraft(next);
        onValueChange(next.value);
      }}
      onBlur={(event) => {
        setDraft(null);
        onBlur?.(event);
      }}
    />
  );
}
