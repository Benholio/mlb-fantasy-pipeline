import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { TopByYearPage } from './pages/TopByYearPage';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/top-by-year" element={<TopByYearPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
