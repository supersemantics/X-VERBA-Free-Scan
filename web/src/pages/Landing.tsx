import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GammaGauge from '../components/GammaGauge';

// Demo recent scans (in production, fetched from API)
const recentScans = [
  { repo: 'anthropic-sdk', timeAgo: '2h ago', gamma: 0.35 },
  { repo: 'langgraph', timeAgo: '1d ago', gamma: 0.12 },
];

export default function Landing() {
  const [repoUrl, setRepoUrl] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleScan = () => {
    const trimmed = repoUrl.trim();
    if (!trimmed) {
      setError('Enter a GitHub repository URL');
      return;
    }
    // Basic URL validation
    if (!trimmed.match(/^https?:\/\/(www\.)?github\.com\/.+\/.+/i) && !trimmed.match(/^[^/]+\/[^/]+$/)) {
      setError('Enter a valid GitHub URL (e.g. https://github.com/org/repo)');
      return;
    }
    setError('');
    navigate('/scanning', { state: { repoUrl: trimmed } });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-3 tracking-tight">
          <span className="text-white">X-VERBA</span>
        </h1>
        <p className="text-xl text-verba-muted">
          Governance Scanner
        </p>
        <p className="text-sm text-verba-muted mt-2 max-w-md mx-auto">
          Find the governance gaps in your AI code before your users do.
          <br />
          Scan &rarr; See Problem &rarr; Export Solution.
        </p>
      </div>

      {/* Scan Input */}
      <div className="w-full max-w-lg">
        <div className="bg-verba-surface border border-verba-border rounded-2xl p-6">
          <label className="block text-sm text-verba-muted mb-2">
            Paste GitHub URL
          </label>
          <input
            type="url"
            value={repoUrl}
            onChange={(e) => { setRepoUrl(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            placeholder="https://github.com/org/repo"
            className="w-full bg-verba-bg border border-verba-border rounded-lg px-4 py-3 text-white placeholder-verba-muted/50 focus:outline-none focus:border-verba-accent transition-colors font-mono text-sm"
          />
          {error && (
            <p className="text-verba-red text-xs mt-2">{error}</p>
          )}
          <button
            onClick={handleScan}
            className="w-full mt-4 bg-verba-accent hover:bg-verba-accent/90 text-white font-medium py-3 rounded-lg transition-all hover:shadow-lg hover:shadow-verba-accent/20"
          >
            Scan
          </button>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1 h-px bg-verba-border" />
            <span className="text-xs text-verba-muted">or</span>
            <div className="flex-1 h-px bg-verba-border" />
          </div>
          <button className="w-full mt-3 border border-verba-border text-verba-muted hover:text-white hover:border-verba-accent py-2.5 rounded-lg transition-all text-sm flex items-center justify-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            GitHub OAuth
          </button>
        </div>
      </div>

      {/* Recent Scans */}
      <div className="w-full max-w-lg mt-8">
        <div className="border-t border-verba-border pt-6">
          <h3 className="text-sm text-verba-muted mb-3">Recent scans</h3>
          <div className="space-y-2">
            {recentScans.map((scan) => (
              <button
                key={scan.repo}
                onClick={() => setRepoUrl(`https://github.com/org/${scan.repo}`)}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-verba-surface border border-transparent hover:border-verba-border transition-all text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white">{scan.repo}</span>
                  <span className="text-xs text-verba-muted">({scan.timeAgo})</span>
                </div>
                <GammaGauge value={scan.gamma} size="sm" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
