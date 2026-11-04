# Paso 11 - Equipo de trasfondos e inventario inicial

## Fuentes y alcance

- *Player's Handbook* 2024, capítulo 4, trasfondos: Acólito (p. 178), Criminal (p. 179), Erudito (p. 183) y Soldado (p. 185).
- Equipo de clase del Guerrero ya implementado en el paso 09.
- Variante de juegos de azar en el capítulo 6 (p. 221).
- Complemento previsto: SRD 5.2.1 y ediciones posteriores, manteniendo fuente y revisión de cada contenido.

El prototipo sigue limitado a un Guerrero de niveles 1 a 3, y aún no implementa compras, intercambio de equipo ni guardado.

## Nueva elección de equipo de trasfondo

Cada trasfondo inicial ofrece dos paquetes:

| Trasfondo | Paquete A: dinero | Paquete B: dinero | Contenido importante del paquete A |
|---|---:|---:|---|
| Acólito | 8 po | 50 po | Caligrafía, libro de oraciones, símbolo sagrado, 10 pergaminos, túnica |
| Criminal | 16 po | 50 po | 2 dagas, herramientas de ladrón, palanca, 2 bolsas, ropa de viaje |
| Erudito | 8 po | 50 po | Bastón, caligrafía, libro de historia, 8 pergaminos, túnica |
| Soldado | 14 po | 50 po | Lanza, arco corto, 20 flechas, juego de azar elegido, botiquín, carcaj, ropa de viaje |

El Soldado debe elegir entre dados, dragonchess, naipes o tres dragones. La elección determina su competencia y, si elige A, el objeto que recibe. La opción B no elimina la competencia.

## Contratos nuevos

`packages/rules-engine/src/background-equipment.ts`:
- `BACKGROUND_PACKAGES`: datos de las opciones iniciales A/B.
- `GAMING_SETS`: variantes de los juegos de azar.
- `validateBackgroundEquipment(background, choice)`: valida el paquete y la elección de herramienta.
- `combineStartingInventory(classPackage, validatedBackground)`: suma oro de clase y trasfondo, agrupa cantidades por ID canónico y conserva procedencia.

En el resultado de `calculateGuidedFighter` se añade `startingInventory`, con:
- `classGold`, `backgroundGold` y `totalGold`;
- `items[]` con `id`, `name`, `quantity` y `sources[]` (`class`/`background`).

La entrada `backgroundEquipment` es opcional para que las pruebas anteriores y datos del prototipo sigan funcionando. La nueva interfaz siempre la proporciona. En una futura revisión, cuando haya migraciones de datos, podrá pasar a obligatoria.

## Interfaz

En **Origen**: selección de juego de azar del Soldado.

En **Equipo**: selección de paquete de trasfondo A/B, más el paquete de clase ya existente.

En **Hoja en vivo**: dinero total desglosado y objetos iniciales agrupados con procedencia.

## Garantías y limitaciones

- No se mezcla la cantidad de dinero de cada procedencia.
- La misma flecha recibida por dos fuentes se agrupa por identificador, pero ambas fuentes permanecen visibles.
- Un paquete de aventurero es todavía un solo registro; sus objetos internos se desglosarán en una revisión posterior.
- No se permite equipar arbitrariamente artículos del inventario, vender, comprar ni restar dinero.
- No se crean estados de inventario persistentes ni se afectan los PG actuales.
- Las selecciones de dote, maestría, magia y el Guerrero de nivel 1 a 3 permanecen intactas.

## Verificación

1. En la raíz, ejecutar `pnpm test`, `pnpm build` y `pnpm dev`.
2. Confirmar Soldado A + Guerrero A = **18 po**.
3. Cambiar Soldado a B: **54 po**; no aparecen objetos del trasfondo, pero continúa la competencia elegida.
4. Cambiar Guerrero a B, Soldado A: aparecen **40 flechas** (20 + 20).
5. Cambiar Guerrero a C y Soldado a B: **205 po**, sin objetos.
6. Acólito A: 8 po de trasfondo y 10 hojas de pergamino.
7. Criminal A: 2 dagas y 2 bolsas.
8. Erudito A: 8 hojas de pergamino.
9. Cambiar el juego de azar del Soldado y comprobar herramienta y objeto.
10. Comprobar que las pruebas de pasos anteriores continúan funcionando.

## Archivos de la actualización

- `packages/rules-engine/src/background-equipment.ts` (nuevo)
- `packages/rules-engine/src/guided.ts` (actualizado)
- `packages/rules-engine/src/index.ts` (actualizado)
- `packages/rules-engine/tests/background-equipment.test.ts` (nuevo)
- `apps/web/src/app/page.tsx` (actualizado)
- `apps/web/src/app/globals.css` (actualizado)
- `docs/implementation/PASO_11.md` (nuevo)
