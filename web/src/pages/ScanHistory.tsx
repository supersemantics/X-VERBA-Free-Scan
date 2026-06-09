import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getScanHistory } from '../api/client';
import TrendChart from '../components/TrendChart';
import GammaGauge from '../components/GammaGauge';
import type { ScanHistoryEntry } from '../types';

export default function ScanHistory() {
  const { repo } = useParams();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ScanHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!repo) return;
    getScanHistory(repo)
      .then(setEntries)
      .catch(() => {
        // Use demo data if API not available
        setEntries([
          { scan_id: 'demo-1', date: '2026-05-09', gamma: 0.15, node_count: 15 },
          { scan_id: 'demo-2', date: '2026-05-16', gamma: 0.29, node_count: 12 },
          { scan_id: 'demo-3', date: '2026-05-23', gamma: 0.35, node_count: 9 },
        ]);
      })
      .finally(() => setLoading(false));
  }, [repo]);

  const repoName = decodeURIComponent(repo || '');
  const current = entries[entries.length - 1];
  const prev = entries.length > 1 ? entries[entries.length - 2] : null;
  const delta = current && prev ? current.gamma - prev.gamma : 0;
  const trend = delta > 0 ? 'Improving' : delta < 0 ? 'Degrading' : 'Stable';

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-verba-muted mb-1">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <span>/</span>
          <span className="text-white">{repoName}</span>
          <span>/</span>
          <span className="text-white">History</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Scan History: {repoName}</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin text-verba-accent text-2xl">&#x25CE;</div>
        </div>
      ) : (
        <>
          {/* Trend Chart */}
          <div className="mb-8">
            <h2 className="text-xs uppercase tracking-wider text-verba-muted mb-3 font-medium">
              &Gamma; Trend (Last 30 days)
            </h2>
            <TrendChart entries={entries} />
          </div>

          <div className="h-px bg-verba-border my-8" />

          {/* Recent Scans List */}
          <div className="mb-8">
            <h2 className="text-xs uppercase tracking-wider text-verba-muted mb-4 font-medium">
              Recent Scans
            </h2>
            <div className="space-y-3">
              {[...entries].reverse().map((entry) => (
                <div
                  key={entry.scan_id}
                  className="bg-verba-surface border border-verba-border rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-300">
                      {new Date(entry.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <GammaGauge value={entry.gamma} size="sm" />
                  </div>
                  <span className="text-sm text-verba-muted">
                    {entry.node_count} ungoverned nodes
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Trend Summary */}
          {current && (
            <div className="bg-verba-surface border border-verba-border rounded-xl p-4 mb-8">
              <div className="flex items-center gap-2">
                <span className="text-sm text-verba-muted">Trend:</span>
                <span className={`text-sm font-medium ${
                  delta > 0 ? 'text-verba-green' : delta < 0 ? 'text-verba-red' : 'text-verba-muted'
                }`}>
                  {trend} ({delta > 0 ? '+' : ''}{delta.toFixed(2)} this week)
                </span>
              </div>
            </div>
          )}

          {/* Scan Again */}
          <button
            onClick={() => navigate('/')}
            className="bg-verba-accent hover:bg-verba-accent/90 text-white py-3 px-6 rounded-xl transition-all text-sm font-medium"
          >
            Scan Again
          </button>
        </>
      )}
    </div>
  );
}
