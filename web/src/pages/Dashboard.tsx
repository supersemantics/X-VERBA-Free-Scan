import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import GammaGauge from '../components/GammaGauge';
import type { ScanResult } from '../types';

export default function Dashboard() {
  const { scanId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const result = (location.state as { result?: ScanResult })?.result;

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

  const uniqueFiles = new Set(result.ungoverned_nodes.map(n => n.file));
  const dcEntries = Object.entries(result.drift_class_summary).sort((a, b) => b[1] - a[1]);

  const severityCounts = {
    critical: result.ungoverned_nodes.filter(n => n.severity === 'critical').length,
    high: result.ungoverned_nodes.filter(n => n.severity === 'high').length,
    medium: result.ungoverned_nodes.filter(n => n.severity === 'medium').length,
  };

  const noAi = result.gamma_status === 'NO_AI_INTEGRATIONS';
  const noFindings = !noAi && result.ungoverned_nodes.length === 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-verba-muted mb-1">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <span>/</span>
          <span className="text-white">{result.repo_name}</span>
        </div>
        <h1 className="text-2xl font-bold text-white">X-VERBA Governance Report</h1>
        <p className="text-sm text-verba-muted mt-1">
          Scanned {result.files_scanned} files &middot; {new Date(result.scan_date).toLocaleDateString()}
        </p>
      </div>

      {/* No AI integrations banner */}
      {noAi && (
        <div className="mb-8 bg-verba-surface border border-verba-border rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">&#x1F50D;</div>
          <h2 className="text-lg font-semibold text-white mb-2">No AI Integrations Detected</h2>
          <p className="text-sm text-verba-muted max-w-md mx-auto mb-4">
            X-Verba scanned <strong className="text-white">{result.files_scanned} files</strong> in <strong className="text-white">{result.repo_name}</strong> and
            found no AI SDK calls (OpenAI, Anthropic, LangChain, etc.).
          </p>
          <p className="text-xs text-verba-muted max-w-md mx-auto mb-6">
            Governance analysis applies to code that makes AI API calls, chains AI outputs, or triggers
            irreversible actions from AI decisions. This repository does not appear to contain those patterns.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-verba-accent hover:bg-verba-accent/90 text-white px-6 py-2.5 rounded-lg transition-all text-sm font-medium"
          >
            Scan Another Repo
          </button>
        </div>
      )}

      {/* Clean bill banner */}
      {noFindings && (
        <div className="mb-8 bg-verba-surface border border-verba-green/30 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">&#x2705;</div>
          <h2 className="text-lg font-semibold text-white mb-2">All Decision Points Governed</h2>
          <p className="text-sm text-verba-muted max-w-md mx-auto">
            X-Verba found AI integrations in this repo and every decision point has a governance check.
            Structural Gamma: <strong className="text-verba-green">{result.gamma}</strong>.
          </p>
        </div>
      )}

      {/* Gamma Score — show only when there's something to score */}
      {!noAi && (
        <div className="mb-8">
          <h2 className="text-xs uppercase tracking-wider text-verba-muted mb-3 font-medium">
            Governance Score
          </h2>
          <GammaGauge value={result.gamma} size="lg" />
        </div>
      )}

      {!noAi && <div className="h-px bg-verba-border my-8" />}

      {/* Findings Summary */}
      {result.ungoverned_nodes.length > 0 && (
      <div className="mb-8">
        <h2 className="text-xs uppercase tracking-wider text-verba-muted mb-4 font-medium">
          Findings
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-verba-surface border border-verba-border rounded-xl p-4">
            <div className="text-3xl font-bold text-white">{result.ungoverned_nodes.length}</div>
            <div className="text-sm text-verba-muted">Ungoverned AI Calls</div>
          </div>
          <div className="bg-verba-surface border border-verba-border rounded-xl p-4">
            <div className="text-3xl font-bold text-white">{uniqueFiles.size}</div>
            <div className="text-sm text-verba-muted">Files Affected</div>
          </div>
          <div className="bg-verba-surface border border-verba-border rounded-xl p-4">
            <div className="text-3xl font-bold text-white">{dcEntries.length}</div>
            <div className="text-sm text-verba-muted">Drift Classes</div>
          </div>
        </div>

        {/* Severity Breakdown */}
        <div className="flex items-center gap-4 mb-6">
          {severityCounts.critical > 0 && (
            <span className="text-xs bg-verba-red/20 text-verba-red px-2 py-1 rounded-full">
              {severityCounts.critical} Critical
            </span>
          )}
          {severityCounts.high > 0 && (
            <span className="text-xs bg-verba-amber/20 text-verba-amber px-2 py-1 rounded-full">
              {severityCounts.high} High
            </span>
          )}
          {severityCounts.medium > 0 && (
            <span className="text-xs bg-verba-accent/20 text-verba-accent px-2 py-1 rounded-full">
              {severityCounts.medium} Medium
            </span>
          )}
        </div>

        {/* Drift Class Breakdown */}
        <div className="bg-verba-surface border border-verba-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-white mb-3">Drift Classes Detected</h3>
          <div className="space-y-2">
            {dcEntries.map(([code, count]) => (
              <div key={code} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-verba-accent">{code}</span>
                  <span className="text-sm text-gray-400">
                    {getDriftClassName(code)}
                  </span>
                </div>
                <span className="text-sm text-white font-mono">{count} {count === 1 ? 'instance' : 'instances'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {result.ungoverned_nodes.length > 0 && <div className="h-px bg-verba-border my-8" />}

      {/* Actions */}
      {!noAi && (
      <div>
        <h2 className="text-xs uppercase tracking-wider text-verba-muted mb-4 font-medium">
          Actions
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate(`/findings/${scanId}`, { state: { result } })}
            className="flex-1 bg-verba-surface border border-verba-border hover:border-verba-accent text-white py-3 px-4 rounded-xl transition-all text-sm font-medium"
          >
            View Detailed Findings
          </button>
          <button
            onClick={() => navigate(`/export/${scanId}`, { state: { result } })}
            className="flex-1 bg-verba-accent hover:bg-verba-accent/90 text-white py-3 px-4 rounded-xl transition-all text-sm font-medium"
          >
            Export Governance Contract
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 bg-verba-surface border border-verba-border hover:border-verba-accent text-verba-muted hover:text-white py-3 px-4 rounded-xl transition-all text-sm font-medium"
          >
            Scan Again
          </button>
        </div>
      </div>
      )}
    </div>
  );
}

function getDriftClassName(code: string): string {
  const names: Record<string, string> = {
    'DC-E1': 'Threshold Assault',
    'DC-E2': 'Contradiction Injection',
    'DC-E5': 'Dominance Forcing',
    'DC-E13': 'Chained AI Propagation',
    'DC-E14': 'Irreversible Action Risk',
    'DC-I6': 'Structural Cascade Rupture',
    'DC-I11': 'Evaluative Decoupling',
    'DC-L2': 'Prompt Boundary Violation',
    'DC-P4': 'Parameter Drift',
    'DC-S3': 'Flash Crash Cluster',
    'DC-S7': 'Semantic Shift',
  };
  return names[code] || code;
}
