interface GammaGaugeProps {
  value: number;
  size?: 'sm' | 'lg';
}

export default function GammaGauge({ value, size = 'lg' }: GammaGaugeProps) {
  const getColor = (v: number) => {
    if (v >= 0.9) return { text: 'text-verba-green', bg: 'bg-verba-green', label: 'GREEN — Well governed' };
    if (v >= 0.5) return { text: 'text-verba-amber', bg: 'bg-verba-amber', label: 'AMBER — Partial coverage' };
    return { text: 'text-verba-red', bg: 'bg-verba-red', label: 'RED — Significant governance gaps' };
  };

  const color = getColor(value);
  const isLarge = size === 'lg';
  const circumference = 2 * Math.PI * 60;
  const filled = circumference * value;

  if (isLarge) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-verba-surface border border-verba-border">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
            <circle
              cx="70" cy="70" r="60"
              fill="none"
              stroke="#1e1e2e"
              strokeWidth="8"
            />
            <circle
              cx="70" cy="70" r="60"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={`${filled} ${circumference - filled}`}
              strokeLinecap="round"
              className={`${color.text} transition-all duration-1000 ease-out`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-verba-muted font-mono">&Gamma; =</span>
            <span className={`text-4xl font-bold font-mono ${color.text}`}>
              {value.toFixed(2)}
            </span>
          </div>
        </div>
        <span className={`text-sm font-medium ${color.text} gamma-pulse`}>
          ({color.label})
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`font-mono font-bold ${color.text}`}>
        &Gamma;={value.toFixed(2)}
      </span>
      <div className={`w-2 h-2 rounded-full ${color.bg} gamma-pulse`} />
    </div>
  );
}
