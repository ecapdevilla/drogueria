// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import POS from './pages/POS';
import Purchases from './pages/Purchases';
import Cash from './pages/Cash';
import Expenses from './pages/Expenses';
import Returns from './pages/Returns';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/productos" element={<Products />} />
          <Route path="/inventario" element={<Inventory />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/compras" element={<Purchases />} />
          <Route path="/caja" element={<Cash />} />
          <Route path="/gastos" element={<Expenses />} />
          <Route path="/devoluciones" element={<Returns />} />
          <Route path="/clientes" element={<Customers />} />
          <Route path="/reportes" element={<Reports />} />
          <Route path="/configuracion" element={<Settings />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  );
}