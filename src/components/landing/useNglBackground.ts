import { useEffect } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import * as NGL from "ngl";

/**
 * Sets the NGL Stage background to match the current theme.
 * Light: white. Dark: #18181b (tailwind zinc-900)
 */
export function useNglBackground(stage: NGL.Stage | null) {
  const { theme } = useTheme();

  useEffect(() => {
    if (!stage) return;
    let mode = theme;
    if (theme === "system") {
      mode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    if (mode === "dark") {
      stage.setParameters({ backgroundColor: "#000000" });
    } else {
      stage.setParameters({ backgroundColor: "#fff" });
    }
  }, [stage, theme]);
}
