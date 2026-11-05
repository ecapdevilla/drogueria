import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { cop } from '../utils/money';
import { useToast } from '../hooks/useToast';

interface CartItem {
  productId: string;
  quantity: number;
}

export default function POS() {
  const db = useAppStore(s => s.db);
  const buildSale = useAppStore(s => s.buildSale);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState<'CASH' | 'TRANSFER' | 'CARD' | 'OTHER'>('CASH');
  const [customerId, setCustomerId] = useState('');

  const filtered = search.trim()
    ? db.products.filter(p => p.active && (
        p.commercialName.toLowerCase().includes(search.toLowerCase()) ||
        p.internalCode.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode?.includes(search) ?? false)
      ))
    : [];

  const addToCart = (p: typeof db.products[0]) => {
    setCart(c => {
      const existing = c.find(i => i.productId === p.id);
      if (existing) return c.map(i => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...c, { productId: p.id, quantity: 1 }];
    });
    setSearch('');
  };

  const removeFromCart = (productId: string) => {
    setCart(c => c.filter(i => i.productId !== productId));
  };

  const subtotal = cart.reduce((s, i) => {
    const p = db.products.find(pp => pp.id === i.productId);
    return s + (p?.salePrice ?? 0) * i.quantity;
  }, 0);
  const total = Math.max(0, subtotal - discount);

  const handleCheckout = () => {
    if (!cart.length) return;
    buildSale({ items: cart, discount, paymentMethod: method, customerId: customerId || undefined });
    setCart([]);
    setDiscount(0);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Input
          placeholder=" Buscar producto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <div className="bg-white rounded-lg shadow border border-slate-200 max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">Sin resultados</p>
            ) : (
              filtered.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{p.commercialName}</p>
                    <p className="text-xs text-slate-500">{cop(p.salePrice)} · stock: {p.stock}</p>
                  </div>
                  <Button size="sm" onClick={() => addToCart(p)} disabled={p.stock <= 0}>+</Button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-4 border border-slate-200 h-fit">
        <h3 className="font-semibold text-slate-800 mb-3">Venta</h3>
        {cart.length === 0 ? (
          <EmptyState title="Vacío" description="Busca y agrega productos" />
        ) : (
          <>
            <Table
              data={cart.map(i => {
                const p = db.products.find(pp => pp.id === i.productId)!;
                return { ...i, name: p.commercialName, price: p.salePrice, subtotal: p.salePrice * i.quantity };
              })}
              columns={[
                { key: 'name', header: 'Producto' },
                { key: 'quantity', header: 'Cant.' },
                { key: 'subtotal', header: 'Subtotal', render: r => cop(r.subtotal) },
                { key: 'productId', header: '', render: r => <Button size="sm" variant="danger" onClick={() => removeFromCart(r.productId)}>×</Button> },
              ]}
            />
            <div className="mt-4 space-y-2">
              <Input label="Descuento" type="number" value={discount}
                onChange={e => setDiscount(Math.max(0, +e.target.value))} />
              <div>
                <label className="text-xs text-slate-600">Método de pago</label>
                <select
                  value={method}
                  onChange={e => setMethod(e.target.value as typeof method)}
                  className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 rounded"
                >
                  <option value="CASH">Efectivo</option>
                  <option value="TRANSFER">Transferencia</option>
                  <option value="CARD">Tarjeta</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span><span>{cop(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total:</span><span className="font-bold text-lg">{cop(total)}</span>
              </div>
              <Button className="w-full" onClick={handleCheckout}>Confirmar venta</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}