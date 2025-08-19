
import React from "react";
import { cn } from "@/lib/utils";
import LCARSReadout from "./LCARSReadout";
import LCARSVBar from "./LCARSVBar";

interface LCARSRightRailProps {
  className?: string;
}

const LCARSRightRail: React.FC<LCARSRightRailProps> = ({ className }) => {
  const railData = [
    { number: "25", value: "READY", color: "teal" },
    { number: "920", value: "ONLINE", color: "orange" },
    { number: "5", value: "ACTIVE", color: "amber" },
    { number: "62", value: "STABLE", color: "blue" },
    { number: "56", value: "NORMAL", color: "violet" },
  ];

  return (
    <div className={cn("w-48 bg-lcars-black p-4 space-y-4", className)}>
      {/* Numeric Rails with Status */}
      {railData.map((item, index) => (
        <div key={index} className="flex items-center space-x-3">
          <span className="font-lcars-mono text-lcars-amber text-xl font-bold w-12">
            {item.number}
          </span>
          <LCARSReadout
            label=""
            value={item.value}
            status={item.color as any}
            className="flex-1"
          />
        </div>
      ))}
      
      {/* Vertical Meters */}
      <div className="space-y-4 mt-8">
        <LCARSVBar value={75} color="orange" height={120} />
        <LCARSVBar value={60} color="blue" height={100} />
        <LCARSVBar value={90} color="teal" height={140} />
      </div>
      
      {/* Additional Readouts */}
      <div className="space-y-2 mt-8">
        <LCARSReadout label="CPU" value="12%" status="normal" />
        <LCARSReadout label="MEM" value="8.2GB" status="normal" />
        <LCARSReadout label="NET" value="CONN" status="success" />
      </div>
    </div>
  );
};

export default LCARSRightRail;
