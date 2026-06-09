import { useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import FindingCard from '../components/FindingCard';
import type { ScanResult, UngovernedNode } from '../types';

type SortKey = 'severity' | 'file' | 'type';

const severityOrder = { critical: 0, high: 1, medium: 2 };

function sortNodes(nodes: UngovernedNode[], sortKey: SortKey): UngovernedNode[] {
  return [...nodes].sort((a, b) => {
    if (sortKey === 'severity') return severityOrder[a.severity] - severityOrder[b.severity];
    if (sortKey === 'file') return a.file.localeCompare(b.file);
    return a.drift_class.localeCompare(b.drift_class);
  });
}

export default function DetailedFindings() {
  const { scanId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const result = (location.state as { result?: ScanResult })?.result;
  const [sortKey, setSortKey] = useState<SortKey>('severity');

  if (!result) {
    return (
      <div className="text-center py-20">
        <p className="text-verba-muted">No scan data found.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-verba-accent hover:underline">
          Start a new scan
        </button>
      </div>
    );
  }

  const sorted = sortNodes(result.ungoverned_nodes, sortKey);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-verba-muted mb-1">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <button
              onClick={() => navigate(`/results/${scanId}`, { state: { result } })}
              className="hover:text-white transition-colors"
            >
              {result.repo_name}
            </button>
            <span>/</span>
            <span className="text-white">Findings</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            {result.ungoverned_nodes.length} Ungoverned AI Calls
          </h1>
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs text-verba-muted">Sort by:</span>
        {(['severity', 'file', 'type'] as SortKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setSortKey(key)}
            className={`text-xs px-3 py-1 rounded-full transition-all ${
              sortKey === key
                ? 'bg-verba-accent text-white'
                : 'bg-verba-surface border border-verba-border text-verba-muted hover:text-white'
            }`}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
      </div>

      {/* Finding Cards */}
      <div className="space-y-4 mb-8">
        {sorted.map((node, i) => (
          <FindingCard key={`${node.file}:${node.line}`} node={node} index={i} />
        ))}
      </div>

      {/* Bottom Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate(`/results/${scanId}`, { state: { result } })}
          className="bg-verba-surface border border-verba-border hover:border-verba-accent text-white py-2.5 px-5 rounded-xl transition-all text-sm"
        >
          Back to Dashboard
        </button>
        <button
          onClick={() => navigate(`/export/${scanId}`, { state: { result } })}
          className="bg-verba-accent hover:bg-verba-accent/90 text-white py-2.5 px-5 rounded-xl transition-all text-sm"
        >
          Export Contract
        </button>
      </div>
    </div>
  );
}
