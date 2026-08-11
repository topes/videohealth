import { Link } from 'react-router-dom';
import { BrandMark } from './BrandMark';
import type { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
  compact?: boolean;
}

export function PageShell({ children, compact = false }: PageShellProps) {
  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        background:
          'radial-gradient(1200px 600px at 50% -200px, rgba(61, 128, 217, 0.10), transparent 60%), var(--color-bg)',
      }}
    >
      <header
        style={{
          height: 'var(--header-h)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 clamp(16px, 4vw, 32px)',
        }}
      >
        <Link to="/" style={{ display: 'inline-flex' }} aria-label="VideoHealth home">
          <BrandMark size="sm" />
        </Link>
      </header>
      <main
        className="page-enter"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: compact ? 0 : 'clamp(24px, 5vw, 64px)',
        }}
      >
        {children}
      </main>
    </div>
  );
}
