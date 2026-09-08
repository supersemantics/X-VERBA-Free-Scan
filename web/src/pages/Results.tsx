import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import GammaGauge from '../components/GammaGauge';
import FindingCard from '../components/FindingCard';
import TrendChart from '../components/TrendChart';
import GlossaryTerm from '../components/GlossaryTerm';
import { useSpotlight } from '../hooks/useSpotlight';
import { getContract, getScanHistory } from '../api/client';
import type { ScanResult, UngovernedNode, ScanHistoryEntry, ExportFormat } from '../types';

type Tab = 'overview' | 'findings' | 'history';
type SortKey = 'severity' | 'file' | 'type';

const severityOrder = { critical: 0, high: 1, medium: 2 };

const EXPORT_FORMATS: { value: ExportFormat; label: string; mime: string; ext: string }[] = [
  { value: 'yaml', label: 'YAML', mime: 'text/yaml', ext: 'yaml' },
  { value: 'json', label: 'JSON', mime: 'application/json', ext: 'json' },
  { value: 'txt', label: 'TXT', mime: 'text/plain', ext: 'txt' },
  { value: 'md', label: 'MD report', mime: 'text/markdown', ext: 'md' },
];

function sortNodes(nodes: UngovernedNode[], sortKey: SortKey): UngovernedNode[] {
  return [...nodes].sort((a, b) => {
    if (sortKey === 'severity') return severityOrder[a.severity] - severityOrder[b.severity];
    if (sortKey === 'file') return a.file.localeCompare(b.file);
    return a.drift_class.localeCompare(b.drift_class);
  });
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'findings', label: 'Findings' },
  { key: 'history', label: 'History' },
];

export default function Results() {
  const { scanId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const result = (location.state as { result?: ScanResult })?.result;
  const [tab, setTab] = useState<Tab>('overview');

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

  const noAi = result.gamma_status === 'NO_AI_INTEGRATIONS';
  const noFindings = !noAi && result.ungoverned_nodes.length === 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-verba-muted mb-1">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <span>/</span>
          <span className="text-white">{result.repo_name}</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-white tracking-tight">X-VERBA Governance Report</h1>
        <p className="text-sm text-verba-muted mt-1">
          Scanned {result.files_scanned} files &middot; {new Date(result.scan_date).toLocaleDateString()}
          {result.scan_duration_ms > 0 && <> &middot; {(result.scan_duration_ms / 1000).toFixed(1)}s</>}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-verba-border mb-8">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`text-sm pb-3 -mb-px border-b-2 transition-colors ${
              tab === key
                ? 'border-verba-accent text-white font-medium'
                : 'border-transparent text-verba-muted hover:text-white'
            }`}
          >
            {label}
            {key === 'findings' && result.ungoverned_nodes.length > 0 && (
              <span className="ml-2 text-xs bg-verba-red/20 text-verba-red px-1.5 py-0.5 rounded-full">
                {result.ungoverned_nodes.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab result={result} noAi={noAi} noFindings={noFindings} navigate={navigate} setTab={setTab} />}
      {tab === 'findings' && <FindingsTab result={result} scanId={scanId!} />}
      {tab === 'history' && <HistoryTab repoName={result.repo_name} />}
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({
  result,
  noAi,
  noFindings,
  navigate,
  setTab,
}: {
  result: ScanResult;
  noAi: boolean;
  noFindings: boolean;
  navigate: ReturnType<typeof useNavigate>;
  setTab: (tab: Tab) => void;
}) {
  const dcEntries = Object.entries(result.drift_class_summary).sort((a, b) => b[1] - a[1]);
  const spotlight = useSpotlight();

  if (noAi) {
    return (
      <div className="bg-verba-surface border border-verba-border rounded-2xl p-8 text-center">
        <div className="text-4xl mb-4">&#x1F50D;</div>
        <h2 className="font-display text-lg font-semibold text-white mb-2">No AI Integrations Detected</h2>
        <p className="text-sm text-verba-muted max-w-md mx-auto mb-4">
          X-Verba scanned <strong className="text-white">{result.files_scanned} files</strong> in{' '}
          <strong className="text-white">{result.repo_name}</strong> and found no AI SDK calls.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-verba-accent hover:bg-verba-accent/90 text-verba-bg px-6 py-2.5 rounded-lg transition-all text-sm font-semibold"
        >
          Scan Another Repo
        </button>
      </div>
    );
  }

  return (
    <div>
      {noFindings && (
        <div className="mb-8 bg-verba-surface border border-verba-green/30 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">&#x2705;</div>
          <h2 className="font-display text-lg font-semibold text-white mb-2">All Decision Points Governed</h2>
          <p className="text-sm text-verba-muted max-w-md mx-auto">
            Every decision point in this repo has a governance check. Structural Gamma:{' '}
            <strong className="text-verba-green">{result.gamma}</strong>.
          </p>
        </div>
      )}

      {/* Score + summary grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div
          onMouseMove={spotlight.onMouseMove}
          className={`bg-verba-surface border border-verba-border rounded-xl p-4 sm:col-span-1 transition-transform hover:-translate-y-0.5 ${spotlight.className}`}
        >
          <GammaGauge value={result.gamma} size="sm" />
          <div className="text-xs text-verba-muted mt-2">
            <GlossaryTerm id="GAMMA">Governance Score</GlossaryTerm>
          </div>
        </div>
        <div
          onMouseMove={spotlight.onMouseMove}
          className={`bg-verba-surface border border-verba-border rounded-xl p-4 transition-transform hover:-translate-y-0.5 ${spotlight.className}`}
        >
          <div className="text-3xl font-bold text-white">{result.ungoverned_nodes.length}</div>
          <div className="text-sm text-verba-muted">Ungoverned AI Calls</div>
        </div>
        <div
          onMouseMove={spotlight.onMouseMove}
          className={`bg-verba-surface border border-verba-border rounded-xl p-4 transition-transform hover:-translate-y-0.5 ${spotlight.className}`}
        >
          <div className="text-3xl font-bold text-white">{result.files_affected}</div>
          <div className="text-sm text-verba-muted">Files Affected</div>
        </div>
        <div
          onMouseMove={spotlight.onMouseMove}
          className={`bg-verba-accent/10 border border-verba-accent/40 rounded-xl p-4 transition-transform hover:-translate-y-0.5 ${spotlight.className}`}
        >
          <div className="text-3xl font-bold text-verba-accent">&Gamma;=0</div>
          <div className="text-sm text-verba-muted">vs typical agent repo</div>
        </div>
      </div>

      {/* Severity + Agent Frameworks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div
          onMouseMove={spotlight.onMouseMove}
          className={`bg-verba-surface border border-verba-border rounded-xl p-5 ${spotlight.className}`}
        >
          <h3 className="text-sm font-medium text-white mb-3">Severity</h3>
          <div className="space-y-2">
            {(['critical', 'high', 'medium'] as const).map((sev) => {
              const count = result.severity_breakdown[sev] || 0;
              const max = Math.max(1, ...Object.values(result.severity_breakdown));
              const color = sev === 'critical' ? 'bg-verba-red' : sev === 'high' ? 'bg-verba-amber' : 'bg-verba-muted';
              return (
                <div key={sev} className="flex items-center gap-3">
                  <span className="w-16 text-xs text-verba-muted capitalize">{sev}</span>
                  <div className="flex-1 h-2 bg-verba-bg rounded-full overflow-hidden">
                    <div className={`h-full ${color}`} style={{ width: `${(count / max) * 100}%` }} />
                  </div>
                  <span className="text-xs text-white w-4 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scoped to the 3 agentic frameworks this tool governs (LangChain,
            LangGraph, OpenAI Agents SDK) — no raw provider SDK badges (no
            Anthropic/Google/Cohere/etc.), since a direct provider API call
            isn't an agent-orchestration pattern this tool is about. */}
        <div
          onMouseMove={spotlight.onMouseMove}
          className={`bg-verba-surface border border-verba-border rounded-xl p-5 ${spotlight.className}`}
        >
          <h3 className="text-sm font-medium text-white mb-3">Agent Frameworks Detected</h3>
          <div className="flex flex-wrap gap-2">
            {result.frameworks_detected.length === 0 && (
              <span className="text-xs text-verba-muted">No agent frameworks detected</span>
            )}
            {result.frameworks_detected.map((fw) => (
              <span key={fw} className="text-xs bg-verba-bg border border-verba-border text-gray-300 px-2 py-1 rounded-full">
                {fw}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Drift class breakdown */}
      {dcEntries.length > 0 && (
        <div
          onMouseMove={spotlight.onMouseMove}
          className={`bg-verba-surface border border-verba-border rounded-xl p-5 mb-6 ${spotlight.className}`}
        >
          <h3 className="text-sm font-medium text-white mb-3">Drift Classes Detected</h3>
          <div className="space-y-2">
            {dcEntries.map(([code, count]) => {
              const node = result.ungoverned_nodes.find((n) => n.drift_class === code);
              return (
                <div key={code} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GlossaryTerm id={code}>
                      <span className="font-mono text-sm text-verba-accent">{code}</span>
                    </GlossaryTerm>
                    <span className="text-sm text-gray-400">{node?.drift_class_name || code}</span>
                  </div>
                  <span className="text-sm text-white font-mono">{count} {count === 1 ? 'instance' : 'instances'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CTA */}
      {result.ungoverned_nodes.length > 0 && (
        <div className="bg-verba-surface border-2 border-verba-accent/60 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-white font-semibold mb-1">
              {result.severity_breakdown.critical || 0} critical gaps found in this repo
            </h3>
            <p className="text-sm text-verba-muted">
              See how the full Scan API resolves cross-file coverage and tracks these over time.
            </p>
          </div>
          <button
            onClick={() => setTab('findings')}
            className="bg-verba-accent hover:bg-verba-accent/90 text-verba-bg px-5 py-2.5 rounded-lg transition-all text-sm font-semibold whitespace-nowrap"
          >
            View findings
          </button>
        </div>
      )}
    </div>
  );
}

// ── Findings tab (findings list + export) ────────────────────────────────────

function FindingsTab({ result, scanId }: { result: ScanResult; scanId: string }) {
  const [sortKey, setSortKey] = useState<SortKey>('severity');
  const [format, setFormat] = useState<ExportFormat>('yaml');
  const [contract, setContract] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setContract(null);
    getContract(scanId, format)
      .then(setContract)
      .catch(() => setContract('Failed to load contract. Try scanning again.'));
  }, [scanId, format]);

  const sorted = sortNodes(result.ungoverned_nodes, sortKey);
  const formatMeta = EXPORT_FORMATS.find((f) => f.value === format)!;

  const handleDownload = () => {
    if (!contract) return;
    const blob = new Blob([contract], { type: formatMeta.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `governance.${formatMeta.ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!contract) return;
    await navigator.clipboard.writeText(contract);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (result.ungoverned_nodes.length === 0) {
    return <p className="text-sm text-verba-muted">No ungoverned findings to show.</p>;
  }

  return (
    <div>
      {/* Contract stats + export — placed above the findings list so it's
          visible without scrolling past every finding card first. */}
      <div className="bg-verba-surface border border-verba-border rounded-xl p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex gap-6 text-sm">
            <div>
              <div className="text-verba-muted text-xs">Contract size</div>
              <div className="text-white font-mono">{result.contract_size_kb} KB</div>
            </div>
            <div>
              <div className="text-verba-muted text-xs">Pre-Nodes</div>
              <div className="text-white font-mono">{result.pre_nodes_count}</div>
            </div>
            <div>
              <div className="text-verba-muted text-xs">Test cases</div>
              <div className="text-white font-mono">{result.test_cases_count}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-verba-bg border border-verba-border rounded-lg p-1">
              {EXPORT_FORMATS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  className={`text-xs px-3 py-1.5 rounded-md transition-all ${
                    format === f.value
                      ? 'bg-verba-accent text-verba-bg font-semibold'
                      : 'text-verba-muted hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleDownload}
              disabled={!contract}
              className="bg-verba-accent hover:bg-verba-accent/90 disabled:opacity-50 text-verba-bg px-4 py-2 rounded-lg transition-all text-sm font-semibold"
            >
              Export
            </button>
            <button
              onClick={handleCopy}
              disabled={!contract}
              className="bg-verba-bg border border-verba-border hover:border-verba-accent disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-all text-sm"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-verba-muted hover:text-white text-sm px-2"
            >
              {showPreview ? 'Hide' : 'Preview'}
            </button>
          </div>
        </div>

        {showPreview && contract && (
          <pre className="bg-verba-bg border border-verba-border rounded-xl p-4 overflow-x-auto text-xs font-mono text-gray-300 max-h-96 overflow-y-auto">
            {contract}
          </pre>
        )}
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
                ? 'bg-verba-accent text-verba-bg font-semibold'
                : 'bg-verba-surface border border-verba-border text-verba-muted hover:text-white'
            }`}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
      </div>

      {/* Finding cards */}
      <div className="space-y-4 mb-8">
        {sorted.map((node, i) => (
          // Keyed by file+line+drift_class, not just file+line: a single call
          // site typically produces BOTH a DC-I11 and a DC-S7 finding at the
          // same location, so file:line alone collided into duplicate React
          // keys. With duplicate keys, React's reconciliation doesn't reorder
          // the DOM correctly when the sort key changes — this was the actual
          // cause of "Sort by" appearing to do nothing.
          <FindingCard key={`${node.file}:${node.line}:${node.drift_class}`} node={node} index={i} />
        ))}
      </div>
    </div>
  );
}

// ── History tab ───────────────────────────────────────────────────────────────

function HistoryTab({ repoName }: { repoName: string }) {
  const [entries, setEntries] = useState<ScanHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getScanHistory(repoName)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [repoName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin text-verba-accent text-2xl">&#x25CE;</div>
      </div>
    );
  }

  if (entries.length < 2) {
    return (
      <div className="bg-verba-surface border border-verba-border rounded-xl p-8 text-center text-verba-muted text-sm">
        Run a second scan on this repo to start tracking your Gamma trend here.
      </div>
    );
  }

  const current = entries[entries.length - 1];
  const prev = entries[entries.length - 2];
  const delta = current.gamma - prev.gamma;
  const trend = delta > 0 ? 'Improving' : delta < 0 ? 'Degrading' : 'Stable';

  return (
    <div>
      <div className="mb-6">
        <TrendChart entries={entries} />
      </div>

      <div className="space-y-3 mb-6">
        {[...entries].reverse().map((entry) => (
          <div
            key={entry.scan_id}
            className="bg-verba-surface border border-verba-border rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-300">
                {new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
              <GammaGauge value={entry.gamma} size="sm" />
            </div>
            <span className="text-sm text-verba-muted">{entry.node_count} ungoverned nodes</span>
          </div>
        ))}
      </div>

      <div className="bg-verba-surface border border-verba-border rounded-xl p-4">
        <span className="text-sm text-verba-muted">Trend: </span>
        <span className={`text-sm font-medium ${delta > 0 ? 'text-verba-green' : delta < 0 ? 'text-verba-red' : 'text-verba-muted'}`}>
          {trend} ({delta > 0 ? '+' : ''}{delta.toFixed(2)} this scan)
        </span>
      </div>
    </div>
  );
}
