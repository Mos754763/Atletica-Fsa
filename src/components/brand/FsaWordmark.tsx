type FsaWordmarkProps = { compact?: boolean; className?: string };

export function FsaWordmark({ compact = false, className = "" }: FsaWordmarkProps) {
  return (
    <div className={`fsa-wordmark ${className}`} aria-label="ATLETICA FSA">
      <span className="fsa-mark" aria-hidden="true">FSA</span>
      {!compact && (
        <span className="fsa-wordmark-copy">
          <strong>ATLETICA</strong>
          <small>FACULDADE SANTO AGOSTINHO</small>
        </span>
      )}
    </div>
  );
}
