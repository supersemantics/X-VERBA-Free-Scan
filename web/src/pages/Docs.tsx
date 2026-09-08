import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import GlossaryTerm from '../components/GlossaryTerm';
import { GLOSSARY, tierLabel, type GlossaryEntry, type GlossaryKind, type Tier } from '../data/glossary';
import { glossaryToJson, glossaryToMd, glossaryToTxt, glossaryToYaml, downloadText } from '../lib/glossaryExport';

const KIND_META: Record<GlossaryKind, { label: string; plural: string }> = {
  drift_class: { label: 'Drift Class', plural: 'Drift Classes' },
  stabilisation_operator: { label: 'Stabilisation Operator', plural: 'Stabilisation Operators' },
  compound_mode: { label: 'Compound Drift Mode', plural: 'Compound Drift Modes' },
  concept: { label: 'Concept', plural: 'Core Concepts' },
};

const TIER_COLORS: Record<Tier, string> = {
  A: 'text-verba-green border-verba-green/40',
  B: 'text-verba-accent border-verba-accent/40',
  C: 'text-verba-amber border-verba-amber/40',
  D: 'text-verba-red border-verba-red/40',
};

const EXPORTS: { label: string; run: () => void }[] = [
  { label: 'JSON', run: () => downloadText(glossaryToJson(), 'x-verba-glossary.json', 'application/json') },
  { label: 'YAML', run: () => downloadText(glossaryToYaml(), 'x-verba-glossary.yaml', 'text/yaml') },
  { label: 'TXT', run: () => downloadText(glossaryToTxt(), 'x-verba-glossary.txt', 'text/plain') },
  { label: 'MD', run: () => downloadText(glossaryToMd(), 'x-verba-glossary.md', 'text/markdown') },
];

function GlossaryRow({ entry }: { entry: GlossaryEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-verba-border last:border-b-0 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 text-left group print:hidden"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-sm text-verba-accent shrink-0">{entry.id}</span>
          <span className="text-sm text-white truncate">{entry.term.replace(`${entry.id} — `, '')}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {entry.tier && (
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${TIER_COLORS[entry.tier]}`}>
              {entry.tier}
            </span>
          )}
          <span className="text-verba-muted text-xs group-hover:text-white transition-colors">
            {open ? '−' : '+'}
          </span>
        </div>
      </button>

      {/* Always in the DOM — visibility toggled by class, not conditional
          render — so `print:block` can force every entry open in the PDF
          export regardless of what's currently expanded on screen. */}
      <div className={`${open ? 'block' : 'hidden'} print:block mt-3 print:mt-1`}>
        <p className="hidden print:block text-sm font-semibold text-black mb-1">
          {entry.term} {entry.tier ? `— Tier ${entry.tier}` : ''}
        </p>
        {entry.tier && (
          <p className="text-[11px] text-verba-muted print:text-gray-600 mb-2">{tierLabel(entry.tier)}</p>
        )}
        <p className="text-sm text-gray-300 print:text-black whitespace-pre-line mb-2">{entry.definition}</p>
        {entry.example && (
          <p className="text-xs text-verba-muted print:text-gray-600 italic border-l-2 border-verba-border pl-2 mb-2">
            {entry.example}
          </p>
        )}
        {entry.legions && entry.legions.length > 0 && (
          <p className="text-xs text-verba-muted print:text-gray-600 mb-2">
            Legion patterns: {entry.legions.join('; ')}
          </p>
        )}
        {entry.complianceMapping && (
          <div className="mb-2">
            <p className="text-[10px] uppercase tracking-wide text-verba-muted print:text-gray-500 mb-1">
              Framework hooks — not a compliance claim
            </p>
            <p className="text-xs text-verba-muted print:text-gray-600 border-l-2 border-verba-accent/30 pl-2">
              {entry.complianceMapping}
            </p>
          </div>
        )}
        {entry.relatedTerms && entry.relatedTerms.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 print:hidden">
            <span className="text-[10px] text-verba-muted">Related:</span>
            {entry.relatedTerms.map((relId) => (
              <GlossaryTerm key={relId} id={relId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Docs() {
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<GlossaryKind | 'all'>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return GLOSSARY.filter((e) => {
      if (kindFilter !== 'all' && e.kind !== kindFilter) return false;
      if (!q) return true;
      return (
        e.id.toLowerCase().includes(q) ||
        e.term.toLowerCase().includes(q) ||
        e.definition.toLowerCase().includes(q)
      );
    });
  }, [search, kindFilter]);

  const grouped = useMemo(() => {
    const groups = new Map<GlossaryKind, GlossaryEntry[]>();
    for (const e of filtered) {
      const list = groups.get(e.kind) ?? [];
      list.push(e);
      groups.set(e.kind, list);
    }
    return groups;
  }, [filtered]);

  const kinds: GlossaryKind[] = ['drift_class', 'stabilisation_operator', 'compound_mode', 'concept'];

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-verba-muted mb-1 print:hidden">
        <Link to="/" className="hover:text-white transition-colors">Home</Link>
        <span>/</span>
        <span className="text-white">Docs</span>
      </div>
      <div className="mb-6 print:hidden">
        <h1 className="font-display text-2xl font-bold text-white mb-1 tracking-tight">Glossary &amp; Documentation</h1>
        <p className="text-sm text-verba-muted">
          The full X-VERBA taxonomy — Drift Classes, Stabilisation Operators, Compound Drift Modes, and core
          concepts. Grounded in{' '}
          <a
            href="https://zenodo.org/records/19190422"
            target="_blank"
            rel="noopener noreferrer"
            className="text-verba-accent hover:underline"
          >
            original research
          </a>
          , published open access on Zenodo.
        </p>
      </div>

      <div className="hidden print:block mb-6">
        <h1 className="font-display text-xl font-bold text-black">X-VERBA Glossary</h1>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6 print:hidden">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search terms…"
          className="flex-1 min-w-[200px] bg-verba-bg border border-verba-border rounded-lg px-3 py-2 text-sm text-white placeholder-verba-muted/50 focus:outline-none focus:border-verba-accent"
        />
        <div className="flex items-center gap-1 bg-verba-bg border border-verba-border rounded-lg p-1">
          {(['all', ...kinds] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKindFilter(k)}
              className={`text-xs px-2.5 py-1.5 rounded-md transition-all whitespace-nowrap ${
                kindFilter === k ? 'bg-verba-accent text-verba-bg font-semibold' : 'text-verba-muted hover:text-white'
              }`}
            >
              {k === 'all' ? 'All' : KIND_META[k].plural}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 print:hidden">
        <span className="text-xs text-verba-muted">Export:</span>
        {EXPORTS.map((f) => (
          <button
            key={f.label}
            onClick={f.run}
            className="text-xs px-3 py-1.5 rounded-lg bg-verba-surface border border-verba-border text-verba-muted hover:text-white hover:border-verba-accent transition-all"
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={() => window.print()}
          className="text-xs px-3 py-1.5 rounded-lg bg-verba-accent text-verba-bg font-semibold hover:bg-verba-accent/90 transition-all"
        >
          PDF
        </button>
      </div>

      {kinds.map((kind) => {
        const entries = grouped.get(kind);
        if (!entries || entries.length === 0) return null;
        return (
          <div key={kind} className="bg-verba-surface border border-verba-border rounded-xl p-5 mb-6 print:border-0 print:bg-white print:p-0">
            <h2 className="text-sm font-medium text-white print:text-black print:text-lg mb-1 print:mt-6">
              {KIND_META[kind].plural} <span className="text-verba-muted print:text-gray-500">({entries.length})</span>
            </h2>
            <div>
              {entries.map((e) => (
                <GlossaryRow key={e.id} entry={e} />
              ))}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <p className="text-sm text-verba-muted text-center py-12">No terms match "{search}".</p>
      )}
    </div>
  );
}
