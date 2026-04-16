import { useState, useEffect, useRef } from "react";

export function useElementSize<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;
    
    // Initial size
    const initialWidth = Math.round(ref.current.offsetWidth);
    const initialHeight = Math.round(ref.current.offsetHeight);
    setSize({ width: initialWidth, height: initialHeight });

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const newWidth = Math.round(entry.contentRect.width);
        const newHeight = Math.round(entry.contentRect.height);
        
        setSize((prev) => {
          if (prev.width === newWidth && prev.height === newHeight) return prev;
          return { width: newWidth, height: newHeight };
        });
      }
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}
