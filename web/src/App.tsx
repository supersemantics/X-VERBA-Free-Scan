import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import ScanProgress from './pages/ScanProgress';
import Dashboard from './pages/Dashboard';
import DetailedFindings from './pages/DetailedFindings';
import ExportContract from './pages/ExportContract';
import ScanHistory from './pages/ScanHistory';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/scanning" element={<ScanProgress />} />
        <Route path="/results/:scanId" element={<Dashboard />} />
        <Route path="/findings/:scanId" element={<DetailedFindings />} />
        <Route path="/export/:scanId" element={<ExportContract />} />
        <Route path="/history/:repo" element={<ScanHistory />} />
      </Routes>
    </Layout>
  );
}
