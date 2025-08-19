
import React from "react";
import { cn } from "@/lib/utils";
import LCARSReadout from "./LCARSReadout";
import LCARSVBar from "./LCARSVBar";

interface LCARSRightRailProps {
  className?: string;
}

const LCARSRightRail: React.FC<LCARSRightRailProps> = ({ className }) => {
  const railNumbers = ["25", "920", "5", "62", "56", "381", "44"];
  const readouts = [
    { label: "CPU", value: "87%", status: "success" as const },
    { label: "MEM", value: "42%", status: "normal" as const },
    { label: "NET", value: "1.2GB", status: "success" as const },
    { label: "PWR", value: "NOMINAL", status: "success" as const },
  ];

  return (
    <div className={cn("w-48 bg-lcars-black flex flex-col h-full", className)}>
      {/* Numeric Rail with readouts */}
      <div className="p-3 space-y-4 flex-1 overflow-auto">
        {railNumbers.map((number, index) => (
          <div key={index} className="flex items-center space-x-3">
            <span className="font-lcars-mono text-white text-xl font-bold tracking-wider w-12 text-right">
              {number}
            </span>
            <div className="flex-1">
              <LCARSVBar 
                value={Math.random() * 100}
                height={20 + (index * 8)} 
                color={index % 2 === 0 ? "teal" : "amber"}
              />
            </div>
          </div>
        ))}
        
        {/* System Readouts */}
        <div className="space-y-3 mt-6 pt-6 border-t border-lcars-orange/30">
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
      
      {/* Bottom Elbow */}
      <div className="h-16 bg-lcars-blue rounded-tl-lcars-elbow flex-shrink-0" />
    </div>
  );
};

export default LCARSRightRail;
