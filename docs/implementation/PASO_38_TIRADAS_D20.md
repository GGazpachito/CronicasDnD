# Actualización 38 · Tiradas manuales de habilidades, salvaciones e iniciativa

**Proyecto:** DndEditor / D&D 2024 (5.5)  
**Fecha de preparación:** 12/11/2026  
**Estado:** implementada para validación; pendiente de `pnpm lint`, `pnpm test`, `pnpm build` y navegación real en el equipo del autor, y de commit/push.

## 1. Objetivo y alcance

Convertir los bonificadores mostrados desde la actualización 37 en controles de tirada de d20, activados únicamente por el jugador. Las tiradas están integradas en **Principal**, junto a la iniciativa, cada una de las 18 habilidades y cada una de las 6 salvaciones. La interfaz presenta todos los dados, el dado seleccionado, el modificador usado y el total.

No es un sistema de videojuego: **no** se resuelve éxito/fracaso, no se aplican daños, no se consumen dados de golpe ni recursos, no se cambian los puntos de golpe y no se inicia el combate.

## 2. Decisiones de arquitectura

- **ADR-025: resolución determinista en el motor.** `packages/rules-engine/src/d20.ts` contiene `combineD20Modes`, `resolveD20` y `rollD20`. Los bonificadores y modos se reciben del motor de la ficha; el cálculo del resultado y el modelo de desglose son comprobables sin React.
- **ADR-026: azar explícito, no al renderizar.** `rollD20` solo se llama desde botones del jugador. `secureD20` obtiene enteros uniformes de 1 a 20 con `crypto.getRandomValues` y muestreo por rechazo, sin `Math.random`. La función recibe un generador sustituible en tests.
- **ADR-027: circunstancias temporales, no guardadas.** Un selector común permite añadir ventaja/desventaja a **la siguiente tirada**. El motor combina ese modo con el modo derivado de la hoja: son dos modos idénticos si ambos ayudan/perjudican; si son opuestos, se cancelan. Tras tirar, el selector se restablece. No modifica la ficha ni persiste.
- **ADR-028: modos de salvación derivados.** Antes solo se exponía `savingThrowBonuses`; `CalculatedFighterSheet` incorpora `savingThrowRollModes`. Se calculan con `resolveRollMode('saving_throws.<característica>', ...)`, igual que ya se hacía para habilidades e iniciativa, respetando efectos validados y sus condiciones.
- **ADR-029: resultados efímeros por sección.** `PrincipalOverview` mantiene **solo** los últimos resultados de iniciativa, habilidad y salvación, separados. No duplica estadística ni crea una segunda sesión. Un identificador derivado de los datos calculados evita presentar un resultado anterior como si perteneciera a otra ficha tras cambios. No se almacena historial de tiradas en base de datos.

## 3. Funcionamiento exacto

1. El usuario comprueba el bonificador de la habilidad/salvación/iniciativa en Principal.
2. Si existe una circunstancia puntual (decisión del grupo/DM), elige ventaja o desventaja temporal. «Sin efecto adicional» por defecto.
3. Pulsa el botón «Tirar» de la fila o «Tirar d20» de iniciativa.
4. `rollD20` combina el modo de la hoja con la circunstancia. Lanza un d20 normalmente, o dos si el modo efectivo es ventaja/desventaja.
5. El motor selecciona el mayor con ventaja, el menor con desventaja y el único con modo normal; devuelve el total `d20 seleccionado + modificador`.
6. La hoja muestra el desglose, incluyendo ambos d20 cuando corresponda, y restablece el selector temporal.
7. El DM y los jugadores interpretan el resultado. Un 20 natural no se convierte arbitrariamente en éxito automático en una prueba de habilidad o salvación.

**Ejemplo:** Atletismo +5, ventaja de la ficha y desventaja situacional. Ambas se anulan; se tira 1d20, sale 12, resultado final 17. La hoja y los recursos permanecen intactos.

## 4. Archivos de la actualización (solo los modificados)

| Ruta | Tipo de cambio |
|---|---|
| `packages/rules-engine/src/d20.ts` | Nuevo cálculo y generación uniforme de d20 |
| `packages/rules-engine/src/sheet.ts` | Nueva proyección `savingThrowRollModes` |
| `packages/rules-engine/tests/d20.test.ts` | Pruebas automatizadas de resolución, azar y proyección |
| `apps/web/src/components/PrincipalOverview.tsx` | Botones de tirar, selector situacional y desgloses por sección |
| `apps/web/src/app/globals.css` | Estilos de botones, dados, resultados, accesibilidad y móvil |
| `docs/implementation/PASO_38_TIRADAS_D20.md` | Esta memoria de la entrega |

No se cambian `page.tsx`, configuración, dependencias, API, Prisma, migraciones o esquema de guardado.

## 5. Comprobaciones realizadas durante la preparación

- **Compilación de tipos del motor**, `tsc --noEmit --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom --skipLibCheck packages/rules-engine/src/d20.ts packages/rules-engine/src/sheet.ts`: **superada** con TypeScript 5.8.3 del entorno de preparación.
- **Transpilación sintáctica y chequeo de tipos estricto de TSX** de `PrincipalOverview.tsx` y dependencias: **superados** con TypeScript 5.8.3 usando declaraciones JSX/React provisionales. No equivale a una compilación real con las dependencias originales.
- **Smoke tests Node.js** sobre los módulos del motor compilados: **superados**, incluidas combinaciones de ventaja/desventaja, validaciones, 400 muestras válidas del generador seguro y efectos sobre modos de salvación.
- **Archivo Vitest**: escrito pero **no ejecutado** en este entorno, que no dispone de las dependencias del repositorio ni su cliente Prisma generado. No afirmar cobertura ni éxito de Vitest sin su log local.
- **ESLint y compilación Next.js completa**: **pendientes** de comprobar con las versiones locales del usuario.

## 6. Instalación y pruebas de aceptación locales

Descomprimir el ZIP en la **raíz del proyecto**, fusionando `apps`, `packages` y `docs`. Reemplazar solo las rutas incluidas en el ZIP. No borrar las carpetas del proyecto.

```powershell
pnpm lint
pnpm test
pnpm build
pnpm dev
```

**Pruebas manuales en `http://localhost:3000`:**

1. En Principal, elegir «Sin efecto adicional» y pulsar Tirar en Atletismo. Debe aparecer un único d20, bono de Atletismo y total correcto.
2. Elegir ventaja temporal y lanzar Persuasión: se muestran dos dados y se utiliza el mayor. El selector vuelve a «sin efecto».
3. Elegir desventaja temporal y lanzar otra habilidad: se muestra el menor de dos d20.
4. Para Guerrero Campeón nivel 3+, la iniciativa y Atletismo ya tienen ventaja por rasgo. Probar una tirada sin circunstancia y otra con desventaja temporal: la segunda se resuelve con un único d20.
5. Equipar armadura con desventaja en Sigilo y comprobar un d20 en Sigilo con penalización. Añadir ventaja temporal y comprobar que se cancela.
6. Tirar una salvación de Fuerza y una de Sabiduría; comprobar que cada una usa su bonificador real, con o sin competencia según la ficha.
7. Tirar sucesivamente una habilidad, una salvación e iniciativa; verificar que el último resultado de cada módulo es visible y que ninguno altera PG o recursos.
8. Cambiar la puntuación de una característica desde el editor: el resultado histórico asociado a la proyección anterior deja de mostrarse. Las nuevas tiradas usan el bono nuevo.
9. Revisar botones y selectores con teclado, lector de pantalla si está disponible, y vista móvil a 390 px.
10. Verificar que el editor antiguo, la carga/guardado y el panel de ataques existentes siguen accesibles.

**Límites conocidos:** no se automatizan todavía efectos situacionales no representados en la ficha ni la gestión de Afortunado, inspiración u otros rerolls especiales; en esta entrega el usuario decide circunstancia adicional. Tampoco se registra historial permanente, ni se tiran daño, dados de golpe o conjuros desde esta nueva interfaz (los módulos correspondientes conservan su estado anterior).

## 7. Subida selectiva a GitHub

Ejecutar las comprobaciones de arriba y después **añadir únicamente los seis archivos de la entrega**:

```powershell
git add -- "apps/web/src/components/PrincipalOverview.tsx" "apps/web/src/app/globals.css" "packages/rules-engine/src/d20.ts" "packages/rules-engine/src/sheet.ts" "packages/rules-engine/tests/d20.test.ts" "docs/implementation/PASO_38_TIRADAS_D20.md"
git diff --cached --name-only
git diff --cached --check
git commit -m "feat: actualizacion 38 - tiradas manuales de habilidades salvaciones e iniciativa"
git push -u origin HEAD
git status
```

**Evidencia por recoger para el TFG:** rama, SHA, fecha, logs de lint/test/build, capturas en escritorio/móvil, prueba de ventaja/desventaja y checklist manual firmado. No registrar el estado como «validado» antes de obtenerla.
