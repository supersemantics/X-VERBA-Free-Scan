import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GammaGauge from '../components/GammaGauge';
import { getRecentScans } from '../lib/recentScans';
import { FEATURED_SCANS } from '../data/featuredScans';
import { useSpotlight } from '../hooks/useSpotlight';

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Landing() {
  const [repoUrl, setRepoUrl] = useState('');
  const [error, setError] = useState('');
  const [openingFeatured, setOpeningFeatured] = useState<string | null>(null);
  const navigate = useNavigate();
  const recentScans = getRecentScans();
  const spotlight = useSpotlight();

  // The server loads the same featured results at startup, so export,
  // history and the shareable link all work without uploading anything.
  const openFeatured = (slug: string) => {
    const featured = FEATURED_SCANS.find((f) => f.slug === slug);
    if (!featured) return;
    setOpeningFeatured(slug);
    // Only a summary is bundled; the report page fetches the full result.
    navigate(`/results/${featured.result.scan_id}`);
  };

  const handleScan = () => {
    const trimmed = repoUrl.trim();
    if (!trimmed) {
      setError('Paste a GitHub repository link to scan');
      return;
    }
    // Light check only: the server understands every shape GitHub links come
    // in (org/repo, github.com/…, branch, folder and file links) and gives a
    // precise message when it can't use one.
    if (!/github\.com[/:]/i.test(trimmed) && !/^[\w.-]+\/[\w.-]+\/?$/.test(trimmed)) {
      setError('Paste a GitHub link, e.g. https://github.com/org/repo, a branch link (…/tree/<branch>), or just org/repo');
      return;
    }
    setError('');
    navigate('/scanning', { state: { repoUrl: trimmed } });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="font-display text-6xl font-bold mb-3 tracking-tight">
          <span className="bg-gradient-to-r from-white via-white to-verba-accent bg-clip-text text-transparent">
            X-VERBA
          </span>
        </h1>
        <p className="font-display text-xl font-medium text-verba-muted tracking-tight">
          Agent Governance Scanner
        </p>
        <p className="text-sm text-verba-muted mt-2 max-w-md mx-auto">
          Find governance gaps in your AI agents before they act.
          <br />
          Scan &rarr; See Problem &rarr; Export Solution.
        </p>
      </div>

      {/* Featured scans — real, pre-computed results on real public agent apps */}
      <div className="w-full max-w-3xl mb-10">
        <h3 className="text-sm text-verba-muted mb-3 text-center">See it on real AI agents</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {FEATURED_SCANS.map(({ slug, blurb, result }) => (
            <button
              key={slug}
              onClick={() => openFeatured(slug)}
              onMouseMove={spotlight.onMouseMove}
              disabled={openingFeatured !== null}
              className={`text-left bg-verba-surface border border-verba-border hover:border-verba-accent rounded-xl p-4 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 ${spotlight.className}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{result.repo_name}</span>
                <GammaGauge value={result.gamma} size="sm" />
              </div>
              <p className="text-xs text-verba-muted mb-3">{blurb}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {result.agent_actions && result.agent_actions.total.total > 0 ? (
                  <span
                    className={`px-2 py-0.5 rounded-full ${
                      result.agent_actions.total.governed === result.agent_actions.total.total
                        ? 'bg-verba-green/20 text-verba-green'
                        : 'bg-verba-red/20 text-verba-red'
                    }`}
                  >
                    {result.agent_actions.total.governed}/{result.agent_actions.total.total} agent actions governed
                  </span>
                ) : (
                  <span className="bg-verba-red/20 text-verba-red px-2 py-0.5 rounded-full">
                    {result.severity_breakdown.critical} critical
                  </span>
                )}
                <span className="text-verba-muted">{result.files_scanned.toLocaleString()} files scanned</span>
              </div>
              {openingFeatured === slug && (
                <p className="text-xs text-verba-accent mt-2">Loading&hellip;</p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Scan Input */}
      <div className="w-full max-w-lg">
        <div
          onMouseMove={spotlight.onMouseMove}
          className={`bg-verba-surface border border-verba-border rounded-2xl p-6 ${spotlight.className}`}
        >
          <label className="block text-sm text-verba-muted mb-2">
            Or paste your own GitHub link
          </label>
          <input
            type="text"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={repoUrl}
            onChange={(e) => { setRepoUrl(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            placeholder="https://github.com/org/repo  or  org/repo"
            className="w-full bg-verba-bg border border-verba-border rounded-lg px-4 py-3 text-white placeholder-verba-muted/50 focus:outline-none focus:border-verba-accent transition-colors font-mono text-sm"
          />
          {error && (
            <p className="text-verba-red text-xs mt-2">{error}</p>
          )}
          <button
            onClick={handleScan}
            className="w-full mt-4 bg-verba-accent hover:bg-verba-accent/90 text-verba-bg font-semibold py-3 rounded-lg transition-all hover:shadow-lg hover:shadow-verba-accent/20"
          >
            Scan
          </button>
          <p className="mt-3 text-xs text-verba-muted text-center">
            Public GitHub repositories only. No sign-in needed. For private code, run the{' '}
            <a
              href="https://github.com/supersemantics/X-verba-CLI"
              target="_blank"
              rel="noopener noreferrer"
              className="text-verba-accent hover:underline"
            >
              x-verba CLI
            </a>{' '}
            locally.
          </p>
        </div>
      </div>

      {/* Your recent scans — real, from this browser's own history only */}
      {recentScans.length > 0 && (
        <div className="w-full max-w-lg mt-8">
          <div className="border-t border-verba-border pt-6">
            <h3 className="text-sm text-verba-muted mb-3">Your recent scans</h3>
            <div className="space-y-2">
              {recentScans.map((scan) => (
                <button
                  key={scan.repoUrl}
                  onClick={() => setRepoUrl(scan.repoUrl)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-verba-surface border border-transparent hover:border-verba-border transition-all text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white">{scan.repoName}</span>
                    <span className="text-xs text-verba-muted">({timeAgo(scan.scannedAt)})</span>
                  </div>
                  <GammaGauge value={scan.gamma} size="sm" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
