import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { PlayerPage } from './pages/PlayerPage';
import { GamePage } from './pages/GamePage';
import { DateExplorerPage } from './pages/DateExplorerPage';
import { QueryBuilderPage } from './pages/QueryBuilderPage';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/leaderboards" element={<LeaderboardPage />} />
        <Route path="/players/:id" element={<PlayerPage />} />
        <Route path="/games/:id" element={<GamePage />} />
        <Route path="/explore" element={<DateExplorerPage />} />
        <Route path="/query" element={<QueryBuilderPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
