import { useState, type ReactNode } from 'react';
import {
  useFloating,
  useHover,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  offset,
  flip,
  shift,
  autoUpdate,
  FloatingPortal,
  FloatingFocusManager,
  safePolygon,
} from '@floating-ui/react';
import { getGlossaryEntry, tierLabel, type Tier } from '../data/glossary';

const TIER_COLORS: Record<Tier, string> = {
  A: 'text-verba-green border-verba-green/40',
  B: 'text-verba-accent border-verba-accent/40',
  C: 'text-verba-amber border-verba-amber/40',
  D: 'text-verba-red border-verba-red/40',
};

// 'interactive' (default): click-to-open, renders a <button>.
// 'hover-only': hover-to-open only, renders a <span> — use this when the
// term is embedded inside another clickable element (a card's own onClick).
type Variant = 'interactive' | 'hover-only';

function InnerTerm({ id, children, variant = 'interactive' }: { id: string; children?: ReactNode; variant?: Variant }) {
  const [open, setOpen] = useState(false);
  const entry = getGlossaryEntry(id);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip({ padding: 12 }), shift({ padding: 12 })],
  });

  const hover = useHover(context, { move: false, handleClose: safePolygon() });
  // 'hover-only' skips useClick entirely — for terms embedded inside another
  // clickable element (e.g. the Γ badge on a whole-card "open scan" button).
  // A <button> can't legally nest inside another <button> (invalid HTML,
  // and click would fight the parent's own onClick/navigation), so this
  // variant also renders a <span> instead of a <button> below.
  const click = useClick(context, { enabled: variant === 'interactive' });
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'dialog' });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, click, dismiss, role]);

  if (!entry) return <>{children ?? id}</>;

  const triggerClassName =
    'underline decoration-dotted decoration-verba-muted underline-offset-2 hover:decoration-verba-accent hover:text-verba-accent transition-colors cursor-help';
  const triggerContent = children ?? <span className="font-mono text-xs">{id}</span>;

  return (
    <>
      {variant === 'interactive' ? (
        <button
          ref={refs.setReference}
          {...getReferenceProps()}
          type="button"
          className={triggerClassName}
        >
          {triggerContent}
        </button>
      ) : (
        <span
          ref={refs.setReference}
          {...getReferenceProps()}
          tabIndex={0}
          className={triggerClassName}
        >
          {triggerContent}
        </span>
      )}
      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              className="z-50 w-80 max-w-[90vw] bg-verba-surface border border-verba-border rounded-xl shadow-2xl p-4 text-left"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="text-sm font-semibold text-white leading-snug">{entry.term}</h4>
                {entry.tier && (
                  <span className={`shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded border ${TIER_COLORS[entry.tier]}`}>
                    Tier {entry.tier}
                  </span>
                )}
              </div>
              {entry.tier && (
                <p className="text-[11px] text-verba-muted mb-2">{tierLabel(entry.tier)}</p>
              )}
              <p className="text-xs text-gray-300 whitespace-pre-line mb-3">{entry.definition}</p>
              {entry.example && (
                <p className="text-xs text-verba-muted italic border-l-2 border-verba-border pl-2 mb-3">
                  {entry.example}
                </p>
              )}
              {entry.complianceMapping && (
                <div className="mb-3">
                  <p className="text-[10px] uppercase tracking-wide text-verba-muted mb-1">
                    Framework hooks — not a compliance claim
                  </p>
                  <p className="text-xs text-verba-muted border-l-2 border-verba-accent/30 pl-2">
                    {entry.complianceMapping}
                  </p>
                </div>
              )}
              {entry.relatedTerms && entry.relatedTerms.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-verba-border">
                  <span className="text-[10px] text-verba-muted">
                    {entry.kind === 'stabilisation_operator' ? 'Targets:' : 'Recommended response:'}
                  </span>
                  {entry.relatedTerms.map((relId) => (
                    <GlossaryTerm key={relId} id={relId} />
                  ))}
                </div>
              )}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}

// Wrapper isolates each term's open/close state so hovering one glossary term
// doesn't affect siblings, and so nested related-term chips (rendered inside
// a popover) can each open their own independent popover.
export default function GlossaryTerm({
  id,
  children,
  variant,
}: {
  id: string;
  children?: ReactNode;
  variant?: Variant;
}) {
  return (
    <InnerTerm id={id} variant={variant}>
      {children}
    </InnerTerm>
  );
}
