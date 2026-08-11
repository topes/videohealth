interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
}

const sizes = {
  sm: { icon: 28, text: 18 },
  md: { icon: 44, text: 24 },
  lg: { icon: 72, text: 40 },
};

export function BrandMark({ size = 'md', showWordmark = true }: BrandMarkProps) {
  const s = sizes[size];
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
      }}
      aria-label="VideoHealth"
    >
      <img
        src="/logo.png"
        alt=""
        width={s.icon}
        height={s.icon}
        style={{ display: 'block', objectFit: 'contain' }}
      />
      {showWordmark && (
        <span
          className="brand-wordmark"
          style={{ fontSize: s.text, lineHeight: 1 }}
        >
          <span className="brand-video">Video</span>
          <span className="brand-health">Health</span>
        </span>
      )}
    </div>
  );
}
