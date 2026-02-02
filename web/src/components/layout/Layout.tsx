import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background aged-paper">
      {/* Navigation */}
      <nav className="border-b border-vintage-brown/20 bg-vintage-cream/50">
        <div className="container py-3">
          <div className="flex items-center justify-center gap-6">
            <Link
              to="/"
              className={`font-serif text-lg transition-colors ${
                location.pathname === '/'
                  ? 'text-vintage-red font-semibold'
                  : 'text-vintage-navy hover:text-vintage-red'
              }`}
            >
              Daily Flashback
            </Link>
            <span className="text-vintage-brown/40">|</span>
            <Link
              to="/top-by-year"
              className={`font-serif text-lg transition-colors ${
                location.pathname === '/top-by-year'
                  ? 'text-vintage-red font-semibold'
                  : 'text-vintage-navy hover:text-vintage-red'
              }`}
            >
              Top by Year
            </Link>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t border-vintage-brown/20 py-6 bg-vintage-cream/50">
        <div className="container text-center">
          <p className="text-sm text-vintage-brown">
            Powered by{' '}
            <a
              href="https://www.retrosheet.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-vintage-navy"
            >
              Retrosheet
            </a>
            {' '}data
          </p>
        </div>
      </footer>
    </div>
  );
}
