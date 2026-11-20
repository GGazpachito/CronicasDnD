# Paso 77 — Brujo nivel 8: segunda Mejora de característica y noveno conjuro

## Objetivo y alcance

Completar **Brujo Infernal 7→8** (D&D 2024), respetando los contratos de las siete pestañas, la biblioteca universal de hechizos y el asistente compartido de subida/bajada. Se entrega **solo nivel 8**: nivel 9 exige invocaciones adicionales y nuevos conjuros de nivel 5, que justifican una entrega separada con sus pruebas específicas.

## Reglas integradas

| Concepto | Nivel 7 | Nivel 8 | Automatización |
| --- | --- | --- | --- |
| Dote de nivel | — | Mejora de característica: +2 o +1/+1, máximo 20 | `applyFighterAbilityImprovement` después de nivel 4; actualiza todos los derivados |
| Conjuros ordinarios preparados | 8 | **9** | Elección en ventana común; conserva 7/8 como mínimo |
| Conjuros Infernal siempre preparados | 8 | 8 | No consumen huecos de preparación |
| Invocaciones sobrenaturales | 6 | 6 | Sustitución opcional de una, con prerrequisitos de Pacto |
| Trucos de Brujo | 3 | 3 | Sustitución opcional de uno |
| Ranuras de Magia de Pacto | 2 de nivel 4 | 2 de nivel 4 | Conservan gasto y recarga mediante descansos |
| Competencia | +3 | +3 | Sin cambios |
| PG | siete dados de golpe acumulados | +1d8 (media 5 o tirada), Constitución y bonificaciones por nivel | Conservar daño acumulado compatible |

La bonificación por aumentar Constitución afecta de forma retroactiva el máximo de PG de **los ocho niveles**. La modificación de Carisma también actualiza ataque mágico, CD y máximo de usos de Suerte del Oscuro. Los usos ya consumidos no se reinician al subir de nivel.

## Contratos de arquitectura sin modificaciones

- **Hoja principal, Rasgos, Hechizos, Compañeros y demás pestañas:** no se crean módulos alternativos ni CSS por clase. `collectWarlockTraits` publica la dote nivel 8 en el módulo común de Rasgos con ID independiente de la dote nivel 4.
- **Subida:** `WarlockLevelUpWizard` continúa usando `LevelUpDialogFrame`, tres pasos exactos, `LevelUpHitPointsPicker` d8 y `wizard-spell-choice-list` + `WizardSpellDetails` con búsqueda de hechizos. La dote comparte exactamente los mismos controles ya usados en nivel 4.
- **Bajada:** `previewWarlockLevelDown` devuelve `LevelDownSummary` para el `LevelDownDialog` universal. Retroceder 8→7 restaura el octavo preparado y las elecciones previas de invocaciones, trucos, pactos y familiares.
- **Conjuros:** se consulta `WARLOCK_SPELLS_THROUGH_LEVEL_FOUR`, que ya comparte definiciones con el catálogo del Mago y con `SHARED_SPELL_RULES`. **No se crea ninguna definición repetida.**
- **Persistencia:** `schemaVersion: 4` se mantiene. Solo hay nuevos campos opcionales: `level8HitDieRoll`, `level8Improvement`, `level8History`; los guardados previos continúan siendo válidos.

## Cambios de código

1. `packages/rules-engine/src/warlock.ts`: admite nivel 8, segundo aumento de características, noveno preparado, octavo dado y validación recursiva del historial; conserva recursos pasivos del nivel 7.
2. `packages/rules-engine/src/warlock-level-up.ts`: `advanceWarlockToLevelEight` valida sustituciones, pactos, PG y crea historial; `previewWarlockLevelDown` restaura 8→7.
3. `packages/rules-engine/src/warlock-traits.ts`: actualiza textos de Magia de Pacto/Patrón Infernal y añade la segunda dote al registro común de Rasgos.
4. `apps/web/src/components/WarlockLevelUpWizard.tsx`: etapa 0 describe los cambios; etapa 1 usa los controles compartidos; etapa 2 revisa las estadísticas; no cambia el marco modal.
5. `apps/web/src/app/warlock/page.tsx`: botón de subir habilitado desde nivel 7, contador 9 y nueva pista sobre futuro nivel 9.
6. `packages/rules-engine/tests/warlock-level-8-77.test.ts`: cálculo, límites, retroceso, instantáneas y recursos.
7. Documentación actualizada: `docs/architecture/ESTRUCTURA_HOJA_COMUN.md` y `docs/architecture/ARQUITECTURA_PROGRESION_NIVELES.md`.

## Verificación del usuario

1. Copia los archivos del ZIP sobre las rutas iguales de tu repositorio. Si el archivo no existía (test y este documento), créalo en la carpeta indicada.
2. Ejecuta en la raíz del proyecto, de uno en uno: `pnpm --filter @dnd/rules-engine test`, `pnpm --filter @dnd/web lint` y `pnpm build`.
3. Abre un Brujo Infernal nivel 7 y pulsa **Subir de nivel**. Verifica las **mismas tres pantallas y los mismos botones** del Mago; elige +1 Carisma/+1 Constitución, 1d8 o promedio, y un noveno preparado.
4. En nivel 8, comprueba que aparecen **nueve preparados**, seis invocaciones, tres trucos, ocho conjuros del patrón y dos ranuras de nivel 4. En Rasgos deben verse dos Mejoras de característica (niveles 4 y 8), sin duplicar IDs ni módulos.
5. Sube Constitución a un número par y comprueba que **todos los PG anteriores** se recalculan, no solo los ganados en nivel 8. Comprueba que un Carisma final superior a 20 se rechaza y la ventana avisa.
6. Verifica que puedes buscar conjuros, abrir sus fichas y consultar el catálogo universal desde la pestaña Hechizos sin perder los filtros comunes.
7. Con al menos una ranura gastada y algunos PG perdidos, **guarda** el personaje, **cárgalo**, **baja 8→7** y verifica que los conjuros, invocaciones y trucos antiguos se restauran. La mejora de nivel 8 desaparece, pero la de nivel 4 sigue activa. El daño acumulado y el gasto de ranuras permanecen; después baja 7→6.
8. Repite una comprobación visual de hoja, inspiración, PG, Hechizos y Compañeros con Guerrero y Mago para descartar cambios de arquitectura accidental.

## Pruebas ejecutadas al preparar el ZIP

Se ejecutaron **ocho comprobadores de humo** de Brujo (niveles 1–8), con resultado correcto, incluyendo el comprobador específico 77 para PG, rasgos, guardado, carga y descenso. La copia parcial de trabajo no contiene `package.json`, instalación de dependencias, ni el proyecto Next.js completo: **no se ejecutaron** la suite Vitest, ESLint ni el `build` de producción en este entorno. Estos tres comandos son comprobaciones obligatorias antes de subir a GitHub.

### Incidencia posterior — parche 77.1 (compilación TypeScript)

En el `pnpm build` de Windows se detectó **TS7053** en `warlock-level-up.ts` (línea 329), durante el chequeo de prerrequisitos de invocaciones de nivel 8. `Array.isArray(selectedInvocations)` había estrechado la variable tipada `readonly WarlockInvocationId[]` a un array de elementos `any` para las expresiones posteriores; por ello TypeScript rechazaba indexar `WARLOCK_INVOCATION_PREREQUISITES[id]`. Se aplica la validación del array directamente a `choices.invocations`, se crea la constante tipada **después** de validar y se tipa expresamente el argumento de `some` como `WarlockInvocationId`. **No cambian las reglas ni el formato de guardado**. La prueba de humo de nivel 8 volvió a pasar. El `build` completo debe repetirlo el usuario, pues la copia parcial no tiene dependencias ni configuración del monorepo.

## Próximo paso — Brujo nivel 9

Abordar el salto a magia de Pacto de **nivel de conjuro 5**, nuevas elecciones de invocaciones y el aumento correspondiente de preparados. Auditar el catálogo de nivel 5 frente a Mago, reutilizar las definiciones coincidentes, incorporar solo las exclusivas del Brujo y documentar el descenso 9→8 con el mismo contrato de UI.

## Nota TFG

Este incremento muestra **extensibilidad sin duplicación de interfaz ni conjuros**: el adaptador de clase conserva el esquema de estado y las restricciones de progresión, mientras las vistas reutilizan los componentes comunes. La auditoría de retroceso recupera elecciones históricas, evitando pérdidas de información al descender; la persistencia mantiene compatibilidad con versiones previas del esquema 4.
