
import React from "react";
import { cn } from "@/lib/utils";
import LCARSReadout from "./LCARSReadout";

interface LCARSSystemStatusProps {
  className?: string;
}

const LCARSSystemStatus: React.FC<LCARSSystemStatusProps> = ({ className }) => {
  const readouts = [
    { label: "CPU", value: "87%", status: "success" as const },
    { label: "MEM", value: "42%", status: "normal" as const },
    { label: "NET", value: "1.2GB", status: "success" as const },
    { label: "PWR", value: "NOMINAL", status: "success" as const },
    { label: "TEMP", value: "32°C", status: "normal" as const },
    { label: "DISK", value: "78%", status: "warning" as const },
  ];

  return (
    <div className={cn("h-full overflow-auto", className)}>
      <div className="text-lcars-light-gray font-lcars-sans text-sm uppercase tracking-wider font-bold border-b border-lcars-orange/30 pb-2 mb-4">
        SYSTEM STATUS
      </div>
      <div className="space-y-4">
        {readouts.map((readout, index) => (
          <LCARSReadout
            key={index}
            label={readout.label}
            value={readout.value}
            status={readout.status}
          />
        ))}
      </div>
    </div>
  );
};

export default LCARSSystemStatus;
