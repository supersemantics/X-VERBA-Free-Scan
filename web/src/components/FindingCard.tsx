import type { ReactNode } from 'react';
import type { UngovernedNode } from '../types';
import GlossaryTerm from './GlossaryTerm';
import { useSpotlight } from '../hooks/useSpotlight';

// Wraps every literal occurrence of "Pre-Node" in a GlossaryTerm — the
// recommendation/issue strings are plain hardcoded text from the API, so
// this is a fixed-literal split rather than general jargon auto-detection.
function linkifyPreNode(text: string): ReactNode {
  const parts = text.split(/(Pre-Node)/g);
  return parts.map((part, i) =>
    part === 'Pre-Node' ? <GlossaryTerm key={i} id="PRE_NODE">{part}</GlossaryTerm> : part,
  );
}

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
  const spotlight = useSpotlight();

  return (
    <div
      onMouseMove={spotlight.onMouseMove}
      className={`rounded-xl border ${style.border} ${style.bg} p-5 transition-all hover:border-opacity-60 ${spotlight.className}`}
    >
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

      <div className="mb-3 text-xs text-verba-muted">
        Detection confidence:{' '}
        <GlossaryTerm id={node.confidence === 'high' ? 'CONFIDENCE_HIGH' : 'CONFIDENCE_MEDIUM'}>
          {node.confidence === 'high' ? 'high (SDK match)' : 'medium (pattern match)'}
        </GlossaryTerm>
      </div>

      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <GlossaryTerm id={node.drift_class}>
            <span className="font-mono text-sm text-verba-accent">{node.drift_class}</span>
          </GlossaryTerm>
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
        <p className="text-sm text-gray-300">{linkifyPreNode(node.issue)}</p>
      </div>

      <div>
        <div className="text-xs text-verba-muted mb-1">Recommendation</div>
        <p className="text-sm text-verba-green/80">{linkifyPreNode(node.recommendation)}</p>
      </div>
    </div>
  );
}
