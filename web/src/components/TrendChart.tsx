import type { ScanHistoryEntry } from '../types';

interface TrendChartProps {
  entries: ScanHistoryEntry[];
}

export default function TrendChart({ entries }: TrendChartProps) {
  if (entries.length === 0) return null;

  const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const maxGamma = 1.0;
  const chartWidth = 600;
  const chartHeight = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const plotW = chartWidth - padding.left - padding.right;
  const plotH = chartHeight - padding.top - padding.bottom;

  const points = sorted.map((entry, i) => ({
    x: padding.left + (sorted.length === 1 ? plotW / 2 : (i / (sorted.length - 1)) * plotW),
    y: padding.top + plotH - (entry.gamma / maxGamma) * plotH,
    ...entry,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = pathD + ` L ${points[points.length - 1].x} ${padding.top + plotH} L ${points[0].x} ${padding.top + plotH} Z`;

  const getColor = (v: number) => {
    if (v >= 0.9) return '#67AA38'; // verba.green — brand accent, reused for "governed"
    if (v >= 0.5) return '#F59E0B'; // verba.amber
    return '#F43F5E'; // verba.red
  };

  const currentGamma = sorted[sorted.length - 1]?.gamma ?? 0;
  const prevGamma = sorted.length > 1 ? sorted[sorted.length - 2].gamma : currentGamma;
  const delta = currentGamma - prevGamma;

  const yLabels = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <div className="bg-verba-surface border border-verba-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white">&Gamma; Trend</h3>
        <div className="flex items-center gap-2 text-xs">
          {delta !== 0 && (
            <span className={delta > 0 ? 'text-verba-green' : 'text-verba-red'}>
              {delta > 0 ? '+' : ''}{delta.toFixed(2)} this scan
            </span>
          )}
          <span className={`font-mono font-bold ${
            currentGamma >= 0.9 ? 'text-verba-green' :
            currentGamma >= 0.5 ? 'text-verba-amber' : 'text-verba-red'
          }`}>
            &Gamma;={currentGamma.toFixed(2)}
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {yLabels.map(v => {
          const y = padding.top + plotH - (v / maxGamma) * plotH;
          return (
            <g key={v}>
              <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="#333333" strokeWidth={1} />
              <text x={padding.left - 6} y={y + 4} textAnchor="end" fill="#9A9A9A" fontSize={10} fontFamily="monospace">
                {v.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Threshold line */}
        <line
          x1={padding.left}
          y1={padding.top + plotH - (0.9 / maxGamma) * plotH}
          x2={chartWidth - padding.right}
          y2={padding.top + plotH - (0.9 / maxGamma) * plotH}
          stroke="#67AA38"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.4}
        />

        {/* Area fill */}
        <path d={areaD} fill={getColor(currentGamma)} opacity={0.08} />

        {/* Line */}
        <path d={pathD} fill="none" stroke={getColor(currentGamma)} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill={getColor(p.gamma)} />
            <circle cx={p.x} cy={p.y} r={2} fill="#1A1A1A" />
            {/* Date label */}
            <text x={p.x} y={chartHeight - 5} textAnchor="middle" fill="#9A9A9A" fontSize={9} fontFamily="monospace">
              {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
