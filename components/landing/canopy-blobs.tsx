// Single reusable organic blob silhouette, recolored and rescaled per instance
// to build the layered abstract canopy behind the hero (see Hero for parallax wiring).
export function Blob({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M100 6C146 24 182 66 176 114C170 162 128 196 80 190C32 184 -2 140 8 92C18 44 54 -12 100 6Z"
      />
    </svg>
  );
}
