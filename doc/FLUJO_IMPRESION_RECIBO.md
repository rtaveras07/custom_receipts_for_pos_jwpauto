# Flujo de impresión de recibos en Odoo 17 POS (custom_receipts_for_pos)

## 1. Generación de datos del recibo
- Al finalizar una venta o al reimprimir un ticket, el modelo `Order` en JavaScript genera los datos del recibo.
- El método `export_for_printing()` (parchado en `pos_order_patch.js`) se encarga de exportar todos los datos relevantes:
  - Para cada línea de producto (`orderlines`), se incluyen:
    - Nombre del producto (`productName`)
    - Cantidad (`qty`)
    - Precio unitario (`unitPrice`)
    - Impuesto calculado por producto (`tax_amount`)
    - Precio total con impuestos (`price`)
    - Descuento (`discount`)
    - Unidad de medida (`unit_name`)
    - Nota del cliente (`customerNote`)

## 2. Renderizado del recibo
- El archivo `receipt_design.js` extiende el componente `OrderReceipt` de Owl.
- En el getter `templateProps`, se mapea y prepara la información de las líneas de producto:
  - Si existen `receiptData.orderlines`, se usan y se convierten a números con `parseFloat`.
  - Si no existen, se usa el resultado de `order.export_for_printing().orderlines`.
- Se calculan totales y descuentos.
- Se preparan los datos fiscales y del cliente.

## 3. Template XML
- El template XML (definido en la configuración y archivos de datos) itera sobre `props.receipt.orderlines` para mostrar:
  - Nombre del producto
  - Cantidad
  - Precio unitario
  - Impuesto
  - Precio total
  - Descuento y nota si aplica

## 4. Reimpresión
- Al reimprimir un ticket, el flujo es idéntico:
  - Se recupera el objeto `Order` y se llama a `export_for_printing()`.
  - Los datos se pasan al template y se renderizan todas las líneas de productos.

## 5. Validaciones
- El mapeo convierte valores string a number para evitar errores de formato.
- El método `export_for_printing()` garantiza que los datos lleguen completos.

## Archivos clave
- `static/src/js/pos_order_patch.js`: Parche del modelo Order y método export_for_printing.
- `static/src/js/receipt_design.js`: Renderizado y mapeo de datos para el template.
- `data/pos_receipt_design1_data.xml`: Ejemplo de template XML.

## Observaciones
- El flujo respeta la estructura original de Odoo y Owl.
- Los datos fiscales y de cliente se obtienen del backend y se integran en el recibo.
- El template XML puede personalizarse según necesidades.

---
Última actualización: 12 de marzo de 2026
