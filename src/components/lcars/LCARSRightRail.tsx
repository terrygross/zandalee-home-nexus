
import React from "react";
import { cn } from "@/lib/utils";
import LCARSReadout from "./LCARSReadout";
import LCARSVBar from "./LCARSVBar";

interface LCARSRightRailProps {
  className?: string;
}

const LCARSRightRail: React.FC<LCARSRightRailProps> = ({ className }) => {
  const railNumbers = ["25", "920", "5", "62", "56"];
  const readouts = [
    { label: "CPU", value: "87%", status: "success" as const },
    { label: "MEM", value: "42%", status: "normal" as const },
    { label: "NET", value: "1.2GB", status: "success" as const },
    { label: "PWR", value: "NOMINAL", status: "success" as const },
  ];

  return (
    <div className={cn("w-48 bg-lcars-black flex flex-col h-full border-l border-lcars-blue/20", className)}>
      {/* Top Spacer */}
      <div className="h-4 flex-shrink-0" />
      
      {/* Numeric Rail with readouts */}
      <div className="p-4 space-y-4 flex-1 overflow-auto">
        {railNumbers.map((number, index) => (
          <div key={index} className="flex items-center space-x-3">
            <span className="font-lcars-mono text-white text-lg font-bold tracking-wider w-12 text-right">
              {number}
            </span>
            <div className="flex-1">
              <LCARSVBar 
                value={Math.random() * 100}
                height={16 + (index * 6)} 
                color={index % 2 === 0 ? "teal" : "amber"}
              />
            </div>
          </div>
        ))}
        
        {/* System Readouts */}
        <div className="space-y-4 mt-8 pt-6 border-t border-lcars-blue/30">
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
      
      {/* Bottom Spacer */}
      <div className="h-4 flex-shrink-0" />
    </div>
  );
};

export default LCARSRightRail;
