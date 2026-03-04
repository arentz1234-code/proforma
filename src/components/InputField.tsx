'use client';

import { useState, useEffect } from 'react';

interface InputFieldNumberProps {
  label?: string;
  value: number | '';
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
  placeholder?: never;
  size?: 'sm' | 'md' | 'lg';
  showEditableIndicator?: boolean;
}

interface InputFieldStringProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: never;
  suffix?: never;
  step?: never;
  min?: never;
  max?: never;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  showEditableIndicator?: boolean;
}

type InputFieldProps = InputFieldNumberProps | InputFieldStringProps;

// Format number with commas
function formatWithCommas(num: number | ''): string {
  if (num === '' || num === 0) return '';
  return num.toLocaleString('en-US');
}

// Parse string with commas back to number
function parseWithCommas(str: string): number {
  const cleaned = str.replace(/,/g, '');
  return parseFloat(cleaned) || 0;
}

export default function InputField(props: InputFieldProps) {
  const { label, value, prefix, suffix, size = 'md' } = props;

  const sizeClasses = {
    sm: 'py-2 px-3 text-sm',
    md: 'py-3 px-4 text-base',
    lg: 'py-3.5 px-4 text-lg',
  };

  const isStringInput = typeof props.value === 'string' && !prefix && !suffix;

  if (isStringInput) {
    const { onChange, placeholder } = props as InputFieldStringProps;
    return (
      <div className="input-group">
        {label && <label className="input-label">{label}</label>}
        <input
          type="text"
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`input-field ${sizeClasses[size]}`}
        />
      </div>
    );
  }

  const { onChange, step = 1, min, max } = props as InputFieldNumberProps;
  const isCurrency = prefix === '$';

  // For currency fields, use formatted text input
  const [displayValue, setDisplayValue] = useState(formatWithCommas(value as number));
  const [isFocused, setIsFocused] = useState(false);

  // Update display value when external value changes
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatWithCommas(value as number));
    }
  }, [value, isFocused]);

  if (isCurrency) {
    return (
      <div className="input-group">
        {label && <label className="input-label">{label}</label>}
        <div className="input-wrapper">
          <span className="input-prefix">{prefix}</span>
          <input
            type="text"
            value={isFocused ? displayValue : formatWithCommas(value as number)}
            onChange={(e) => {
              // Allow only numbers and commas
              const raw = e.target.value.replace(/[^0-9,]/g, '');
              setDisplayValue(raw);
              onChange(parseWithCommas(raw));
            }}
            onFocus={() => {
              setIsFocused(true);
              setDisplayValue(value === '' ? '' : String(value));
            }}
            onBlur={() => {
              setIsFocused(false);
              setDisplayValue(formatWithCommas(value as number));
            }}
            className={`input-field ${sizeClasses[size]} has-prefix`}
          />
        </div>
      </div>
    );
  }

  // Regular number input for non-currency
  return (
    <div className="input-group">
      {label && <label className="input-label">{label}</label>}
      <div className="input-wrapper">
        {prefix && <span className="input-prefix">{prefix}</span>}
        <input
          type="number"
          value={value === '' ? '' : value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          step={step}
          min={min}
          max={max}
          className={`input-field ${sizeClasses[size]} ${prefix ? 'has-prefix' : ''} ${suffix ? 'has-suffix' : ''}`}
        />
        {suffix && <span className="input-suffix">{suffix}</span>}
      </div>
    </div>
  );
}

// Export OutputField for calculated values
export function OutputField({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="output-box">
      <div className="output-label">{label}</div>
      <div className="output-value">{value}</div>
    </div>
  );
}
