import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { searchPlayers } from '@/api/client';
import { Search } from 'lucide-react';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const { data: searchResults } = useQuery({
    queryKey: ['search', query],
    queryFn: () => searchPlayers(query, 10),
    enabled: query.length >= 2,
    staleTime: 30000,
  });

  const handleSelect = useCallback(
    (playerId: string) => {
      navigate(`/players/${playerId}`);
      setQuery('');
      setIsOpen(false);
    },
    [navigate]
  );

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search players..."
          className="pl-8"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Delay to allow click on results
            setTimeout(() => setIsOpen(false), 200);
          }}
        />
      </div>

      {isOpen && query.length >= 2 && searchResults && searchResults.results.length > 0 && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-lg">
          {searchResults.results.map((player) => (
            <button
              key={player.id}
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => handleSelect(player.id)}
            >
              <span className="font-medium">{player.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">{player.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
