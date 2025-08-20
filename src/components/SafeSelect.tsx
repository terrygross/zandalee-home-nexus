
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
  fallbackToInput = true // Default to true to avoid Select issues
}) => {
  // Filter out any empty, null, undefined, or invalid options more aggressively
  const validOptions = options.filter(opt => 
    opt && 
    typeof opt === 'string' && 
    opt.trim() !== '' && 
    opt !== null && 
    opt !== undefined
  );
  
  // Always use Input with datalist for safety - this avoids all Select.Item issues
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || `Select ${label.toLowerCase()}`}
        list={`${label.toLowerCase().replace(/\s+/g, '-')}-options`}
      />
      {validOptions.length > 0 && (
        <datalist id={`${label.toLowerCase().replace(/\s+/g, '-')}-options`}>
          {validOptions.map((option, index) => (
            <option key={`${option}-${index}`} value={option} />
          ))}
        </datalist>
      )}
    </div>
  );
};
