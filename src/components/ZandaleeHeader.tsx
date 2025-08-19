
import { useState, useEffect } from "react";
import { Brain, Cpu, Activity, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsDrawer } from "./SettingsDrawer";
import LCARSHeader from "./lcars/LCARSHeader";

const ZandaleeHeader = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [uiStyle, setUIStyle] = useState<string>("lcars"); // Default to LCARS for testing

  // Load UI style from API or local storage
  useEffect(() => {
    const loadUIStyle = async () => {
      try {
        const API_BASE = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:8759';
        console.log('Attempting to load UI style from:', API_BASE);
        const response = await fetch(`${API_BASE}/config/ui`);
        if (response.ok) {
          const data = await response.json();
          const style = data.config?.ui_style || "lcars"; // Default to LCARS
          console.log('Loaded UI style:', style);
          setUIStyle(style);
          
          // Apply theme class to document
          const root = document.documentElement;
          root.classList.remove('theme-zandalee', 'theme-lcars');
          if (style === 'lcars') {
            root.classList.add('theme-lcars');
            console.log('Applied LCARS theme to document');
          } else {
            root.classList.add('theme-zandalee');
            console.log('Applied Zandalee theme to document');
          }
        } else {
          console.log('API response not OK, using LCARS default');
          setUIStyle("lcars");
          document.documentElement.classList.add('theme-lcars');
        }
      } catch (error) {
        console.log('Could not load UI style, using LCARS default:', error);
        setUIStyle("lcars");
        // Apply LCARS theme by default
        const root = document.documentElement;
        root.classList.remove('theme-zandalee', 'theme-lcars');
        root.classList.add('theme-lcars');
      }
    };

    loadUIStyle();
  }, []);

  console.log('Current UI Style:', uiStyle);

  // Force LCARS theme for now to test
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-zandalee', 'theme-lcars');
    root.classList.add('theme-lcars');
    console.log('Force applied LCARS theme');
  }, []);

  // Always render LCARS for testing
  return (
    <>
      <LCARSHeader onSettingsClick={() => setIsSettingsOpen(true)} />
      <SettingsDrawer 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </>
  );
};

export default ZandaleeHeader;
