import { DBShape, emptyDB } from '../types/schema';
import { id } from '../utils/id';

export function seedDemo(): DBShape {
  const db = emptyDB();
  const sup1 = { id: id(), name: 'Droguería Distribuciones Andinas SAS' };
  const sup2 = { id: id(), name: 'Comercializadora Salud Total Ltda' };
  db.suppliers = [sup1, sup2];

  const today = new Date();
  const inDays = (n: number) => new Date(today.getTime() + n * 86400000).toISOString();

  const products = [
    ['P001','7701234567890','Acetaminofén 500mg','Acetaminofén','Analgésicos','Acetaminofén','500mg','Tableta','Tableta','INVIMA-123',800,1500,120,20,sup1.id],
    ['P002','7701234567891','Ibuprofeno 400mg','Ibuprofeno','Analgésicos','Ibuprofeno','400mg','Tableta','Tableta','INVIMA-124',1200,2200,60,15,sup1.id],
    ['P003','7701234567892','Alcohol 70% 500ml','Alcohol','Aseo','Alcohol etílico','70%','Frasco','Solución','N/A',3500,6500,40,10,sup2.id],
    ['P004','7701234567893','Crema dental Colgate 90g','Crema dental','Cuidado personal','','','Tubo','Pasta','N/A',4200,7500,25,8,sup2.id],
    ['P005','7701234567894','Loratadina 10mg','Loratadina','Antialérgicos','Loratadina','10mg','Tableta','Tableta','INVIMA-125',600,1200,5,12,sup1.id], // bajo
  ] as const;

  products.forEach(([code,bar,name,gen,cat,act,conc,pres,form,reg,pc,pv,stk,min,sup]) => {
    const pid = id();
    db.products.push({
      id: pid, internalCode: code, barcode: bar, commercialName: name, genericName: gen,
      category: cat, activeIngredient: act, concentration: conc, presentation: pres,
      pharmaceuticalForm: form, invimaRegistry: reg, purchasePrice: pc, salePrice: pv,
      stock: stk, minStock: min, mainSupplierId: sup, active: true, createdAt: new Date().toISOString(),
    });
    db.lots.push({ id: id(), productId: pid, code: `L-${code}`, quantity: stk,
      expiryDate: inDays(code === 'P005' ? 20 : 400), purchaseCost: pc, enabled: true, createdAt: new Date().toISOString() });
  });

  return db;
}