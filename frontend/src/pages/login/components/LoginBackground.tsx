import { OPACITY, VH, VW } from "@/pages/login/lib/waveform";

export function LoginBackground({ waveRef }: { waveRef: React.RefObject<SVGPathElement | null> }) {
  return (
    <>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b84e6a" />
            <stop offset="50%" stopColor="#6b4d8a" />
            <stop offset="100%" stopColor="#1a3055" />
          </linearGradient>
        </defs>

        <rect width={VW} height={VH} fill="url(#bgGrad)" />
        <path ref={waveRef} fill="white" fillOpacity={OPACITY} />
      </svg>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[15%] -left-[10%] h-[500px] w-[500px] rounded-full bg-rose-400/15 blur-[120px] animate-[blob-1_20s_ease-in-out_infinite]" />
        <div className="absolute -bottom-[15%] -right-[10%] h-[450px] w-[450px] rounded-full bg-blue-400/15 blur-[120px] animate-[blob-2_25s_ease-in-out_infinite]" />
      </div>
    </>
  );
}
