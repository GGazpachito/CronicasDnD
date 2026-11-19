# Paso 67 — Arquitectura común de hoja y generación de características

Fecha: 19 de noviembre de 2026. Base de integración: actualización 66, Brujo nivel 1 y Compañeros. Edición de reglas: D&D 2024.

## Petición y problema identificado

Las pestañas **Principal**, **Rasgos** y **Hechizos** deben conservar estructura, orden visual y funcionamiento común para todas las clases; se admiten únicamente complementos específicos claramente delimitados. Se pide también seleccionar el método de generación de características al crear un personaje: matriz estándar, compra de puntos y una variante de tirada d20.

Antes del cambio, Principal ya estaba construido con `SharedPrincipalSheet` para Guerrero, Mago y Brujo (el Guerrero lo invoca mediante `PrincipalOverview`). Rasgos utilizaba `TraitsPanel` en Guerrero y Mago, pero una página independiente en Brujo. Hechizos presentaba tres interfaces diferentes: proyección de origen (`SpellsPanel`), biblioteca del Mago (`WizardSpellLibrary`/`SpellLibraryPanel`) y sección manual del Brujo. La duplicación complicaba el mantenimiento y provocaba desigualdad de experiencia.

## Decisiones arquitectónicas

1. **Principal:** mantener `SharedPrincipalSheet` como contrato transversal. Los módulos de ataques, recursos, ranuras y capacidades particulares se siguen pasando por las ranuras (`props`) del componente, sin alterar su esqueleto.
2. **Rasgos:** mantener `TraitsPanel` como única interfaz de búsqueda, categorías, tarjetas desplegables y leyenda de automatización. `collectCharacterTraits` (Guerrero), `collectWizardTraits` (Mago) y la nueva `collectWarlockTraits` (Brujo) producen `TraitCollection`. Las elecciones activas de pacto, armadura y Tomo permanecen en un bloque adicional de Brujo. La subclase infernal **no** concede características antes del nivel 3.
3. **Hechizos:** `SharedSpellsLayout` es la envoltura idéntica y `SpellLibraryPanel` implementa la biblioteca común: resumen, catálogo, filtros por nivel/lista, pestañas, búsqueda y fichas con tiradas. Los adaptadores preparan datos sin duplicar interfaz: `WizardSpellLibrary` con biblioteca manual, `FighterSpellLibrary` con concesiones de origen y Brujo con su catálogo de nivel 1 reutilizando `warlockSpellRule`. La edición de conocimientos del Mago se conserva; los conjuros del Guerrero y Brujo quedan en consulta porque sus elecciones se gestionan mediante creación/progresión. **La reutilización de interfaz no implica inventar ranuras ni permitir aprender conjuros fuera de reglas de clase.**
4. **Especialización de clase:** las ranuras del Mago, su recuperación arcana, Maestría, Sobrecarga y firmas siguen en el bloque específico de Mago; la ranura de Pacto y sus descansos siguen en el del Brujo. Guerrero no obtiene ranuras de clase; cada concesión de origen mantiene su propia característica y reglas de uso gratuito en una lista accesible bajo la biblioteca.
5. **Datos del Brujo:** si un hechizo existe en las reglas del Mago se conserva la misma instancia mediante `warlockSpellRule`. Solo existen definiciones independientes para los no compartidos. Los rituales del Pacto del Tomo únicamente aparecen cuando el libro se declara presente; no consumen las preparaciones normales del Brujo.

## Generación de puntuaciones de característica

Motor puro compartido: `packages/rules-engine/src/ability-generation.ts`.

| Método | Restricción antes de trasfondo | Fuente |
| --- | --- | --- |
| `standard_array` | Una asignación de 15, 14, 13, 12, 10 y 8, sin repetición | Reglas básicas D&D 2024 |
| `point_buy` | 27 puntos, valor mínimo 8 y máximo 15; costes 8→0, 9→1, 10→2, 11→3, 12→4, 13→5, 14→7, 15→9 | Reglas básicas D&D 2024 |
| `d20` | Un d20 por característica, números de 1 a 20; se puede repetir una tirada o las seis | **Regla personalizada del proyecto**, no oficial |

La generación oficial aleatoria de D&D 2024 emplea **4d6, descartando el dado menor**; el usuario ha solicitado expresamente un d20, por lo que la interfaz lo etiqueta como personalizado. Fuente: [D&D Beyond — Creating a Character, Basic Rules 2024](https://www.dndbeyond.com/sources/dnd/br-2024/creating-a-character).

`AbilityScoreMethodPicker` presenta la misma elección y distribución en las tres clases. El motor valida siempre los seis valores, incluso si se manipulan desde un guardado. Las bonificaciones posteriores del trasfondo se mantienen independientes y la puntuación final no puede superar 20: si una tirada d20 produce un 19/20 al que se sumaría una mejora incompatible, se avisa de la invalidez y se permite repetir la tirada afectada.

`abilityGenerationMethod` es **opcional** en los tres tipos de entrada para conservar guardados antiguos. Si falta, se interpreta `standard_array`. Los validadores estrictos de instantáneas del Mago y Brujo aceptan el nuevo campo. No hay cambios de esquema de base de datos, porque ya se serializa la entrada completa en JSON. El Guerrero conserva además su esquema de aventura.

## Verificación y alcance

- Comprobación de motor local Node 24: pasos 66 y 67 completados (simulaciones de puntos, d20 inyectado para pruebas, cálculos, snapshots de Mago y Brujo).
- Test automatizado añadido: `packages/rules-engine/tests/ability-generation-67.test.ts` con validación, compra, aleatoriedad determinista, persistencia y proyección de rasgos.
- **Pendiente en entorno del usuario**: suite real `pnpm --filter @dnd/rules-engine test`, compilación `pnpm --filter @dnd/web build` (o equivalente según `package.json`) y revisión en navegador de las tres clases. Esta sesión dispone de una copia de archivos de trabajo, no de todas las dependencias instaladas para hacer la compilación monorepo.
- En Guerrero, si varias fuentes conceden el mismo conjuro con estadísticas distintas, la ficha común muestra una referencia general y el desglose de cada fuente se conserva en «Fuentes y estadísticas específicas de origen». Las fichas que no existían en el catálogo anterior indican explícitamente que sus efectos se consulten en el manual.

## Cómo retomar el desarrollo / TFG

La siguiente tarea prevista es **Brujo nivel 2**, con Astucia mágica, nuevas invocaciones, sustitución guiada al subir de nivel y conservación íntegra de la arquitectura compartida. Continuar con la subclase **Patrón Infernal desde nivel 3**. Al añadir una clase, implementar el adaptador de `TraitCollection`, proporcionar sus reglas y selección al mismo `SpellLibraryPanel` y conectar los módulos exclusivos a la hoja compartida; no crear nuevas pestañas paralelas.

Para el TFG, registrar esta actualización como refactorización de presentación mediante componentes compartidos y separación de responsabilidades: proyecciones puras (motor), estado/persistencia (aplicación) y componentes de visualización genéricos. El punto de extensión de hechizos permite nuevas clases sin duplicar buscador, filtros ni fichas.

## Archivos de esta actualización

- Nuevos: `packages/rules-engine/src/ability-generation.ts`, `packages/rules-engine/src/warlock-traits.ts`, `packages/rules-engine/tests/ability-generation-67.test.ts`, `apps/web/src/components/AbilityScoreMethodPicker.tsx`, `apps/web/src/components/SharedSpellsLayout.tsx`, `apps/web/src/components/FighterSpellLibrary.tsx`.
- Modificados: `packages/rules-engine/src/guided.ts`, `packages/rules-engine/src/wizard-creation.ts`, `packages/rules-engine/src/warlock.ts`, `apps/web/src/app/fighter/page.tsx`, `apps/web/src/app/wizard/page.tsx`, `apps/web/src/app/warlock/page.tsx`, `apps/web/src/components/SpellLibraryPanel.tsx`, `apps/web/src/app/globals.css`.
- Este documento. **No** se cambia `SpellsPanel.tsx` ni se duplican reglas mágicas del Mago.
