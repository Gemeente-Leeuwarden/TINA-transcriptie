import { useCallback, useEffect, useRef } from "react";
import { buildWaveform } from "@/pages/login/lib/waveform";

export function useWaveformAnimation() {
  const waveRef = useRef<SVGPathElement>(null);
  const rafRef = useRef<number>(0);

  const animate = useCallback(() => {
    const time = performance.now() / 1000;
    waveRef.current?.setAttribute("d", buildWaveform(time));
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate]);

  return {
    waveRef,
  };
}
