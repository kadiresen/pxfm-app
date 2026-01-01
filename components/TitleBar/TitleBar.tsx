import React, { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { type } from "@tauri-apps/plugin-os";
import { X } from "lucide-react";
import "./TitleBar.scss";

const TitleBar: React.FC = () => {
  const [showTitleBar, setShowTitleBar] = useState(false);

  useEffect(() => {
    const checkPlatform = async () => {
      try {
        const osType = await type();
        // Show only on desktop platforms
        if (osType === 'linux' || osType === 'macos' || osType === 'windows') {
          setShowTitleBar(true);
        }
      } catch (error) {
        // If plugin-os fails (e.g. inside browser), we assume we don't want the custom titlebar
        // or we can strictly check if it's Tauri.
        // For standard web, we don't want it.
        console.debug("TitleBar: Not a Tauri desktop environment or error detecting OS", error);
      }
    };
    
    // Check if we are in Tauri environment first
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
       checkPlatform();
    }
  }, []);

  if (!showTitleBar) return null;

  const handleClose = async () => {
    try {
      await getCurrentWindow().close();
    } catch (e) {
      console.error("Failed to close window", e);
    }
  };

  const handleDrag = async (e: React.MouseEvent) => {
    // Prevent dragging if clicking on a button (though buttons usually swallow events)
    if ((e.target as HTMLElement).closest("button")) return;
    
    try {
      await getCurrentWindow().startDragging();
    } catch (e) {
      console.error("Failed to start dragging", e);
    }
  };

  return (
    <div 
      className="titlebar" 
      data-tauri-drag-region 
      onMouseDown={handleDrag}
    >
      <div className="titlebar-controls">
        <button className="titlebar-button close" onClick={handleClose}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;