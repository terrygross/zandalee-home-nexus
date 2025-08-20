
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SafeSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  fallbackToInput?: boolean;
}

export const SafeSelect: React.FC<SafeSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  fallbackToInput = true
}) => {
  // Filter out any empty or invalid options
  const validOptions = options.filter(opt => opt && typeof opt === 'string' && opt.trim() !== '');
  
  // If no valid options or fallbackToInput is true, use Input with datalist
  if (validOptions.length === 0 || fallbackToInput) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || `Select ${label.toLowerCase()}`}
          list={`${label.toLowerCase().replace(/\s+/g, '-')}-options`}
        />
        <datalist id={`${label.toLowerCase().replace(/\s+/g, '-')}-options`}>
          {validOptions.map((option, index) => (
            <option key={index} value={option} />
          ))}
        </datalist>
      </div>
    );
  }

  // Use Select component only with valid options
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder || `Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {validOptions.map((option, index) => (
            <SelectItem key={index} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
