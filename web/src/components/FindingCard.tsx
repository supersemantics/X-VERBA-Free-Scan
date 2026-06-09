import type { UngovernedNode } from '../types';

const severityStyles = {
  critical: {
    border: 'border-verba-red/30',
    bg: 'bg-verba-red/5',
    badge: 'bg-verba-red/20 text-verba-red',
    label: 'Critical',
  },
  high: {
    border: 'border-verba-amber/30',
    bg: 'bg-verba-amber/5',
    badge: 'bg-verba-amber/20 text-verba-amber',
    label: 'High',
  },
  medium: {
    border: 'border-verba-accent/30',
    bg: 'bg-verba-accent/5',
    badge: 'bg-verba-accent/20 text-verba-accent',
    label: 'Medium',
  },
};

export default function FindingCard({ node, index }: { node: UngovernedNode; index: number }) {
  const style = severityStyles[node.severity];

  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} p-5 transition-all hover:border-opacity-60`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-verba-muted text-xs font-mono">Finding {index + 1}</span>
          <span className="text-white text-sm font-medium">
            {node.file}:{node.line}
          </span>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
          {style.label}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-sm text-verba-accent">{node.drift_class}</span>
          <span className="text-sm text-white">{node.drift_class_name}</span>
        </div>
      </div>

      <div className="mb-3">
        <div className="text-xs text-verba-muted mb-1">Location</div>
        <div className="text-sm text-gray-300">
          {node.file}, line {node.line}
        </div>
      </div>

      <div className="mb-3">
        <div className="text-xs text-verba-muted mb-1">Code</div>
        <pre className="text-xs font-mono bg-verba-bg rounded-lg p-3 overflow-x-auto text-gray-300 border border-verba-border">
          {node.code}
        </pre>
      </div>

      <div className="mb-3">
        <div className="text-xs text-verba-muted mb-1">Issue</div>
        <p className="text-sm text-gray-300">{node.issue}</p>
      </div>

      <div>
        <div className="text-xs text-verba-muted mb-1">Recommendation</div>
        <p className="text-sm text-verba-green/80">{node.recommendation}</p>
      </div>
    </div>
  );
}
