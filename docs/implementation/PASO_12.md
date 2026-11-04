# Paso 12. Inventario editable, transacciones y equipamiento

## Fuentes y alcance

- *Player's Handbook* (2024), cap. 6, pp. 213 (monedas, venta de equipo), 215 (precios de armas), 219 (armaduras y escudos) y 223 (equipo de aventurero).
- Fuente adicional del proyecto: SRD 5.2.1, que puede ampliar el catálogo en iteraciones posteriores.
- Prototipo restringido a un Guerrero de nivel 1 a 3. No incorpora guardado en la base de datos, objetos mágicos, volumen/peso, sintonización, temporizadores de ponerse/quitarse armaduras ni ejecución de ataques.

## Decisiones técnicas

### Identidad y precio

`packages/rules-engine/src/inventory.ts` añade un catálogo canónico sobre `CatalogItemId` y los 12 IDs de armaduras de `defense.ts`, más `shield`. Los nombres y precios de la tienda están separados de las entradas iniciales. Cada precio reconocido está expresado en **piezas de cobre**:

- 1 po = 100 piezas de cobre; 1 moneda de plata = 10 piezas de cobre.
- Escudo: 10 po = 1000 pc.
- Cota de malla: 75 po = 7500 pc.
- Flechas: 20 por 1 po = 5 pc por unidad.
- La venta ordinaria de equipo recupera **la mitad de su valor**, redondeando hacia abajo en cobre para el lote vendido.

Los artículos con precios variables o que aún no hemos normalizado pueden incorporarse como botín, pero no comprarse ni venderse desde la tienda integrada. Esta restricción evita atribuirles precios inventados.

### Estado y procedencia

`InventoryState` contiene:

- `coinsCopper`: saldo entero no negativo;
- `items`: líneas agrupadas por ID, con `quantity` y fuentes `class`, `background`, `purchase`, `loot`;
- `equipped`: una sola armadura (`ArmorId | null`) y un escudo (`boolean`).

El inventario de origen sigue generándose exclusivamente mediante `combineStartingInventory()`. Un **diario de acciones** transforma ese inventario, conservando la procedencia y sin alterar los datos de partida. La reconstrucción es determinista.

### Operaciones

- `buy`: añade objetos y resta el coste. Impide monedas insuficientes o precios desconocidos.
- `sell`: retira unidades y abona la mitad del coste. No permite vender más de lo poseído.
- `add`: registra hallazgos o regalos sin deducir dinero.
- `remove`: descarta o consume unidades sin producir dinero.
- `equip_armor`: equipa solo una armadura que pertenezca al inventario, o ninguna.
- `equip_shield`: equipa o retira un escudo poseído.

Si se vende o descarta la última unidad de una armadura o un escudo equipado, se desequipa automáticamente. Las operaciones devuelven nuevos objetos y no mutan los anteriores.

### Integración con la hoja

`calculateGuidedFighter()` recibe ahora opcionalmente `inventoryActions` y devuelve `inventory`.

- Primero valida clase, trasfondo, características, dotes y elecciones.
- Construye el inventario inicial y reproduce las operaciones válidas.
- Verifica que el equipamiento declarado coincide con el equipamiento realmente poseído.
- Calcula la CA con la nueva armadura y escudo. El estilo Defensa continúa sumando +1 solo cuando se lleva armadura.
- Mantiene intactos los cálculos anteriores de características, competencias, recursos y PG.

Para preservar la compatibilidad, `inventoryActions` es **opcional**. Los personajes sin ese campo conservan la validación del equipamiento inicial de los pasos anteriores.

## Interfaz del creador

En el paso **Equipo** se añade el bloque **Inventario editable**:

1. Selecciona un objeto del catálogo y una cantidad.
2. Usa «Comprar», «Vender», «Añadir botín» o «Descartar».
3. Equipa una armadura poseída y, si tienes uno, un escudo.
4. Comprueba el saldo, el inventario y la CA en la hoja en vivo.
5. Puedes deshacer la última operación o restablecer el inventario inicial.

Los cambios del inventario no son persistentes. Si se cambia el paquete inicial de clase o trasfondo, el historial de operaciones deja de aplicarse para evitar que compras previas se mezclen con un personaje de origen distinto. Si se vuelve a un paquete anterior, el historial de ese paquete no se recupera automáticamente. Tampoco se simula disponibilidad real de tiendas: las compras son decisiones aprobadas por el director.

## Archivos nuevos y actualizados

| Ruta | Acción |
|---|---|
| `packages/rules-engine/src/inventory.ts` | Nuevo |
| `packages/rules-engine/src/guided.ts` | Actualizado |
| `packages/rules-engine/src/index.ts` | Actualizado |
| `packages/rules-engine/tests/inventory.test.ts` | Nuevo |
| `apps/web/src/app/page.tsx` | Actualizado |
| `apps/web/src/app/globals.css` | Actualizado |
| `docs/implementation/PASO_12.md` | Nuevo |

## Instalación en Windows

1. Cierra el servidor `pnpm dev` si está ejecutándose.
2. Realiza un commit de seguridad si tienes cambios locales propios.
3. Descomprime `actualizacion-web-06.zip` y copia **solo las carpetas `apps`, `packages` y `docs`** a la raíz de `dnd-character-builder`.
4. Combina carpetas y reemplaza los archivos indicados en la tabla. No borres carpetas ni los módulos anteriores.
5. Ejecuta:

```powershell
pnpm test
pnpm build
pnpm dev
```

Visita `http://localhost:3000`, ve al paso **Equipo** y prueba los casos siguientes.

## Pruebas manuales

1. Guerrero A + Soldado A: 18 po, cota de malla equipada, estilo Defensa: CA 17 (con valores predeterminados de la pantalla).
2. Compra un escudo por 10 po: saldo 8 po; equípalo: CA 19.
3. Desequipa el escudo: CA 17.
4. Quita la armadura: CA 12 (DES 14); el +1 de Defensa deja de aplicarse.
5. Vende la cota de malla por 37 po y 5 monedas de plata: se retira del inventario y no puede permanecer equipada.
6. Intenta comprar una armadura de placas sin dinero suficiente: se muestra error sin alterar el saldo.
7. Añade un objeto como botín; comprueba que la procedencia figura como «Botín».
8. Añade 10 flechas compradas: las existentes no se duplican como otra línea, sino que aumentan en cantidad y conservan la procedencia.
9. Deshaz una operación y verifica que el estado regresa al anterior.
10. Cambia el paquete inicial de Guerrero: el inventario se recalcula sin arrastrar las compras del paquete previo.
11. Comprueba que no han cambiado las dotes, los conjuros de origen ni los recursos de clase.

## Verificación realizada en el entorno de preparación

- TypeScript estricto para los módulos del motor: **sin errores**.
- Comprobación de tipos y sintaxis de la pantalla TSX con definiciones de prueba: **sin errores**.
- Verificador local de aserciones compatible con las pruebas anteriores: **189/189 comprobaciones correctas**.
- El verificador local no sustituye a `pnpm test` (Vitest real) ni a `pnpm build` (Next.js real), que deben ejecutarse en el repositorio del usuario.

## Próximo hito

Persistencia de personajes: separar el estado original, las elecciones de creación y el diario de inventario en la base de datos PostgreSQL/Prisma. Antes de activar almacenamiento permanente, definir migraciones y tratamiento seguro de los cambios de trasfondo, especie o nivel.
