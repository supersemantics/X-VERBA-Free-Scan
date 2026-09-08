import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import ScanProgress from './pages/ScanProgress';
import Results from './pages/Results';
import Docs from './pages/Docs';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/scanning" element={<ScanProgress />} />
        <Route path="/results/:scanId" element={<Results />} />
        <Route path="/docs" element={<Docs />} />
      </Routes>
    </Layout>
  );
}
