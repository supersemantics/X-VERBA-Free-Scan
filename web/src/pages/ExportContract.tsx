import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { getContract } from '../api/client';
import type { ScanResult } from '../types';

export default function ExportContract() {
  const { scanId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const result = (location.state as { result?: ScanResult })?.result;
  const [yaml, setYaml] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (scanId) {
      getContract(scanId)
        .then(setYaml)
        .catch(() => setYaml('# Failed to load contract. Try scanning again.'));
    }
  }, [scanId]);

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

  const handleDownload = () => {
    if (!yaml) return;
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'governance.yaml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!yaml) return;
    await navigator.clipboard.writeText(yaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
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
          <span className="text-white">Export</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Governance Contract Ready</h1>
        <p className="text-sm text-verba-muted mt-1">{result.repo_name}</p>
      </div>

      {/* Contract Summary */}
      <div className="bg-verba-surface border border-verba-border rounded-2xl p-6 mb-6">
        <p className="text-sm text-gray-300 mb-4">
          Your <span className="font-mono text-verba-accent">governance.yaml</span> contract is ready.
        </p>

        <div className="mb-6">
          <h3 className="text-sm font-medium text-white mb-3">This contract defines:</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-center gap-2">
              <span className="text-verba-accent">&#x2022;</span>
              <span><strong>{result.pre_nodes_count}</strong> Pre-Nodes (input validation points)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-verba-accent">&#x2022;</span>
              <span><strong>{result.stabilisation_operators_count}</strong> Stabilisation Operators (behavioral controls)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-verba-accent">&#x2022;</span>
              <span><strong>{result.test_cases_count}</strong> Test Cases (to verify governance)</span>
            </li>
          </ul>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-medium text-white mb-3">What to do next:</h3>
          <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
            <li>Download <span className="font-mono text-verba-accent">governance.yaml</span></li>
            <li>Copy it to your repo root</li>
            <li>Implement the Pre-Nodes defined in the contract</li>
            <li>Run the test cases to verify</li>
          </ol>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <button
          onClick={handleDownload}
          disabled={!yaml}
          className="flex-1 bg-verba-accent hover:bg-verba-accent/90 disabled:opacity-50 text-white py-3 px-4 rounded-xl transition-all text-sm font-medium flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download YAML
        </button>
        <button
          onClick={handleCopy}
          disabled={!yaml}
          className="flex-1 bg-verba-surface border border-verba-border hover:border-verba-accent disabled:opacity-50 text-white py-3 px-4 rounded-xl transition-all text-sm font-medium flex items-center justify-center gap-2"
        >
          {copied ? (
            <>
              <span className="text-verba-green">&#x2713;</span>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy to Clipboard
            </>
          )}
        </button>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex-1 bg-verba-surface border border-verba-border hover:border-verba-accent text-verba-muted hover:text-white py-3 px-4 rounded-xl transition-all text-sm font-medium"
        >
          {showPreview ? 'Hide' : 'View'} YAML Preview
        </button>
      </div>

      {/* YAML Preview */}
      {showPreview && yaml && (
        <div className="mb-6">
          <pre className="bg-verba-bg border border-verba-border rounded-xl p-4 overflow-x-auto text-xs font-mono text-gray-300 max-h-96 overflow-y-auto">
            {yaml}
          </pre>
        </div>
      )}

      {/* Meta */}
      <div className="bg-verba-surface border border-verba-border rounded-xl p-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-verba-muted text-xs">Contract Size</div>
            <div className="text-white font-mono">{result.contract_size_kb} KB</div>
          </div>
          <div>
            <div className="text-verba-muted text-xs">Format</div>
            <div className="text-white font-mono">YAML</div>
          </div>
          <div>
            <div className="text-verba-muted text-xs">Compatible with</div>
            <div className="text-white">All CI/CD pipelines</div>
          </div>
        </div>
      </div>
    </div>
  );
}
