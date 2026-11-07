// src/App.tsx
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './components/auth/RequireAuth';
import { Shell } from './components/layout/Shell';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import POS from './pages/POS';
import Purchases from './pages/Purchases';
import Suppliers from './pages/Suppliers';
import Cash from './pages/Cash';
import Expenses from './pages/Expenses';
import Returns from './pages/Returns';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Login from './pages/Login';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <RequireAuth>
              <Shell>
                <Outlet />
              </Shell>
            </RequireAuth>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/productos" element={<Products />} />
          <Route path="/inventario" element={<Inventory />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/compras" element={<Purchases />} />
          <Route path="/proveedores" element={<Suppliers />} />
          <Route path="/caja" element={<Cash />} />
          <Route path="/gastos" element={<Expenses />} />
          <Route path="/devoluciones" element={<Returns />} />
          <Route path="/clientes" element={<Customers />} />
          <Route path="/reportes" element={<Reports />} />
          <Route path="/analitica" element={<Analytics />} />
          <Route path="/configuracion" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
