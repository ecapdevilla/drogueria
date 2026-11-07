import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Barcode,
  CreditCard,
  Minus,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/layout/PageHeader';
import { PaymentModal } from '../components/pos/PaymentModal';
import { SaleReceipt } from '../components/pos/SaleReceipt';
import { cop } from '../utils/money';
import { availableStock, expiredStock, isLotExpired } from '../services/inventory.service';
import { PaymentSplit, Product, Sale } from '../types';

interface CartItem {
  productId: string;
  quantity: number;
  discount: number;
}

interface ReceiptState {
  sale: Sale;
  customerName?: string;
}

export default function POS() {
  const db = useAppStore(s => s.db);
  const buildSale = useAppStore(s => s.buildSale);
  const pushToast = useAppStore(s => s.pushToast);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [customerId, setCustomerId] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptState | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = search.trim()
    ? db.products.filter(
        p =>
          p.active &&
          (p.commercialName.toLowerCase().includes(search.toLowerCase()) ||
            p.internalCode.toLowerCase().includes(search.toLowerCase()) ||
            (p.barcode?.includes(search) ?? false)),
      )
    : [];

  const addToCart = (product: Product) => {
    const sellable = availableStock(db.lots, product.id);
    const current = cart.find(item => item.productId === product.id)?.quantity ?? 0;
    if (sellable <= 0) {
      pushToast(`Sin stock vigente: ${product.commercialName}`, 'error');
      return;
    }
    if (current >= sellable) {
      pushToast(`Stock vigente insuficiente: ${product.commercialName}`, 'error');
      return;
    }
    setCart(currentCart => {
      const existing = currentCart.find(item => item.productId === product.id);
      if (existing) {
        return currentCart.map(item =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...currentCart, { productId: product.id, quantity: 1, discount: 0 }];
    });
    setSearch('');
  };

  /** Lector de código de barras: el scanner escribe el código y envía Enter. */
  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    const term = search.trim();
    if (!term) return;

    const exact = db.products.find(
      product =>
        product.active &&
        ((product.barcode ?? '') === term ||
          product.internalCode.toLowerCase() === term.toLowerCase()),
    );
    const target = exact ?? (filtered.length === 1 ? filtered[0] : undefined);

    if (!target) {
      pushToast(
        filtered.length > 1 ? 'Selecciona un producto de la lista' : 'Código no encontrado',
        'error',
      );
      return;
    }
    addToCart(target);
  };

  const updateQuantity = (productId: string, delta: number) => {
    const product = db.products.find(p => p.id === productId);
    const item = cart.find(i => i.productId === productId);
    if (!product || !item) return;

    const next = item.quantity + delta;
    const sellable = availableStock(db.lots, product.id);
    if (next > sellable) {
      pushToast(`Stock vigente insuficiente: ${product.commercialName}`, 'error');
      return;
    }

    setCart(current =>
      current.flatMap(line => {
        if (line.productId !== productId) return [line];
        if (next <= 0) return [];
        const lineSubtotal = product.salePrice * next;
        return [
          {
            ...line,
            quantity: next,
            discount: Math.min(line.discount, lineSubtotal),
          },
        ];
      }),
    );
  };

  const updateLineDiscount = (productId: string, value: string) => {
    const product = db.products.find(p => p.id === productId);
    const line = cart.find(item => item.productId === productId);
    if (!product || !line) return;

    const max = product.salePrice * line.quantity;
    const next = Math.max(0, Math.min(max, Math.round(Number(value) || 0)));
    setCart(current =>
      current.map(item => (item.productId === productId ? { ...item, discount: next } : item)),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(current => current.filter(item => item.productId !== productId));
  };

  const cartRows = cart.map(item => {
    const product = db.products.find(p => p.id === item.productId);
    return { ...item, product };
  });

  const subtotal = cartRows.reduce(
    (sum, line) => sum + (line.product?.salePrice ?? 0) * line.quantity,
    0,
  );
  const lineDiscounts = cartRows.reduce(
    (sum, line) => sum + Math.min(line.discount, (line.product?.salePrice ?? 0) * line.quantity),
    0,
  );
  const maxGlobalDiscount = Math.max(0, subtotal - lineDiscounts);
  const globalDiscountApplied = Math.min(globalDiscount, maxGlobalDiscount);
  const total = Math.max(0, subtotal - lineDiscounts - globalDiscountApplied);

  const expiredUnits = db.lots
    .filter(lot => lot.enabled && lot.quantity > 0 && isLotExpired(lot))
    .reduce((sum, lot) => sum + lot.quantity, 0);

  const openPayment = () => {
    if (!cart.length) {
      pushToast('Agrega productos al carrito para cobrar', 'info');
      return;
    }
    setPaymentOpen(true);
  };

  const closeReceipt = () => {
    setReceipt(null);
    window.setTimeout(() => searchRef.current?.focus(), 50);
  };

  const confirmSale = (payments: PaymentSplit[], cashReceived?: number) => {
    const result = buildSale({
      items: cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        discount: item.discount || undefined,
      })),
      discount: globalDiscountApplied,
      paymentMethod: payments[0]?.method ?? 'CASH',
      payments,
      cashReceived,
      customerId: customerId || undefined,
    });
    if (!result) return;

    const customerName = customerId
      ? db.customers.find(customer => customer.id === customerId)?.name
      : undefined;

    setReceipt({ sale: result.sale, customerName });
    setPaymentOpen(false);
    setCart([]);
    setGlobalDiscount(0);
    setCustomerId('');
  };

  // Atajos de teclado para agilizar el mostrador.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F2') {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (event.key === 'F3') {
        event.preventDefault();
        if (cart.length && !paymentOpen && !receipt) setPaymentOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cart.length, paymentOpen, receipt]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Punto de venta"
        subtitle="Escanea, cobra y entrega el recibo sin salir de la pantalla"
        actions={
          <Badge variant="info">
            {db.products.filter(p => p.active).length} productos disponibles
          </Badge>
        }
      />

      {expiredUnits > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p>
            Hay <span className="font-semibold">{expiredUnits}</span> unidades en lotes vencidos. No
            se incluirán en las ventas; descárgalas desde Inventario.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <div className="card p-4">
            <div className="relative">
              <Barcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                ref={searchRef}
                placeholder="Escanea el código de barras o busca por nombre..."
                value={search}
                onChange={event => setSearch(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="h-11 pl-9"
                aria-label="Buscar productos para vender"
                autoFocus
              />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1">
                <kbd className="font-semibold text-slate-700">Enter</kbd>
                agrega el código escaneado
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1">
                <kbd className="font-semibold text-slate-700">F2</kbd>
                buscar
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1">
                <kbd className="font-semibold text-slate-700">F3</kbd>
                cobrar
              </span>
            </div>

            {search && (
              <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="px-2 py-8 text-center text-sm text-slate-400">
                    No encontramos productos para «{search}».
                  </p>
                ) : (
                  filtered.map(product => {
                    const sellable = availableStock(db.lots, product.id);
                    const expired = expiredStock(db.lots, product.id);
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addToCart(product)}
                        disabled={sellable <= 0}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {product.commercialName}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {product.internalCode || 'Sin código'} · {cop(product.salePrice)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                sellable <= 0
                                  ? 'danger'
                                  : sellable <= product.minStock
                                    ? 'warning'
                                    : 'success'
                              }
                            >
                              {sellable} uds.
                            </Badge>
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
                              <Plus className="h-4 w-4" />
                            </span>
                          </div>
                          {expired > 0 && (
                            <span className="text-[10px] font-semibold text-red-500">
                              {expired} vencida{expired === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {!search && (
              <div className="mt-4 flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                <Search className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                Escribe el nombre o código de un producto para agregarlo al carrito. El inventario
                se descuenta automáticamente al confirmar la venta.
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card sticky top-24 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-brand-600" />
                <h2 className="section-title">Carrito</h2>
              </div>
              <Badge variant={cart.length ? 'info' : 'default'}>
                {cart.reduce((sum, item) => sum + item.quantity, 0)} uds.
              </Badge>
            </div>

            {cart.length === 0 ? (
              <EmptyState
                icon={<ShoppingCart className="h-7 w-7" />}
                title="Carrito vacío"
                description="Escanea un código de barras o busca productos para comenzar."
              />
            ) : (
              <div className="space-y-4 p-4">
                <ul className="space-y-2">
                  {cartRows.map(line => {
                    const price = line.product?.salePrice ?? 0;
                    const lineSubtotal = price * line.quantity;
                    const lineDiscount = Math.min(line.discount, lineSubtotal);
                    const lineTotal = Math.max(0, lineSubtotal - lineDiscount);

                    return (
                      <li
                        key={line.productId}
                        className="rounded-xl border border-slate-200 bg-white p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {line.product?.commercialName ?? 'Producto'}
                            </p>
                            <p className="text-xs text-slate-500">{cop(price)} c/u</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(line.productId)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            aria-label={`Quitar ${line.product?.commercialName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="inline-flex items-center rounded-lg border border-slate-200">
                            <button
                              type="button"
                              onClick={() => updateQuantity(line.productId, -1)}
                              className="p-1.5 text-slate-500 transition hover:bg-slate-100"
                              aria-label="Disminuir cantidad"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-8 text-center text-sm font-semibold text-slate-800">
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(line.productId, 1)}
                              className="p-1.5 text-slate-500 transition hover:bg-slate-100"
                              aria-label="Aumentar cantidad"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <label
                              className="text-[10px] font-semibold uppercase tracking-wide text-slate-400"
                              htmlFor={`discount-${line.productId}`}
                            >
                              Desc.
                            </label>
                            <input
                              id={`discount-${line.productId}`}
                              type="number"
                              min={0}
                              max={lineSubtotal}
                              step="1"
                              value={line.discount}
                              onChange={event =>
                                updateLineDiscount(line.productId, event.target.value)
                              }
                              className="h-8 w-20 rounded-lg border border-slate-200 px-2 text-right text-xs text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                              aria-label={`Descuento de ${line.product?.commercialName ?? 'producto'}`}
                            />
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                          {lineDiscount > 0 ? (
                            <span className="text-[11px] font-medium text-emerald-700">
                              Ahorro {cop(lineDiscount)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              {line.quantity} x {cop(price)}
                            </span>
                          )}
                          <span className="text-sm font-semibold text-slate-900">
                            {cop(lineTotal)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <Input
                    label="Descuento global (COP)"
                    type="number"
                    min={0}
                    max={maxGlobalDiscount}
                    step="1"
                    value={globalDiscountApplied}
                    onChange={event =>
                      setGlobalDiscount(
                        Math.max(0, Math.min(maxGlobalDiscount, Number(event.target.value) || 0)),
                      )
                    }
                  />
                  <Select
                    label="Cliente (opcional)"
                    value={customerId}
                    onChange={event => setCustomerId(event.target.value)}
                  >
                    <option value="">Consumidor final</option>
                    {db.customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </Select>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>Subtotal</span>
                      <span>{cop(subtotal)}</span>
                    </div>
                    {lineDiscounts > 0 && (
                      <div className="flex justify-between text-sm text-emerald-700">
                        <span>Descuento por líneas</span>
                        <span>-{cop(lineDiscounts)}</span>
                      </div>
                    )}
                    {globalDiscountApplied > 0 && (
                      <div className="flex justify-between text-sm text-emerald-700">
                        <span>Descuento global</span>
                        <span>-{cop(globalDiscountApplied)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-white">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Total
                    </span>
                    <span className="font-display text-xl font-bold">{cop(total)}</span>
                  </div>

                  <Button className="w-full" size="lg" onClick={openPayment}>
                    <CreditCard className="h-4 w-4" />
                    Cobrar
                    <kbd className="ml-1 rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold">
                      F3
                    </kbd>
                  </Button>
                  <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                    <UserRound className="h-3 w-3" />
                    {customerId
                      ? db.customers.find(c => c.id === customerId)?.name
                      : 'Venta a consumidor final'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {paymentOpen && (
        <PaymentModal
          open
          total={total}
          onClose={() => setPaymentOpen(false)}
          onConfirm={confirmSale}
        />
      )}

      <Modal
        open={!!receipt}
        title="Venta registrada"
        onClose={closeReceipt}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={closeReceipt}>
              Nueva venta
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Imprimir recibo
            </Button>
          </>
        }
      >
        {receipt && <SaleReceipt sale={receipt.sale} customerName={receipt.customerName} />}
      </Modal>
    </div>
  );
}
