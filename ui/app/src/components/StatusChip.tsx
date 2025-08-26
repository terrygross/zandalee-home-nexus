import { cn } from "@/lib/utils";

interface StatusChipProps {
  label: string;
  status: 'online' | 'offline' | 'active' | 'inactive' | 'listening' | 'speaking';
  value?: string | number;
  className?: string;
}

export function StatusChip({ label, status, value, className }: StatusChipProps) {
  const getStatusStyles = () => {
    switch (status) {
      case 'online':
        return 'bg-success/20 text-success border-success/30 shadow-glow-accent';
      case 'offline':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'active':
      case 'listening':
        return 'bg-primary/20 text-primary border-primary/30 shadow-glow-primary animate-pulse-glow';
      case 'speaking':
        return 'bg-warning/20 text-warning border-warning/30 shadow-glow-accent animate-pulse-glow';
      case 'inactive':
      default:
        return 'bg-muted/20 text-muted-foreground border-muted/30';
    }
  };

  return (
    <div className={cn(
      "px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-300",
      "backdrop-blur-sm flex items-center gap-2",
      getStatusStyles(),
      className
    )}>
      <div className={cn(
        "w-1.5 h-1.5 rounded-full",
        status === 'online' ? 'bg-success' :
        status === 'offline' ? 'bg-destructive' :
        status === 'active' || status === 'listening' ? 'bg-primary' :
        status === 'speaking' ? 'bg-warning' :
        'bg-muted-foreground'
      )} />
      <span>{label}</span>
      {value !== undefined && (
        <span className="font-mono opacity-80">
          {typeof value === 'number' && label.includes('Mic') 
            ? `${Math.round(value)}%` 
            : value}
        </span>
      )}
    </div>
  );
}