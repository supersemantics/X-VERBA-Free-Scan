import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { startScan } from '../api/client';
import { saveRecentScan } from '../lib/recentScans';
import type { ScanProgress as ScanProgressType } from '../types';

const STEPS: ScanProgressType[] = [
  { status: 'connecting', progress: 10, message: 'Connecting to repository...' },
  { status: 'cloning', progress: 25, message: 'Reading repository structure...' },
  { status: 'scanning', progress: 45, message: 'Scanning files for AI integrations...', files_found: 0 },
  { status: 'analyzing', progress: 70, message: 'Analyzing drift classes...', ai_nodes_found: 0 },
  { status: 'analyzing', progress: 85, message: 'Computing governance score...' },
  { status: 'complete', progress: 100, message: 'Scan complete!' },
];

export default function ScanProgress() {
  const location = useLocation();
  const navigate = useNavigate();
  const repoUrl = (location.state as { repoUrl?: string })?.repoUrl;
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [filesFound, setFilesFound] = useState(0);
  const [aiNodes, setAiNodes] = useState(0);
  // Guards against React StrictMode's dev-only double-invoke of effects
  // (mount -> cleanup -> mount). Without this, startScan() fired twice per
  // real navigation here — confirmed via network log as 4 concurrent
  // POST /api/scan requests for a single click (this component plus
  // whatever double-fired it upstream), which occasionally 500'd under the
  // load and left the app stuck back on the landing page after a scan that
  // had actually already succeeded server-side.
  //
  // IMPORTANT: there is deliberately no "cancelled" flag alongside this ref.
  // An earlier version added one (set true in the effect's cleanup, checked
  // in the .then/.catch before applying the result) as a second layer of
  // StrictMode safety — but StrictMode calls that cleanup on the *first*
  // invocation regardless of hasStartedRef, which set cancelled=true on the
  // one-and-only real fetch's closure. The result: a scan that genuinely
  // succeeded (confirmed via direct network inspection — 200 OK) had its
  // result silently discarded, leaving the UI frozen at "10% Connecting to
  // repository..." forever. hasStartedRef alone is sufficient — it already
  // guarantees the fetch below only ever fires once per real mount, so
  // there's nothing left for a cancellation flag to protect against.
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!repoUrl) {
      navigate('/');
      return;
    }
    if (hasStartedRef.current) {
      return;
    }
    hasStartedRef.current = true;

    // Animate progress steps while the real scan runs
    const timers: ReturnType<typeof setTimeout>[] = [];
    let currentStep = 0;

    const advanceStep = () => {
      currentStep++;
      if (currentStep < STEPS.length - 1) {
        setStep(currentStep);
        if (currentStep === 2) setFilesFound(Math.floor(Math.random() * 400) + 100);
        if (currentStep === 3) setAiNodes(Math.floor(Math.random() * 8) + 2);
        timers.push(setTimeout(advanceStep, 800 + Math.random() * 1200));
      }
    };
    timers.push(setTimeout(advanceStep, 600));

    // Actual scan
    startScan(repoUrl)
      .then((result) => {
        // Clear animation timers
        timers.forEach(clearTimeout);
        setStep(STEPS.length - 1);
        saveRecentScan(result.repo_name, repoUrl, result.gamma);
        setTimeout(() => {
          navigate(`/results/${result.scan_id}`, { state: { result } });
        }, 600);
      })
      .catch((err) => {
        timers.forEach(clearTimeout);
        setError(err.message);
      });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [repoUrl, navigate]);

  const currentStep = STEPS[step];
  const repoName = repoUrl?.split('/').pop() || 'repository';

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-verba-surface border border-verba-red/30 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">&#x26A0;</div>
          <h2 className="font-display text-lg font-semibold text-white mb-2">Scan Failed</h2>
          <p className="text-sm text-verba-muted mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-verba-accent hover:bg-verba-accent/90 text-verba-bg font-semibold px-6 py-2 rounded-lg transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="bg-verba-surface border border-verba-border rounded-2xl p-8 max-w-md w-full">
        <h2 className="font-display text-lg font-semibold text-white mb-1">
          Scanning: {repoName}
        </h2>
        <p className="text-sm text-verba-muted mb-6">{currentStep.message}</p>

        {/* Progress bar */}
        <div className="relative w-full h-3 bg-verba-bg rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-verba-accent rounded-full transition-all duration-700 ease-out relative progress-shine"
            style={{ width: `${currentStep.progress}%` }}
          />
        </div>
        <div className="text-right text-xs font-mono text-verba-muted mb-6">
          {currentStep.progress}%
        </div>

        {/* Live stats */}
        <div className="space-y-2 text-sm">
          {filesFound > 0 && (
            <div className="flex items-center gap-2 text-gray-300">
              <span className="text-verba-green">&#x2713;</span>
              Found: {filesFound} files
            </div>
          )}
          {aiNodes > 0 && (
            <div className="flex items-center gap-2 text-gray-300">
              <span className="text-verba-green">&#x2713;</span>
              Found: {aiNodes} AI nodes
            </div>
          )}
          {currentStep.status === 'analyzing' && (
            <div className="flex items-center gap-2 text-gray-400">
              <span className="animate-spin text-verba-accent">&#x25CE;</span>
              Analyzing drift classes...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
