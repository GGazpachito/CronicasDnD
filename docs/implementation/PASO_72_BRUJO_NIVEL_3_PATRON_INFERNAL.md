# Paso 72 · Brujo nivel 3 y Patrón Infernal

Fecha: 19 de noviembre de 2026. Entrega incremental posterior al paso 71 (Bestiario y familiares).

## Alcance y decisiones técnicas

- **Motor de Brujo 3:** `GuidedWarlockInput` acepta nivel 3, selección obligatoria del Patrón Infernal, dado de golpe `level3HitDieRoll` (5 de media o tirada 1d8), cuatro preparados ordinarios y conservación de tres invocaciones y dos trucos. Las dos ranuras de Magia de Pacto pasan a **nivel de conjuro 2**, sin incrementar su número. El esquema de guardado permanece en `schemaVersion: 4`.
- **Subida y bajada:** el mismo `WarlockLevelUpWizard` y `LevelUpDialogFrame` de tres pasos admite 1→2 y 2→3. Conserva buscador, `WizardSpellDetails` y `LevelUpHitPointsPicker`. La bajada 3→2 sigue utilizando `LevelDownDialog` y restaura elecciones previas mediante `level3History`, incluidas invocaciones, trucos, preparados, dotes y pactos. El descenso histórico 2→1 continúa con su política documentada.
- **Magia compartida:** doce conjuros ordinarios adicionales de nivel 2 en la lista de Brujo (`WARLOCK_LEVEL_TWO_SPELLS`) y cuatro conjuros siempre preparados del Patrón Infernal (`WARLOCK_FIEND_LEVEL_THREE_IDS`): Manos ardientes, Orden imperiosa, Rayo abrasador y Sugestión. Solo `enthrall` y `command` precisaron nuevas fichas; el resto enlaza a fichas de Mago. La biblioteca común incluye el filtro `Patrón Infernal` y sigue mostrando todos los conjuros de ambas clases.
- **Bendición del Oscuro:** muestra los PG temporales calculados como `max(1, modificador de CAR + nivel de Brujo)` y proporciona botón manual en Principal/Rasgos. El usuario confirma la condición de activación. Los PG temporales no se suman a los existentes: se mantiene el valor mayor. No se automatizan bajas de enemigos ni combate.
- **Arquitectura conservada:** las siete pestañas, Principal, controles de PG e inspiración, conjuros, filtros, compañeros y Bestiario **no se sustituyen ni remaquetan**. La extensión del patrón permanece en el área específica de Brujo.

## Verificaciones manuales (tras instalar el ZIP)

Ejecutar por separado desde la raíz del repositorio:

```
pnpm --filter @dnd/rules-engine test
pnpm --filter @dnd/web lint
pnpm build
```

1. Crear o cargar un **Brujo nivel 2** con elecciones válidas. Pulsar «Subir nivel» desde la cabecera: se abre el **mismo diálogo de tres etapas** que antes; comprobar botones, buscador, fichas con detalle, promedio/1d8 y confirmación diferida.
2. En Novedades, comprobar el Patrón Infernal, dos ranuras de nivel 2, cuatro preparados normales y cuatro conjuros adicionales del patrón. En Elecciones, marcar al menos un conjuro normal de nivel 2 (por ejemplo, Paso brumoso); probar sustituir un truco, una invocación y un preparado, con límites de sustitución.
3. Confirmar la subida: **nivel 3**, tres invocaciones, dos trucos, cuatro preparados ordinarios; en Principal aparecen las dos ranuras de **nivel 2**. Gastar ambas, probar Astucia mágica, descanso corto y largo, y guardar.
4. En Rasgos, localizar Patrón Infernal y **Bendición del Oscuro**. Simular la condición manualmente pulsando el botón: comprobar que se aplican `CAR mod. + 3` PG temporales (mínimo 1); repetir con PG temporales superiores y confirmar que **no se acumulan**. El rasgo aparece también en el listado común `TraitsPanel`.
5. En Hechizos, comprobar **Manos ardientes, Orden imperiosa, Rayo abrasador y Sugestión** en los disponibles, además de los cuatro preparados normales. En «Todos los conjuros», probar filtros Mago, Brujo y Patrón Infernal y buscar `enthrall` / `command` o sus nombres españoles. Las fichas compartidas de Mago siguen disponibles.
6. Comprobar que Principal, Rasgos, Hechizos, Equipo, Personaje, Compañeros y Combate **mantienen disposición y controles** de nivel 2 y que el Bestiario/familiar de Pacto de la Cadena no se ha alterado.
7. Guardar el Brujo 3 y cargarlo: se conservan nivel, ranuras gastadas, elecciones, familiar y PG temporales. Probar un **guardado antiguo de Brujo nivel 1 o 2**.
8. Pulsar «Bajar nivel»: comprobar vista previa de pérdidas y casilla de confirmación; cancelar sin cambios y repetir confirmando. Deben volver los tres conjuros ordinarios anteriores, las invocaciones/selecciones de nivel 2, dos ranuras de nivel 1 y PG reajustados; los compañeros manuales no desaparecen.
9. Revisar las mismas ventanas del Guerrero/Mago y las siete pestañas: ninguna modificación del Brujo debería alterar su estructura ni su comportamiento.

## Validación automatizada y entorno de entrega

`packages/rules-engine/tests/warlock-level-3-72.test.ts` cubre cálculo de PG, límites de sustitución, ranuras, Astucia, descansos, conjuros compartidos, beneficios del patrón, snapshots y restauración al bajar de nivel. Se actualiza también el contrato de catálogo del paso 68 para reconocer la ampliación de listas. La prueba de humo con Node 24 verifica el motor. El entorno de preparación no incluye las dependencias completas de Next/Vitest; las pruebas pnpm, lint y build deben ejecutarse localmente antes de publicar.

## Próximo paso propuesto

**Brujo nivel 4:** mejora de característica/dote, incremento reglamentario de trucos y conjuros preparados; volver a utilizar el asistente, la hoja y la biblioteca común, conservando la progresión y la bajada reversible.
