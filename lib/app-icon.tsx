import { ImageResponse } from 'next/og';

// Simple evergreen silhouette: matches the outdoor / Costa Rica branding
// better than a bare letter monogram, and stays legible down to 16px.
const TREE_PATH = 'M12 2L6 10H9L4 17H10V22H14V17H20L15 10H18L12 2Z';

function TreeMark({ sizePx, rounded }: { sizePx: number; rounded?: number }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1B4332',
        borderRadius: rounded ?? 0,
      }}
    >
      <svg
        width={sizePx * 0.56}
        height={sizePx * 0.56}
        viewBox="0 0 24 24"
        fill="none"
      >
        <path d={TREE_PATH} fill="#FAFAF8" />
      </svg>
    </div>
  );
}

export function renderAppIcon(sizePx: number, options?: { rounded?: number }) {
  return new ImageResponse(
    <TreeMark sizePx={sizePx} rounded={options?.rounded} />,
    { width: sizePx, height: sizePx }
  );
}
