interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background aged-paper">
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
