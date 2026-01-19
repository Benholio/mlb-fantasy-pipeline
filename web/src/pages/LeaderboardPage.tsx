import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getRulesets, getLeaderboard, getYears, type LeaderboardEntry } from '@/api/client';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const columnHelper = createColumnHelper<LeaderboardEntry>();

const columns = [
  columnHelper.accessor('rank', {
    header: 'Rank',
    cell: (info) => (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('playerName', {
    header: 'Player',
    cell: (info) => (
      <Link
        to={`/players/${info.row.original.playerId}`}
        className="font-medium text-primary hover:underline"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor('games', {
    header: 'Games',
    cell: (info) => info.getValue().toLocaleString(),
  }),
  columnHelper.accessor('totalPoints', {
    header: 'Total Points',
    cell: (info) => (
      <span className="font-bold">{parseFloat(info.getValue()).toLocaleString()}</span>
    ),
  }),
  columnHelper.accessor('avgPoints', {
    header: 'Avg Points',
    cell: (info) => info.getValue(),
  }),
];

export function LeaderboardPage() {
  const [selectedRuleset, setSelectedRuleset] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'batting' | 'pitching' | 'all'>('all');
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const { data: rulesets } = useQuery({
    queryKey: ['rulesets'],
    queryFn: getRulesets,
  });

  const { data: years } = useQuery({
    queryKey: ['years'],
    queryFn: getYears,
  });

  // Set default ruleset when loaded
  if (!selectedRuleset && rulesets?.rulesets[0]) {
    setSelectedRuleset(rulesets.rulesets[0].id);
  }

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['leaderboard', selectedRuleset, selectedYear, selectedType, page],
    queryFn: () =>
      getLeaderboard({
        ruleset: selectedRuleset,
        year: selectedYear !== 'all' ? parseInt(selectedYear, 10) : undefined,
        type: selectedType !== 'all' ? selectedType : undefined,
        limit: pageSize,
        offset: page * pageSize,
      }),
    enabled: !!selectedRuleset,
  });

  const table = useReactTable({
    data: leaderboard?.entries ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = Math.ceil((leaderboard?.total ?? 0) / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leaderboards</h1>
        <p className="text-muted-foreground">View top fantasy performers by year and stat type</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <label className="mb-2 block text-sm font-medium">Ruleset</label>
              <Select value={selectedRuleset} onValueChange={setSelectedRuleset}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ruleset" />
                </SelectTrigger>
                <SelectContent>
                  {rulesets?.rulesets.map((ruleset) => (
                    <SelectItem key={ruleset.id} value={ruleset.id}>
                      {ruleset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-32">
              <label className="mb-2 block text-sm font-medium">Year</label>
              <Select
                value={selectedYear}
                onValueChange={(v) => {
                  setSelectedYear(v);
                  setPage(0);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years?.years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-36">
              <label className="mb-2 block text-sm font-medium">Stat Type</label>
              <Select
                value={selectedType}
                onValueChange={(v: 'batting' | 'pitching' | 'all') => {
                  setSelectedType(v);
                  setPage(0);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="batting">Batting</SelectItem>
                  <SelectItem value="pitching">Pitching</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {leaderboard?.ruleset.name ?? 'Leaderboard'}
            {selectedYear !== 'all' && ` - ${selectedYear}`}
          </CardTitle>
          <CardDescription>
            {leaderboard?.total?.toLocaleString() ?? 0} players total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        No results found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {page * pageSize + 1} to{' '}
                  {Math.min((page + 1) * pageSize, leaderboard?.total ?? 0)} of{' '}
                  {leaderboard?.total?.toLocaleString() ?? 0}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {page + 1} of {totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
