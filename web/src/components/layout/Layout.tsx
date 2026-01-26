import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className="min-h-screen bg-background aged-paper">
      {/* Main content */}
      <main className={cn(
        isHomePage ? '' : 'container py-6'
      )}>
        {!isHomePage && (
          <div className="mb-4">
            <Link
              to="/"
              className="text-sm text-vintage-brown hover:text-vintage-navy transition-colors inline-flex items-center gap-1"
            >
              <span>←</span> Back to Fantasy Flashback
            </Link>
          </div>
        )}
        {children}
      </main>

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
