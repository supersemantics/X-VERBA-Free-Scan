import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { startScan } from '../api/client';
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

  useEffect(() => {
    if (!repoUrl) {
      navigate('/');
      return;
    }

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
        setTimeout(() => {
          navigate(`/results/${result.scan_id}`, { state: { result } });
        }, 600);
      })
      .catch((err) => {
        timers.forEach(clearTimeout);
        setError(err.message);
      });

    return () => timers.forEach(clearTimeout);
  }, [repoUrl, navigate]);

  const currentStep = STEPS[step];
  const repoName = repoUrl?.split('/').pop() || 'repository';

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-verba-surface border border-verba-red/30 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">&#x26A0;</div>
          <h2 className="text-lg font-semibold text-white mb-2">Scan Failed</h2>
          <p className="text-sm text-verba-muted mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-verba-accent hover:bg-verba-accent/90 text-white px-6 py-2 rounded-lg transition-all"
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
        <h2 className="text-lg font-semibold text-white mb-1">
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
