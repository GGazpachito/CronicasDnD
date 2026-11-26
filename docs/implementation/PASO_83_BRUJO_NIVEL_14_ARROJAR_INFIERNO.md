# Paso 83 — Brujo Infernal de nivel 14: Arrojar al infierno

## Objetivo y alcance

Extender el Brujo Infernal del nivel 13 al 14 sin alterar la arquitectura transversal de las fichas de Guerrero, Mago y Brujo. Se incorpora un rasgo de subclase activo, cuyos efectos narrativos y sobre enemigos siguen siendo responsabilidad del jugador y del director de juego. La aplicación conserva la decisión de uso, permite registrar su recuperación y ofrece la tirada del daño cuando corresponde.

Referencia normativa: *Player's Handbook 2024*, clase Brujo, subclase Patrón Infernal, rasgo de nivel 14 *Hurl Through Hell* (Arrojar al infierno).

## Reglas incorporadas

- **Desencadenante:** el Brujo impacta a una criatura con una tirada de ataque y decide usar el rasgo.
- **Salvación:** Carisma frente a la CD de salvación de conjuros del Brujo, calculada en el motor.
- **Fallo:** la criatura es enviada a una experiencia de los Planos Inferiores, queda incapacitada y desaparece hasta el final del siguiente turno del Brujo; reaparece en el espacio original o el libre desocupado más próximo.
- **Daño:** 8d10 psíquico a criaturas que no sean infernales; las infernales no reciben ese daño.
- **Usos:** uno hasta finalizar un descanso largo. Se puede restaurar gastando una ranura de Magia de Pacto sin acción adicional. No se recupera mediante descanso corto.

Ningún botón altera fichas de criaturas, aplica condiciones, determina resultados de salvaciones o confirma impactos automáticamente.

## Arquitectura y contratos estables

1. `packages/rules-engine/src/warlock.ts` amplía el nivel a 14, permite `level14HitDieRoll` con rango 1–8 y exige historial validado `level14History` para este nivel. Añade al estado `hurlThroughHellUsed` y funciones de gasto, restauración consumiendo una ranura libre y reseteo tras descanso largo. Se conserva el `schemaVersion: 4`.
2. `packages/rules-engine/src/warlock-level-up.ts` introduce `advanceWarlockToLevelFourteen` y descenso 14→13 con elección anterior recuperada. Conserva el daño acumulado compatible y los gastos de los recursos anteriores. Solo permite sustituir un Arcanum de entre los de nivel 6 y 7, no ambos; también a lo sumo un preparado, un truco y una invocación (manteniendo los prerrequisitos).
3. `packages/rules-engine/src/warlock-traits.ts` incorpora el rasgo al panel común de Rasgos con CD dinámica y descripción transparente de automatización parcial.
4. `apps/web/src/components/WarlockLevelUpWizard.tsx` usa el **mismo** `LevelUpDialogFrame` con tres etapas, `LevelUpHitPointsPicker` (5 o 1d8), buscador compartido y `WizardSpellDetails`. Nivel 14 no añade invocaciones, trucos, preparados, ranuras ni dotes.
5. `apps/web/src/components/WarlockHurlThroughHellPanel.tsx` representa el rasgo como módulo adicional de la subclase en Principal y Rasgos. Invoca **el mismo** `WeaponRollCards.tsx` empleado en ataques y daños para presentar los ocho d10 y el total, con advertencia de aplicación manual. La gestión de las tres ranuras se comparte con `warlockPactSlots` y `toggleWarlockPactSlot`.
6. `apps/web/src/app/warlock/page.tsx` integra el panel sin cambiar `SharedPrincipalSheet`, `SharedSpellsLayout`, `SpellLibraryPanel`, `CharacterTabs`, `LevelDownDialog`, el editor universal de compañeros ni la disposición del resto de clases.

## Parámetros invariantes al nivel 14

| Elemento | Nivel 13 | Nivel 14 |
| --- | --- | --- |
| Competencia | +5 | +5 |
| Trucos de Brujo | 4 | 4 |
| Preparados ordinarios | 12 | 12 |
| Invocaciones sobrenaturales | 8 | 8 |
| Ranuras de Pacto | 3 × nivel 5 | 3 × nivel 5 |
| Arcanum | Nivel 6 y nivel 7, un uso independiente cada uno | Igual; solo puede reemplazarse uno al subir |
| Dado de golpe del nivel | 1d8 o media 5 | 1d8 o media 5 |
| Rasgo de subclase nuevo | — | Arrojar al infierno |

## Compatibilidad, comprobación y decisiones

- El historial guarda valores anteriores, incluido **el Arcanum de nivel 7**, y admite bajar 14→13→12 sin perder elecciones de nivel 13.
- El recurso del nivel 14 es opcional para instantáneas antiguas y se rechaza expresamente en niveles inferiores.
- Tras gastar una ranura para restaurar el rasgo, solo esa ranura queda consumida y el uso vuelve a estar disponible; no se recuperan otros recursos ni se gastan Arcanum.
- Una tirada visual de 8d10 no consume el rasgo: la activación debe confirmarse por separado después del impacto, sin adjudicar resultados en mesa.
- Se añade `packages/rules-engine/tests/warlock-level-14-83.test.ts` para progresión, descanso, coste de ranura, validación, guardado y descenso. Durante el desarrollo también se ejecutó un script de comprobación aislada en el entorno temporal; ese script no se distribuye ni es necesario para ejecutar los tests del monorepositorio.
- La copia de desarrollo parcial disponible en este entorno no contiene la instalación de dependencias ni todo el monorepositorio; la comprobación exhaustiva de Vitest, lint y build se realiza en el repositorio local del usuario.

## Próximo paso

Para el nivel 15, mantener los contratos documentados en `docs/architecture/ARQUITECTURA_PROGRESION_NIVELES.md` y `docs/architecture/ESTRUCTURA_HOJA_COMUN.md`. Antes de agregar nuevas invocaciones, revisar los prerrequisitos y la progresión de hechizos; preservar el catálogo universal.
