# Paso 56 — Mago de Evocación: nivel 12

**Estado:** paquete incremental preparado sobre `main` en el commit `b67eafada86b186da979770a85028f35c0197f7e` (actualización 55.1). La integración y las verificaciones oficiales quedan pendientes de ejecución en el monorepositorio del desarrollador.

## Objetivo y alcance

Se habilita la progresión interactiva de Mago 11→12. El nivel 12 concede dos conjuros ordinarios nuevos y la dote Mejora de característica (+2 en una puntuación o +1 en dos), con la validación existente de límite 20. La progresión 2024 del Mago mantiene 16 preparados reglamentarios y las mismas ranuras de nivel 11: `4/3/3/3/2/1`. No se concede truco nuevo ni conjuro gratuito de Evocación en este nivel.

La tabla de `wizard.ts` ya incluía el nivel 12, así que no se altera. Tampoco se modifica el catálogo de 202 conjuros ni el esquema Prisma o la versión de snapshot (`3`). Las dotes generales alternativas a Mejora de característica continúan pendientes; no se simula su disponibilidad.

## Cambios técnicos

1. `wizard-creation.ts`: admite nivel 12, valida y aplica `level12Improvement` tras las mejoras de niveles 4 y 8, rechaza elecciones anticipadas y añade la nueva clave a la lista blanca del guardado.
2. `wizard-level-up.ts`: incorpora el nivel 12 y exige su mejora; el ascenso sigue siendo atómico y conserva marcas de ranuras y recursos.
3. `level-down.ts`: permite 12→11 y retira solamente la mejora de nivel 12 y los dos conjuros ordinarios del último nivel. Conserva rasgos anteriores, inventario, daños y estado compatible.
4. `WizardLevelUpWizard.tsx`: presenta la mejora y sus opciones en las fases de elección y revisión.
5. `wizard/page.tsx`: habilita la acción de subir nivel desde una ficha de nivel 11.
6. `wizard-level-12-56.test.ts`: incorpora casos de ascenso, validación, persistencia y retroceso. Se actualiza `wizard-levels-10-11-55.test.ts` para que el nivel 11 deje de considerarse el máximo interactivo.

## Verificación requerida

En la raíz del repositorio, después de copiar los archivos del ZIP:

```powershell
pnpm install --frozen-lockfile
pnpm --filter @dnd/rules-engine test
pnpm lint
pnpm build
pnpm dev
```

Comprobaciones manuales:

1. Cargar un Mago de Evocación nivel 11 con PG perdidos, una ranura de nivel 6 gastada y cambios de inventario. Confirmar que aparece **Subir nivel**.
2. Abrir el asistente 11→12. No debe permitir avanzar sin elegir exactamente dos conjuros nuevos y la Mejora de característica válida. No ofrecer conjuros de nivel 7.
3. Probar +2 Sabiduría y +1 Destreza/+1 Constitución en personajes de prueba. Verificar los valores antes/después, el límite de 20 y el ajuste de PG máximos al mejorar Constitución.
4. Comprobar libro de 28 conjuros ordinarios, cinco trucos, 16 preparados reglamentarios y ranuras `4/3/3/3/2/1`. Las marcas gastadas deben conservarse.
5. Guardar, salir y volver a cargar la ficha desde PostgreSQL. Confirmar la conservación de nivel, elección de mejora, libros, inventario, PG y recursos.
6. Bajar 12→11: debe retirar la mejora del 12 y sus dos conjuros, conservar la Evocación gratuita del 11 y mantener los datos compatibles. Guardar y recuperar.
7. Abrir un Guerrero y un Mago de nivel anterior para comprobar regresiones. Guardar capturas y resultados de los comandos para el TFG.

## Riesgos y límites

- El ZIP contiene solo los archivos afectados, no una copia del monorepositorio; no se ha ejecutado en esta entrega el conjunto completo de ESLint, Vitest, Next.js ni PostgreSQL. No se declara superado hasta efectuar esas comprobaciones.
- La biblioteca manual sigue sin imponer cupos, mientras que las decisiones reglamentarias sí están validadas.
- No se automatizan efectos activos de conjuros, decisiones de combate ni gastos involuntarios.

## Próximo paso

**Paso 57: Mago nivel 13.** Incorporar y cotejar los conjuros de nivel 7, la primera ranura de nivel 7, dos conjuros ordinarios, la nueva Evocación gratuita que corresponda, retroceso y pruebas de persistencia. Esta ampliación requiere revisar el catálogo y las fichas antes de habilitar el ascenso.
