import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import GammaGauge from '../components/GammaGauge';
import FindingCard from '../components/FindingCard';
import TrendChart from '../components/TrendChart';
import GlossaryTerm from '../components/GlossaryTerm';
import { useSpotlight } from '../hooks/useSpotlight';
import { getContract, getScanHistory } from '../api/client';
import type {
  AgentActions,
  BreakdownItem,
  HumanAuthorisation,
  ScanResult,
  UngovernedNode,
  ScanHistoryEntry,
  ExportFormat,
  VslSummary,
} from '../types';
import SourceLink from '../components/SourceLink';

type Tab = 'overview' | 'findings' | 'history';
type SortKey = 'severity' | 'file' | 'type';
/** Which findings to show when a number on the overview is clicked. */
type FindingsFilter = { severity?: 'critical' | 'high' | 'medium'; driftClass?: string; file?: string; label?: string };

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
  const [findingsFilter, setFindingsFilter] = useState<FindingsFilter>({});
  const [findingsSort, setFindingsSort] = useState<SortKey>('severity');

  const openFindings = (filter: FindingsFilter = {}, sort: SortKey = 'severity') => {
    setFindingsFilter(filter);
    setFindingsSort(sort);
    setTab('findings');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
        {result.branch && (
          <p className="text-xs text-verba-muted mt-1">
            Branch <span className="font-mono text-white bg-verba-bg border border-verba-border px-1.5 py-0.5 rounded">{result.branch}</span>
          </p>
        )}
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
            onClick={() => {
              if (key === 'findings') setFindingsFilter({});
              setTab(key);
            }}
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

      {tab === 'overview' && (
        <OverviewTab result={result} noAi={noAi} noFindings={noFindings} navigate={navigate} openFindings={openFindings} />
      )}
      {tab === 'findings' && (
        <FindingsTab
          result={result}
          scanId={scanId!}
          filter={findingsFilter}
          clearFilter={() => setFindingsFilter({})}
          sortKey={findingsSort}
          setSortKey={setFindingsSort}
        />
      )}
      {tab === 'history' && <HistoryTab repoName={result.repo_name} />}
    </div>
  );
}

// ── Agent actions + VSL gates ─────────────────────────────────────────────────

type Spotlight = ReturnType<typeof useSpotlight>;

function AgentActionsCard({
  actions,
  items,
  spotlight,
  showItem,
}: {
  actions: AgentActions;
  items: BreakdownItem[];
  spotlight: Spotlight;
  showItem: (item: BreakdownItem | null) => void;
}) {
  const { total, tools, model_calls } = actions;
  const allGoverned = total.governed === total.total;
  return (
    <div
      onMouseMove={spotlight.onMouseMove}
      className={`bg-verba-surface border border-verba-border rounded-xl p-5 ${spotlight.className}`}
    >
      <h3 className="text-sm font-medium text-white mb-3">Agent Actions Governed</h3>
      <button
        type="button"
        onClick={() => showItem(null)}
        className={`text-3xl font-bold hover:underline ${allGoverned ? 'text-verba-green' : total.governed === 0 ? 'text-verba-red' : 'text-verba-amber'}`}
        title="Show every agent action in the breakdown"
      >
        {total.governed} / {total.total}
      </button>
      <div className="text-xs text-verba-muted mt-2">
        Tools the agent can call {tools.governed}/{tools.total} &middot; Model calls {model_calls.governed}/{model_calls.total}
      </div>
      {items.length > 0 && (
        <ul className="mt-3 space-y-1">
          {items.map((item) => (
            <li key={`${item.file}:${item.line}`}>
              <button
                type="button"
                onClick={() => showItem(item)}
                className="w-full flex items-center gap-2 text-left text-xs hover:bg-verba-bg rounded px-1 py-0.5"
              >
                <StatusIcon governed={item.governed} />
                <span className="font-mono text-gray-200 truncate">{item.kind === 'model_call' ? item.name : `${item.name}()`}</span>
                <span className="ml-auto text-verba-muted whitespace-nowrap">{item.governed ? 'governed' : 'not governed'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusIcon({ governed }: { governed: boolean }) {
  return governed ? (
    <span className="text-verba-green" aria-label="Governed">&#x2713;</span>
  ) : (
    <span className="text-verba-red" aria-label="Not governed">&#x2715;</span>
  );
}

// ── The decision points behind the Governance Score ──────────────────────────

const KIND_LABELS: Record<string, string> = {
  agent_tool: 'Tool the agent can call',
  model_call: 'AI model call',
};

const CONSEQUENCE_LABELS: Record<string, string> = {
  external_api_call: 'External API call',
  state_mutation: 'Changes stored data',
  database_write: 'Database write',
  file_write: 'File write',
  irreversible_action: 'Irreversible action',
};

const GOVERNED_BAR = 0.7;

function kindLabel(item: BreakdownItem): string {
  if (KIND_LABELS[item.kind]) return KIND_LABELS[item.kind];
  const consequence = item.consequence_types[0] ?? item.kind;
  if (CONSEQUENCE_LABELS[consequence]) return CONSEQUENCE_LABELS[consequence];
  const text = consequence.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function checkpointText(item: BreakdownItem): string {
  const cp = item.checkpoint;
  if (item.governed) {
    return cp?.evidence ? `Governed by ${cp.evidence}` : 'Governed by a checkpoint';
  }
  if (cp?.evidence && cp.strength !== null) {
    return (
      `Checkpoint found (${cp.evidence}) but it does not count as governance: ` +
      `strength ${cp.strength.toFixed(1)}, ${GOVERNED_BAR.toFixed(1)} needed.`
    );
  }
  return 'No checkpoint in front of it.';
}

function itemId(item: BreakdownItem): string {
  return `bd-${item.file}-${item.line}`.replace(/[^A-Za-z0-9_-]/g, '-');
}

type BreakdownView = 'all' | 'ungoverned' | 'governed';

function GovernanceBreakdown({
  items,
  view,
  setView,
  highlight,
}: {
  items: BreakdownItem[];
  view: BreakdownView;
  setView: (v: BreakdownView) => void;
  highlight: string | null;
}) {
  const governed = items.filter((i) => i.governed).length;
  const shown = items.filter((i) => (view === 'all' ? true : view === 'governed' ? i.governed : !i.governed));
  const views: { key: BreakdownView; label: string }[] = [
    { key: 'all', label: `All ${items.length}` },
    { key: 'ungoverned', label: `Not governed ${items.length - governed}` },
    { key: 'governed', label: `Governed ${governed}` },
  ];
  return (
    <section id="breakdown" className="bg-verba-surface border border-verba-border rounded-xl p-5 mb-6 scroll-mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h3 className="text-sm font-medium text-white">What the Governance Score counts</h3>
        <div className="flex gap-1">
          {views.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setView(v.key)}
              className={`text-xs px-2.5 py-1 rounded-full transition-all ${
                view === v.key
                  ? 'bg-verba-accent text-verba-bg font-semibold'
                  : 'bg-verba-bg border border-verba-border text-verba-muted hover:text-white'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-verba-muted mb-4">
        {governed} of {items.length} consequential decision points have a governance check. Each one is listed below.
      </p>
      {shown.length === 0 && <p className="text-xs text-verba-muted">Nothing in this view.</p>}
      <ul className="divide-y divide-verba-border">
        {shown.map((item) => {
          const id = itemId(item);
          return (
            <li
              key={id}
              id={id}
              className={`py-3 flex gap-3 scroll-mt-24 rounded transition-colors ${highlight === id ? 'bg-verba-accent/10' : ''}`}
            >
              <div className="pt-0.5 w-4 text-center"><StatusIcon governed={item.governed} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm text-white font-mono break-all">
                    {item.kind === 'agent_tool' ? `${item.name}()` : item.name}
                  </span>
                  <span className="text-xs text-verba-muted">{kindLabel(item)}</span>
                </div>
                <div className={`text-xs mt-1 ${item.governed ? 'text-verba-green' : 'text-verba-amber'}`}>
                  {checkpointText(item)}
                </div>
                <SourceLink file={item.file} line={item.line} url={item.source_url} className="text-xs mt-1" />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function VslGatesCard({
  vsl,
  items,
  spotlight,
  showItem,
}: {
  vsl: VslSummary;
  items: BreakdownItem[];
  spotlight: Spotlight;
  showItem: (item: BreakdownItem) => void;
}) {
  const kinds = Object.entries(vsl.gates_by_kind).sort(([a], [b]) => a.localeCompare(b));
  return (
    <div
      onMouseMove={spotlight.onMouseMove}
      className={`bg-verba-surface border border-verba-accent/40 rounded-xl p-5 ${spotlight.className}`}
    >
      <h3 className="text-sm font-medium text-white mb-3">VSL Gates Recognised</h3>
      <div className="flex items-baseline gap-3">
        <div className="text-3xl font-bold text-verba-accent">{vsl.gates_total}</div>
        <div className="text-xs text-verba-muted">{kinds.map(([k, n]) => `${n} ${k}`).join(' · ')}</div>
      </div>
      <ul className="mt-3 space-y-2">
        {vsl.gates.map((g) => {
          const guarded = g.name ? items.filter((i) => i.checkpoint?.evidence?.includes(`'${g.name}'`)) : [];
          return (
            <li key={`${g.kind}-${g.location}`} className="text-xs text-gray-300">
              <span className="text-verba-muted">{g.kind}</span> {g.name ?? '(unnamed)'}
              <SourceLink file={g.location.replace(/:\d+$/, '')} line={Number(g.location.split(':').pop())} url={g.source_url} className="ml-1" compact />
              {guarded.length > 0 && (
                <div className="text-verba-muted mt-0.5">
                  Guards:{' '}
                  {guarded.map((i, n) => (
                    <span key={`${i.file}:${i.line}`}>
                      {n > 0 && ', '}
                      <button type="button" onClick={() => showItem(i)} className="font-mono text-verba-accent hover:underline">
                        {i.kind === 'agent_tool' ? `${i.name}()` : i.name}
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-verba-muted mt-3">
        Credited from their wiring. Not verified: declared F1/F2 assurance, Gamma monitors, or runtime behaviour.
      </p>
    </div>
  );
}

function HumanAuthorisationCard({ items, spotlight }: { items: HumanAuthorisation[]; spotlight: Spotlight }) {
  return (
    <div
      onMouseMove={spotlight.onMouseMove}
      className={`bg-verba-surface border border-verba-green/40 rounded-xl p-5 ${spotlight.className}`}
    >
      <h3 className="text-sm font-medium text-white mb-3">Human Authorisation</h3>
      <ul className="space-y-2">
        {items.map((h) => (
          <li key={`${h.kind}-${h.location}`} className="text-xs text-gray-300">
            <span className="text-verba-green">{h.kind}</span>
            <div className="text-verba-muted">{h.evidence}</div>
            <SourceLink file={h.location.replace(/:\d+$/, '')} line={Number(h.location.split(':').pop())} url={h.source_url} />
          </li>
        ))}
      </ul>
      <p className="text-xs text-verba-muted mt-3">
        Recognised from the code: an action that cannot run without a person&apos;s approval.
      </p>
    </div>
  );
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  ABOVE_THRESHOLD: { label: 'Well governed', className: 'text-verba-green' },
  PARTIAL_COVERAGE: { label: 'Partial coverage', className: 'text-verba-amber' },
  BELOW_THRESHOLD: { label: 'Significant gaps', className: 'text-verba-red' },
};

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({
  result,
  noAi,
  noFindings,
  navigate,
  openFindings,
}: {
  result: ScanResult;
  noAi: boolean;
  noFindings: boolean;
  navigate: ReturnType<typeof useNavigate>;
  openFindings: (filter?: FindingsFilter, sort?: SortKey) => void;
}) {
  const dcEntries = Object.entries(result.drift_class_summary).sort((a, b) => b[1] - a[1]);
  const spotlight = useSpotlight();
  const breakdown = result.breakdown ?? [];
  const agentItems = breakdown.filter((i) => i.kind === 'agent_tool' || i.kind === 'model_call');
  const governedCount = breakdown.filter((i) => i.governed).length;
  const [view, setView] = useState<BreakdownView>('all');
  const [highlight, setHighlight] = useState<string | null>(null);

  // Open the breakdown, optionally on one item, and scroll to it.
  const showItem = (item: BreakdownItem | null, nextView: BreakdownView = 'all') => {
    setView(nextView);
    const id = item ? itemId(item) : 'breakdown';
    setHighlight(item ? id : null);
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

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
          <h2 className="font-display text-lg font-semibold text-white mb-2">No Governance Gaps Found</h2>
          <p className="text-sm text-verba-muted max-w-md mx-auto">
            Every consequential decision point X-VERBA found has a governance check. Structural Gamma:{' '}
            <strong className="text-verba-green">{result.gamma.toFixed(2)}</strong>.
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
          <div className="text-xs text-verba-muted mt-1">
            Share of consequential decision points with a governance check
          </div>
          {breakdown.length > 0 && (
            <button type="button" onClick={() => showItem(null)} className="text-xs text-verba-accent hover:underline mt-1">
              {governedCount} of {breakdown.length} governed &rarr; see which
            </button>
          )}
        </div>
        <button
          type="button"
          onMouseMove={spotlight.onMouseMove}
          onClick={() => openFindings()}
          disabled={result.ungoverned_nodes.length === 0}
          className={`text-left bg-verba-surface border border-verba-border rounded-xl p-4 transition-transform enabled:hover:-translate-y-0.5 enabled:hover:border-verba-accent ${spotlight.className}`}
        >
          <div className="text-3xl font-bold text-white">{result.ungoverned_nodes.length}</div>
          <div className="text-sm text-verba-muted">Findings</div>
          {result.ungoverned_nodes.length > 0 && <div className="text-xs text-verba-accent mt-1">View findings &rarr;</div>}
        </button>
        <div
          onMouseMove={spotlight.onMouseMove}
          className={`bg-verba-surface border border-verba-border rounded-xl p-4 transition-transform hover:-translate-y-0.5 ${spotlight.className}`}
        >
          <div className="text-3xl font-bold text-white">{result.files_affected}</div>
          <div className="text-sm text-verba-muted">Files Affected</div>
          <ul className="mt-1 space-y-0.5">
            {Array.from(new Set(result.ungoverned_nodes.map((n) => n.file))).map((file) => (
              <li key={file}>
                <button
                  type="button"
                  onClick={() => openFindings({ file, label: file }, 'file')}
                  className="text-xs font-mono text-verba-accent hover:underline break-all text-left"
                >
                  {file}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div
          onMouseMove={spotlight.onMouseMove}
          className={`bg-verba-surface border border-verba-border rounded-xl p-4 transition-transform hover:-translate-y-0.5 ${spotlight.className}`}
        >
          <div className={`text-xl font-bold ${(STATUS_LABELS[result.gamma_status] ?? STATUS_LABELS.BELOW_THRESHOLD).className}`}>
            {STATUS_LABELS[result.gamma_status]?.label ?? result.gamma_status}
          </div>
          <div className="text-sm text-verba-muted">Governance Status</div>
        </div>
      </div>

      {/* Agent actions, VSL gates, human authorisation (CLI 0.7.0+) */}
      {(result.agent_actions?.total.total || result.vsl?.detected || result.human_authorisations?.length) ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {result.agent_actions && result.agent_actions.total.total > 0 && (
            <AgentActionsCard actions={result.agent_actions} items={agentItems} spotlight={spotlight} showItem={showItem} />
          )}
          {result.vsl?.detected && <VslGatesCard vsl={result.vsl} items={breakdown} spotlight={spotlight} showItem={showItem} />}
          {result.human_authorisations && result.human_authorisations.length > 0 && (
            <HumanAuthorisationCard items={result.human_authorisations} spotlight={spotlight} />
          )}
        </div>
      ) : null}

      {breakdown.length > 0 && (
        <GovernanceBreakdown items={breakdown} view={view} setView={setView} highlight={highlight} />
      )}

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
                <button
                  key={sev}
                  type="button"
                  disabled={count === 0}
                  onClick={() => openFindings({ severity: sev, label: `${sev} severity` })}
                  className="w-full flex items-center gap-3 rounded enabled:hover:bg-verba-bg enabled:cursor-pointer"
                  title={count ? `Show the ${sev} findings` : undefined}
                >
                  <span className="w-16 text-left text-xs text-verba-muted capitalize">{sev}</span>
                  <div className="flex-1 h-2 bg-verba-bg rounded-full overflow-hidden">
                    <div className={`h-full ${color}`} style={{ width: `${(count / max) * 100}%` }} />
                  </div>
                  <span className={`text-xs w-4 text-right ${count ? 'text-verba-accent' : 'text-white'}`}>{count}</span>
                </button>
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
                  <button
                    type="button"
                    onClick={() => openFindings({ driftClass: code, label: node?.drift_class_name || code })}
                    className="text-sm text-verba-accent font-mono hover:underline"
                  >
                    {count} {count === 1 ? 'instance' : 'instances'} &rarr;
                  </button>
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
              {result.ungoverned_nodes.length} governance {result.ungoverned_nodes.length === 1 ? 'gap' : 'gaps'} found in this repo
              {' '}
              <span className="text-verba-muted font-normal">
                ({(['critical', 'high', 'medium'] as const)
                  .filter((sev) => result.severity_breakdown[sev])
                  .map((sev) => `${result.severity_breakdown[sev]} ${sev}`)
                  .join(', ')})
              </span>
            </h3>
            <p className="text-sm text-verba-muted">
              See how the full Scan API resolves cross-file coverage and tracks these over time.
            </p>
          </div>
          <button
            onClick={() => openFindings()}
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

function FindingsTab({
  result,
  scanId,
  filter,
  clearFilter,
  sortKey,
  setSortKey,
}: {
  result: ScanResult;
  scanId: string;
  filter: FindingsFilter;
  clearFilter: () => void;
  sortKey: SortKey;
  setSortKey: (key: SortKey) => void;
}) {
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

  const filtered = result.ungoverned_nodes.filter(
    (n) =>
      (!filter.severity || n.severity === filter.severity) &&
      (!filter.driftClass || n.drift_class === filter.driftClass) &&
      (!filter.file || n.file === filter.file),
  );
  const sorted = sortNodes(filtered, sortKey);
  const filtering = Boolean(filter.severity || filter.driftClass || filter.file);
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

      {filtering && (
        <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
          <span className="text-verba-muted">
            Showing {sorted.length} of {result.ungoverned_nodes.length} findings:
          </span>
          <span className={`text-white ${filter.file ? 'font-mono break-all' : 'capitalize'}`}>{filter.label}</span>
          <button type="button" onClick={clearFilter} className="text-xs text-verba-accent hover:underline">
            Show all
          </button>
        </div>
      )}

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
