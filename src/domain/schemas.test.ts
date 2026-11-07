import { describe, expect, it } from 'vitest';
import {
  adjustmentSchema,
  customerSchema,
  expenseSchema,
  paymentFormSchema,
  productSchema,
  purchaseSchema,
  returnSchema,
  saleSchema,
  supplierPatchSchema,
  supplierSchema,
} from './schemas';

const validProduct = {
  internalCode: 'P001',
  barcode: '7700000000001',
  commercialName: 'Acetaminofén 500 mg',
  category: 'Analgésicos',
  purchasePrice: 800,
  salePrice: 1500,
  minStock: 5,
  active: true,
};

describe('productSchema', () => {
  it('acepta un producto válido', () => {
    const result = productSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it('rechaza un precio de venta menor al costo', () => {
    const result = productSchema.safeParse({
      ...validProduct,
      purchasePrice: 2000,
      salePrice: 1500,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('menor al costo');
    }
  });

  it('rechaza precios de venta en cero o negativos', () => {
    expect(productSchema.safeParse({ ...validProduct, salePrice: 0 }).success).toBe(false);
    expect(productSchema.safeParse({ ...validProduct, salePrice: -10 }).success).toBe(false);
  });

  it('exige el nombre comercial', () => {
    const result = productSchema.safeParse({ ...validProduct, commercialName: '   ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('obligatorio');
    }
  });

  it('convierte textos opcionales vacíos en undefined', () => {
    const parsed = productSchema.parse({ ...validProduct, internalCode: '   ', barcode: '' });
    expect(parsed.internalCode).toBeUndefined();
    expect(parsed.barcode).toBeUndefined();
  });

  it('rechaza stock mínimo decimal', () => {
    expect(productSchema.safeParse({ ...validProduct, minStock: 2.5 }).success).toBe(false);
  });
});

describe('purchaseSchema', () => {
  it('exige al menos un producto', () => {
    const result = purchaseSchema.safeParse({ supplierId: 'sup-1', items: [] });
    expect(result.success).toBe(false);
  });

  it('acepta una compra con una línea válida', () => {
    const result = purchaseSchema.safeParse({
      supplierId: 'sup-1',
      invoiceRef: 'FAC-001',
      items: [{ productId: 'prod-1', quantity: 3, unitCost: 800, lotCode: 'L1', expiryDate: '' }],
    });
    expect(result.success).toBe(true);
  });

  it('rechaza cantidades no enteras', () => {
    const result = purchaseSchema.safeParse({
      supplierId: 'sup-1',
      items: [{ productId: 'prod-1', quantity: 1.5, unitCost: 800 }],
    });
    expect(result.success).toBe(false);
  });
});

describe('saleSchema', () => {
  it('acepta una venta válida', () => {
    const result = saleSchema.safeParse({
      items: [{ productId: 'prod-1', quantity: 2 }],
      discount: 0,
      paymentMethod: 'CASH',
    });
    expect(result.success).toBe(true);
  });

  it('rechaza métodos de pago desconocidos', () => {
    const result = saleSchema.safeParse({
      items: [{ productId: 'prod-1', quantity: 2 }],
      discount: 0,
      paymentMethod: 'BITCOIN',
    });
    expect(result.success).toBe(false);
  });

  it('acepta descuentos por línea y pagos mixtos', () => {
    const result = saleSchema.safeParse({
      items: [{ productId: 'prod-1', quantity: 2, discount: 200 }],
      discount: 100,
      paymentMethod: 'CASH',
      payments: [
        { method: 'CASH', amount: 1000 },
        { method: 'CARD', amount: 2100 },
      ],
      cashReceived: 5000,
    });

    expect(result.success).toBe(true);
  });

  it('rechaza descuentos y pagos negativos', () => {
    expect(
      saleSchema.safeParse({
        items: [{ productId: 'prod-1', quantity: 2, discount: -1 }],
        discount: 0,
        paymentMethod: 'CASH',
      }).success,
    ).toBe(false);

    expect(
      saleSchema.safeParse({
        items: [{ productId: 'prod-1', quantity: 2 }],
        discount: 0,
        paymentMethod: 'CASH',
        payments: [{ method: 'CASH', amount: -1 }],
      }).success,
    ).toBe(false);
  });
});

describe('paymentFormSchema', () => {
  const schema = paymentFormSchema(3000);

  it('acepta pagos que suman el total', () => {
    const result = schema.safeParse({
      payments: [
        { method: 'CASH', amount: 1000 },
        { method: 'CARD', amount: 2000 },
      ],
      cashReceived: 5000,
    });

    expect(result.success).toBe(true);
  });

  it('rechaza pagos incompletos', () => {
    const result = schema.safeParse({
      payments: [{ method: 'CASH', amount: 1000 }],
      cashReceived: 1000,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('sumar exactamente');
    }
  });

  it('rechaza un efectivo recibido menor a la parte en efectivo', () => {
    const result = schema.safeParse({
      payments: [{ method: 'CASH', amount: 3000 }],
      cashReceived: 2000,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('no cubre');
    }
  });
});

describe('expenseSchema', () => {
  const validExpense = {
    category: 'Servicios',
    description: 'Energía',
    amount: 120000,
    paymentMethod: 'EFECTIVO' as const,
  };

  it('acepta un gasto válido', () => {
    expect(expenseSchema.safeParse(validExpense).success).toBe(true);
  });

  it('rechaza montos no positivos', () => {
    expect(expenseSchema.safeParse({ ...validExpense, amount: 0 }).success).toBe(false);
    expect(expenseSchema.safeParse({ ...validExpense, amount: -1 }).success).toBe(false);
  });

  it('exige descripción', () => {
    expect(expenseSchema.safeParse({ ...validExpense, description: '' }).success).toBe(false);
  });
});

describe('adjustmentSchema', () => {
  const validAdjustment = {
    lotId: 'lot-1',
    newQuantity: 5,
    reason: 'COUNT' as const,
    note: '',
  };

  it('acepta un ajuste válido', () => {
    expect(adjustmentSchema.safeParse(validAdjustment).success).toBe(true);
  });

  it('rechaza cantidades negativas o decimales', () => {
    expect(adjustmentSchema.safeParse({ ...validAdjustment, newQuantity: -1 }).success).toBe(false);
    expect(adjustmentSchema.safeParse({ ...validAdjustment, newQuantity: 1.5 }).success).toBe(
      false,
    );
  });

  it('exige un lote y un motivo válido', () => {
    expect(adjustmentSchema.safeParse({ ...validAdjustment, lotId: '' }).success).toBe(false);
    expect(adjustmentSchema.safeParse({ ...validAdjustment, reason: 'OTRO' }).success).toBe(false);
  });

  it('exige una nota cuando el motivo es OTRO', () => {
    const result = adjustmentSchema.safeParse({ ...validAdjustment, reason: 'OTHER', note: '' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Describe el motivo');
    }

    expect(
      adjustmentSchema.safeParse({
        ...validAdjustment,
        reason: 'OTHER',
        note: 'Vencido por humedad',
      }).success,
    ).toBe(true);
  });
});

describe('supplierSchema', () => {
  const validSupplier = {
    name: 'Distribuciones Andinas SAS',
    taxId: '900.123.456-7',
    contact: 'Laura Gómez',
    phone: '310 555 0101',
    email: 'compras@andinas.com',
    address: 'Calle 12 #34-56',
  };

  it('acepta un proveedor válido', () => {
    expect(supplierSchema.safeParse(validSupplier).success).toBe(true);
  });

  it('exige el nombre', () => {
    const result = supplierSchema.safeParse({ ...validSupplier, name: '   ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('obligatorio');
    }
  });

  it('rechaza un correo inválido', () => {
    expect(supplierSchema.safeParse({ ...validSupplier, email: 'no-es-correo' }).success).toBe(
      false,
    );
  });

  it('convierte los campos opcionales vacíos en undefined', () => {
    const parsed = supplierSchema.parse({
      name: 'Proveedor',
      taxId: '',
      contact: '  ',
      phone: '',
      email: '',
      address: '',
    });

    expect(parsed.taxId).toBeUndefined();
    expect(parsed.contact).toBeUndefined();
    expect(parsed.phone).toBeUndefined();
    expect(parsed.email).toBeUndefined();
    expect(parsed.address).toBeUndefined();
  });

  it('permite actualizaciones parciales sin exigir el nombre', () => {
    expect(supplierPatchSchema.safeParse({ phone: '300 111 2233' }).success).toBe(true);
  });
});

describe('customerSchema', () => {
  it('exige el nombre', () => {
    expect(customerSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('acepta datos opcionales vacíos', () => {
    const parsed = customerSchema.parse({ name: 'María', phone: '300', identification: 'CC 123' });
    expect(parsed.phone).toBe('300');
  });
});

describe('returnSchema', () => {
  it('exige motivo y productos', () => {
    expect(
      returnSchema.safeParse({ saleId: 'sale-1', reason: '', restock: true, items: [] }).success,
    ).toBe(false);
  });

  it('acepta una devolución válida', () => {
    const result = returnSchema.safeParse({
      saleId: 'sale-1',
      reason: 'Producto defectuoso',
      restock: true,
      items: [{ productId: 'prod-1', quantity: 1 }],
    });
    expect(result.success).toBe(true);
  });
});
