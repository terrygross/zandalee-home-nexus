
import React from "react";
import { Brain, Cpu, Activity, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import LCARSPanel from "./LCARSPanel";
import LCARSButton from "./LCARSButton";
import LCARSDataDisplay from "./LCARSDataDisplay";
import LCARSSeparator from "./LCARSSeparator";

interface LCARSHeaderProps {
  onSettingsClick: () => void;
}

const LCARSHeader: React.FC<LCARSHeaderProps> = ({ onSettingsClick }) => {
  return (
    <LCARSPanel 
      title="COMPUTER ACCESS" 
      color="orange" 
      corner="top-left"
      className="w-full"
    >
      <div className="flex items-center justify-between">
        {/* Left Section - Identity */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-4">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center border-4 border-lcars-orange relative"
              style={{ 
                background: "linear-gradient(145deg, hsl(var(--lcars-orange)), hsl(var(--lcars-peach)))" 
              }}
            >
              <Brain className="w-8 h-8 text-black" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-lcars-teal rounded-full animate-pulse" />
            </div>
            
            <div>
              <h1 className="text-3xl font-bold uppercase tracking-wider text-lcars-peach glow-text">
                Zandalee
              </h1>
              <p className="text-lcars-light-gray uppercase text-sm tracking-widest">
                FAMILY DESKTOP AI • READY TO ASSIST
              </p>
            </div>
          </div>
          
          <LCARSSeparator color="orange" className="w-24 rotate-90 h-px" />
          
          {/* Status Displays */}
          <div className="flex space-x-8">
            <LCARSDataDisplay
              label="Voice Status" 
              value="ACTIVE"
              status="success"
            />
            <LCARSDataDisplay
              label="Processing"
              value="READY"
              status="normal" 
            />
            <LCARSDataDisplay
              label="System"
              value="1.0.0"
              status="normal"
            />
          </div>
        </div>
        
        {/* Right Section - Controls */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-lcars-teal">
            <Activity className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-wider">Voice Active</span>
          </div>
          
          <div className="flex items-center space-x-2 text-lcars-blue">
            <Cpu className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-wider">Processing</span>
          </div>

          <LCARSButton
            color="amber"
            corner="right"
            onClick={onSettingsClick}
            className="h-12 w-12 p-0"
            title="Open Settings"
          >
            <Settings className="w-5 h-5" />
          </LCARSButton>
        </div>
      </div>
    </LCARSPanel>
  );
};

export default LCARSHeader;
