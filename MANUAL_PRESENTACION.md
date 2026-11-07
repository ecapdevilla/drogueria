# Manual de presentación — Droguería (Software de gestión)

> **Para quién es este manual:** para ti (vendedor/soporte) antes de mostrar la app a una cliente.
> **Cómo usarlo:** léelo una vez, abre la app en https://drogueria-ten.vercel.app y sigue los pasos en orden.
> **Idioma:** español. **Nivel:** explicado como para un niño; sin tecnicismos.

---

## 0. Antes de la reunión (5 minutos)

1. Abre Chrome o Edge en tu computador.
2. Entra a **https://drogueria-ten.vercel.app**.
3. Inicia sesión con la cuenta demo:
   - Correo: `demo@drogueria.com`
   - Contraseña: `Demo2026!`
4. Si la cliente va a mirar desde su propio computador, dale esas mismas credenciales y pídele que use Chrome o Edge (no Internet Explorer ni celulares viejos).
5. Cierra todas las pestañas que no uses para que la app se vea limpia.
6. Ten listo el código de barras de un producto (puedes tipear `7701234567890` y dar Enter en el POS; es el de "Acetaminofén 500mg").

**Consejo de oro:** no improvises. Sigue este guion en orden. Cada módulo tiene un "qué decir" y un "qué hacer".

---

## 1. Pantalla de entrada (Login) — 30 segundos

**Qué decir:** "Esta es la puerta de entrada. Solo el personal autorizado entra. Cada persona tiene su usuario y su rol: administrador, cajero o inventario. Así nadie ve lo que no le corresponde."

**Qué hacer:**
- Muestra el login: el logo de la píldora, el fondo con luces, el formulario limpio.
- Señala el candado y el mensaje "Acceso restringido al personal autorizado".
- Escribe el correo y la contraseña, presiona **Ingresar**.
- Menciona que si alguien intenta entrar con datos malos, aparece un mensaje claro en español.

---

## 2. Dashboard (pantalla principal) — 1 minuto

**Qué decir:** "Aquí la dueña ve, de un vistazo, cómo va el negocio hoy: cuánto se vendió, cuánto se ganó, cuánto se gastó y la utilidad neta. Todo en pesos colombianos."

**Qué hacer:**
- Señala las 4 tarjetas de arriba: **Ventas totales**, **Utilidad bruta**, **Gastos**, **Utilidad neta**.
- Señala las gráficas: "Ventas por método de pago" y "Gastos por categoría".
- Señala "Top productos" y "Stock bajo" (alertas en amarillo).
- Señala abajo el "Catálogo": productos, lotes, clientes, compras.
- Presiona el botón **Nueva venta** (arriba a la derecha) para ir al POS.

---

## 3. Punto de venta (POS) — 2 minutos (el plato fuerte)

**Qué decir:** "Este es el corazón de la droguería. Vender es tan fácil como escanear o buscar. El inventario se descuenta solo y el recibo sale listo para imprimir."

**Qué hacer, paso a paso:**
1. En la caja de búsqueda, escribe `7701234567890` y presiona **Enter**. Aparece "Acetaminofén 500mg" en el carrito.
2. Muestra el carrito: cantidad, precio unitario, descuento por línea, subtotal y **TOTAL**.
3. Presiona el botón **Cobrar** (o la tecla **F3**).
4. En la ventana de cobro:
   - El total a cobrar aparece grande.
   - Elige el método: **Efectivo**, **Transferencia**, **Tarjeta** u **Otro**.
   - Escribe el monto recibido (ej. 2000) y muestra cómo calcula las **vueltas** (500).
   - Presiona **Confirmar cobro**.
5. Aparece el **recibo** con número de venta, fecha, cliente, productos, pagos y vueltas.
6. Presiona **Imprimir recibo** (sale en formato de 80 mm, para impresora térmica).
7. Presiona **Nueva venta** para volver a empezar.

**Atajos que impresionan:** F2 (buscar), F3 (cobrar), F4 (imprimir), Escape (vaciar carrito).

**Qué destacar:** "Funciona incluso sin internet: si se cae la red, la venta se guarda y se sincroniza sola cuando vuelve."

---

## 4. Inventario — 1 minuto

**Qué decir:** "Aquí controlas los lotes, las fechas de vencimiento y los ajustes. El sistema avisa qué está por vencer y no deja vender lotes vencidos."

**Qué hacer:**
- Entra a **Inventario**.
- Muestra la lista de lotes con código, cantidad, fecha de vencimiento y estado (vigente / próximo a vencer / vencido).
- Muestra el filtro de búsqueda (por producto, lote, código interno o código de barras).
- Explica: "Si haces un conteo físico y la cantidad real es distinta, ajustas el lote y queda un movimiento trazable con el motivo (conteo, daño, vencido, otro)."

---

## 5. Compras — 1 minuto

**Qué decir:** "Registrar una compra es fácil: eliges el proveedor, agregas productos con su costo y fecha de vencimiento, y el sistema crea el lote, actualiza el stock y el costo automáticamente."

**Qué hacer:**
- Entra a **Compras** → **Nueva compra**.
- Selecciona un proveedor (o crea uno rápido).
- Agrega un producto, cantidad, costo unitario, código de lote y fecha de vencimiento.
- Muestra cómo se puede crear un producto nuevo desde aquí mismo (alta rápida).
- Confirma la compra y muestra que el stock del producto subió.

---

## 6. Caja — 1 minuto

**Qué decir:** "Al abrir la caja registras con cuánto empiezas. Al cerrar, el sistema calcula cuánto debería haber según las ventas y gastos, y te dice la diferencia."

**Qué hacer:**
- Entra a **Caja**.
- Muestra **Abrir caja** (monto inicial).
- Muestra el arqueo: ventas por método, gastos, efectivo esperado, contado y diferencia.
- Muestra la exportación a CSV.

---

## 7. Gastos — 30 segundos

**Qué decir:** "Los gastos operativos (luz, agua, sueldos, etc.) se registran aquí y se descuentan de la utilidad. Todo queda en reportes."

**Qué hacer:**
- Entra a **Gastos** → **Nuevo gasto**.
- Muestra categoría, descripción, monto, método de pago y notas.
- Muestra el historial y el botón **Gastos CSV**.

---

## 8. Devoluciones — 30 segundos

**Qué decir:** "Si un cliente devuelve un producto, lo registras y el sistema repone el stock al lote original (o crea uno nuevo) y deja el movimiento trazable."

**Qué hacer:**
- Entra a **Devoluciones**.
- Selecciona una venta, elige los productos y cantidades, indica si se repone stock.
- Muestra que la venta queda marcada como "devuelta".

---

## 9. Reportes — 1 minuto

**Qué decir:** "Reportes por rango de fechas: ventas, utilidad por producto y categoría, ticket promedio y arqueo de caja. Todo exportable a Excel (CSV)."

**Qué hacer:**
- Entra a **Reportes**.
- Cambia el rango de fechas.
- Muestra las tablas y el botón de exportar CSV.

---

## 10. Analítica — 30 segundos

**Qué decir:** "Para la dueña que quiere ver tendencias: KPIs, gráficas y tablas con filtros. Solo el administrador la ve."

**Qué hacer:**
- Entra a **Analítica**.
- Muestra filtros por fecha, KPIs y gráficas.
- Menciona que los datos se sincronizan con la nube para respaldo y análisis.

---

## 11. Configuración — 30 segundos

**Qué decir:** "Aquí se administran los productos, proveedores, clientes y los respaldos. También se suben los datos a la nube para analítica."

**Qué hacer:**
- Entra a **Configuración**.
- Muestra **Descargar respaldo** (JSON) y **Restaurar respaldo**.
- Muestra **Subir datos a Supabase** y **Descargar de Supabase**.
- Muestra **Cargar demo** (para probar con datos de ejemplo) y **Reiniciar**.

---

## 12. Atajos de teclado — 30 segundos (impresiona mucho)

**Qué decir:** "Para que el cajero vuele, hay atajos: F1 muestra la ayuda."

**Qué hacer:**
- Presiona **F1** para abrir el panel de atajos.
- Menciona: **F2** busca, **F3** cobra, **F4** imprime, **Alt+1…9/0** cambia de módulo, **Alt+R** reportes, **Alt+A** analítica, **Alt+C** configuración, **Alt+N** nueva venta, **Ctrl+Enter** confirmar.

---

## 13. Instalación como app (PWA) — 30 segundos

**Qué decir:** "La app se puede instalar como un programa en el computador o en el celular, y funciona sin internet."

**Qué hacer:**
- En Chrome, muestra el ícono de instalación en la barra de direcciones (o el menú ⋮ → "Instalar Droguería").
- Instálala y ábrela como app independiente.
- Menciona que funciona offline.

---

## Preguntas frecuentes de la cliente (y tus respuestas)

- **"¿Necesito servidor o computador potente?"** → No. Funciona en cualquier navegador moderno; los datos se guardan en la nube.
- **"¿Y si se va la luz o el internet?"** → La app sigue funcionando offline y sincroniza cuando vuelve la conexión.
- **"¿Puedo tener varios usuarios?"** → Sí: administrador, cajero e inventario, cada uno con sus permisos.
- **"¿Se pueden tener varias sucursales?"** → La arquitectura lo soporta; hoy está configurado para una sucursal, se activa multi-sucursal en la siguiente fase.
- **"¿Los datos son seguros?"** → Sí: base de datos en la nube con respaldos, roles y permisos por usuario.
- **"¿Puedo exportar a Excel?"** → Sí, reportes y caja se exportan a CSV.
- **"¿Hay soporte?"** → Sí, incluido en el plan mensual; en licencia única, 3 meses.

---

## Cierre de la presentación (30 segundos)

**Qué decir:** "La droguería gana tiempo, control y tranquilidad. El inventario no se pierde, las ventas quedan registradas, la caja cuadra sola y la dueña ve su negocio desde cualquier lugar. ¿Te gustaría empezar con una prueba de 2 semanas?"

---

## Notas para ti (no para la cliente)

- La web publicada está en **https://drogueria-ten.vercel.app** (modo local + login real).
- Credenciales demo: `demo@drogueria.com` / `Demo2026!`.
- Si la cliente hace cambios como admin, se sincronizan a Supabase (avísale que es demo).
- Si algo falla en la demo, recarga la página (F5) y vuelve a entrar.
- No muestres la consola del navegador ni hables de "migraciones" o "RPCs"; habla de "sincronización" y "respaldo".

---

**Versión del manual:** Software 2026 v2 · Desarrollado por Ing. Estiben Rafael Capdevilla Pacheco
