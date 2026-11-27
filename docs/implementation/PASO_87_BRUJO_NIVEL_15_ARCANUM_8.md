# Paso 87 — Brujo Infernal nivel 15: Arcanum 8 y novena invocación

## Objetivo

Avanzar CrónicasDnD hasta Brujo Infernal nivel 15 manteniendo el programa base **exclusivamente dentro del SRD 5.2.1** y el modelo de módulos futuros aún no implementado. No se importan libros comerciales ni se altera la interfaz común de Guerrero o Mago.

## Fuente contrastada y alcance

Documento normativo: [SRD 5.2.1 inglés](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf), tabla *Warlock Features*, invocación *Witch Sight*, lista *Level 8 Warlock Spells* y descripción de *Glibness*.

| Parámetro | Nivel 14 | Nivel 15 |
| --- | --- | --- |
| Competencia | +5 | +5 |
| Invocaciones | 8 | 9; incluye acceso a Vista de bruja |
| Trucos | 4 | 4 |
| Conjuros preparados ordinarios | 12 | 13 |
| Ranuras de Pacto | 3 de nivel 5 | 3 de nivel 5 |
| Arcanum místicos | Nivel 6 y 7 | Nivel 6, 7 y 8, todos con uso independiente |
| PG por este nivel | — | 1d8 o media 5 + Constitución, mínimo 1 |
| Subclase | Arrojar al infierno | Se conserva; no hay nuevo rasgo |

Los cinco conjuros disponibles para el Arcanum de nivel 8 son **Confusión mental** (*Befuddlement*), **Semiplano** (*Demiplane*), **Dominar monstruo** (*Dominate Monster*), **Elocuencia** (*Glibness*) y **Palabra de poder: aturdir** (*Power Word Stun*). Cuatro reutilizan las fichas compartidas del Mago y Elocuencia aporta una ficha propia con resumen original. Se preservan las escuelas y los componentes del SRD.

Vista de bruja (*Witch Sight*) es una invocación disponible desde nivel 15 que concede visión verdadera a 30 pies. Se describe en la hoja de rasgos; las decisiones activas del director y la aplicación de ilusiones no se automatizan.

## Cambios de arquitectura

1. **Catálogo de conjuros** (`warlock-spells.ts` y `shared-spell-catalog.ts`): identificadores únicos de los cinco Arcanum de nivel 8; el catálogo común evita duplicar fichas de Mago. Se mantiene el control de que los conjuros de nivel 8 no puedan prepararse como conjuros ordinarios de Magia de Pacto.
2. **Reglas y persistencia** (`warlock.ts`): nivel máximo 15, validación de la novena invocación, trece preparados, nuevo historial de nivel 14, dado de golpe y uso `mysticArcanum8Used`, separado de los otros dos. Descanso corto no lo restablece; descanso largo sí. El guardado conserva `schemaVersion: 4` para instantáneas anteriores.
3. **Progresión reversible** (`warlock-level-up.ts`): subida 14→15 y vista previa de bajada 15→14. Hasta una invocación anterior, un truco y un preparado pueden sustituirse, además del nuevo preparado y la nueva invocación. Un único Arcanum anterior (nivel 6 o 7) puede reemplazarse por otro del mismo nivel durante esa subida. El Arcanum de nivel 8 es una elección adicional, no un reemplazo. Se conservan el daño acumulado, ranuras gastadas, Arrojar al infierno y gastos de los Arcanum 6/7.
4. **Interfaz** (`WarlockLevelUpWizard.tsx`, `warlock/page.tsx`, `warlock-traits.ts`): asistente común en tres pasos, selector y fichas de Arcanum 8, invocación Vista de bruja, nueva lista de recursos con botón de consumo independiente y controles de guardado y descenso existentes.

## Pruebas y verificación

`packages/rules-engine/tests/warlock-level-15-87.test.ts` prueba el catálogo SRD, la progresión, las restricciones de cambios, la persistencia, los tres recursos mágicos separados, los descansos, la salud y la reversibilidad de 15→14. La regresión de niveles anteriores se ejecutó con el comprobador aislado del entorno temporal: **1095 pruebas correctas en 95 archivos**. Esta comprobación no sustituye el `pnpm test` / `pnpm build` / `pnpm lint` del monorepositorio completo del usuario.

## Siguiente paso

Implementar **Brujo nivel 16**: dote Mejora de característica compatible con las tres anteriores, hasta 9 invocaciones, 13 preparados, 3 Arcanum separados y bajada reversible 16→15. Permanecer dentro del catálogo SRD y dejar para módulos futuros el contenido que requiera derechos adicionales.
