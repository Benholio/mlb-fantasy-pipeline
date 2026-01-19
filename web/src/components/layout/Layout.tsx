import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { SearchBar } from './SearchBar';
import { Home, Trophy, Calendar, Database } from 'lucide-react';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Leaderboards', href: '/leaderboards', icon: Trophy },
  { name: 'Explore', href: '/explore', icon: Calendar },
  { name: 'Query', href: '/query', icon: Database },
];

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link to="/" className="mr-6 flex items-center space-x-2">
              <span className="text-xl">&#9918;</span>
              <span className="hidden font-bold sm:inline-block">MLB Fantasy</span>
            </Link>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-1.5 transition-colors hover:text-foreground/80',
                    location.pathname === item.href ? 'text-foreground' : 'text-foreground/60'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden md:inline">{item.name}</span>
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <div className="w-full max-w-sm">
              <SearchBar />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container py-6">{children}</main>

      {/* Footer */}
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-14 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            MLB Fantasy Baseball Dashboard - Historical Data from Retrosheet
          </p>
        </div>
      </footer>
    </div>
  );
}
