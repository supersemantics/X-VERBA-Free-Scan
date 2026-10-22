// A file:line reference that opens that line on GitHub (new tab).
export default function SourceLink({
  file,
  line,
  url,
  className = '',
  compact = false,
}: {
  file: string;
  line: number;
  url?: string;
  className?: string;
  /** Show only ":line" (for use next to a name). */
  compact?: boolean;
}) {
  const text = compact ? `${file.split('/').pop()}:${line}` : `${file}:${line}`;
  if (!url) return <span className={`font-mono text-verba-muted break-all ${className}`}>{text}</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title="Open this line on GitHub"
      className={`inline-block font-mono text-verba-accent hover:underline break-all ${className}`}
    >
      {text} &#x2197;
    </a>
  );
}
