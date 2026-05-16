"use client";

import { useEffect, useRef } from "react";

export function UnicornStudioBackground() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = () => {
      const u = (window as any).UnicornStudio;
      if (u && u.init) {
        u.init();
      }
    };

    if ((window as any).UnicornStudio && (window as any).UnicornStudio.init) {
      init();
      return;
    }

    (window as any).UnicornStudio = { isInitialized: false };
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.1.12/dist/unicornStudio.umd.js";
    script.onload = init;
    document.head.appendChild(script);

    return () => {
      // Script persists for page lifetime; no cleanup needed
    };
  }, []);

  return (
    <div
      data-us-project="8xlrVlxyiA8xB9PQbLvc"
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}
