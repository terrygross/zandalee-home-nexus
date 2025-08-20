
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SafeSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}

export const SafeSelect: React.FC<SafeSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder
}) => {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || `Select ${label.toLowerCase()}`}
        list={`${label.toLowerCase()}-options`}
      />
      <datalist id={`${label.toLowerCase()}-options`}>
        {options.filter(opt => opt && opt.trim() !== '').map((option, index) => (
          <option key={index} value={option} />
        ))}
      </datalist>
    </div>
  );
};
