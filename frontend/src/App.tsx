import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import Layout from './components/Layout';
import InventoryPage from './pages/InventoryPage';
import AddVehiclePage from './pages/AddVehiclePage';

const App = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/inventory" replace />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/add-vehicle" element={<AddVehiclePage />} />
      </Routes>
    </Layout>
  );
};

export default App;
