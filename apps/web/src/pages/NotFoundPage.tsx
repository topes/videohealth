import { Link } from 'react-router-dom';
import { PageShell } from '../components/PageShell';

export function NotFoundPage() {
  return (
    <PageShell>
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 40, marginBottom: 8 }}>Page not found</h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 20 }}>
            The room or page you’re looking for doesn’t exist.
          </p>
          <Link className="btn btn-primary" to="/">
            Back to home
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
