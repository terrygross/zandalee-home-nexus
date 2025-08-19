
import React from "react";
import { cn } from "@/lib/utils";
import LCARSPillButton from "./LCARSPillButton";

const LCARSFooterBar: React.FC = () => {
  return (
    <div className="h-16 bg-lcars-black border-t-2 border-lcars-orange/40 flex items-center px-6 space-x-4">
      <LCARSPillButton color="orange" tag="01" className="text-black hover:text-black font-bold">
        LCARS
      </LCARSPillButton>
      <LCARSPillButton color="blue" tag="02" className="text-black hover:text-black font-bold">
        MODE SELECT
      </LCARSPillButton>
      <LCARSPillButton color="amber" tag="03" className="text-black hover:text-black font-bold">
        RESET
      </LCARSPillButton>
      
      <div className="flex-1" />
      
      <div className="flex items-center space-x-4 text-white font-lcars-mono text-sm font-bold">
        <span>STARDATE: {new Date().getFullYear()}.{String(new Date().getMonth() + 1).padStart(2, '0')}</span>
        <div className="w-2 h-2 bg-lcars-teal rounded-full animate-pulse" />
        <span>SYSTEM NOMINAL</span>
      </div>
    </div>
  );
};

export default LCARSFooterBar;
