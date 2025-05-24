
import { useEffect } from "react";

export const useNglBackground = (plugin: any) => {
  useEffect(() => {
    if (!plugin) return;
    
    // For Mol*, we need to apply different background settings
    const updateBackground = () => {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      
      // Function to handle theme changes
      const handleThemeChange = (e: MediaQueryListEvent | MediaQueryList) => {
        try {
          if (plugin && plugin.canvas3d) {
            // In Mol*, we set the background color differently
            plugin.canvas3d.setBackground(e.matches ? [0.1, 0.1, 0.1] : [1, 1, 1]);
            plugin.canvas3d.requestAnimation();
          }
        } catch (e) {
          console.error("Error updating Mol* background:", e);
        }
      };
      
      // Initialize with current theme
      handleThemeChange(mediaQuery);
      
      // Add listener for theme changes
      const listener = (e: MediaQueryListEvent) => handleThemeChange(e);
      mediaQuery.addEventListener("change", listener);
      
      return () => {
        mediaQuery.removeEventListener("change", listener);
      };
    };
    
    const cleanup = updateBackground();
    return cleanup;
  }, [plugin]);
};
