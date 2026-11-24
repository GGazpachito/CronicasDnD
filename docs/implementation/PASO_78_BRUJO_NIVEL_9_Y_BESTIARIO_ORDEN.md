# Paso 78 — Brujo nivel 9 y ordenación estable del Bestiario

## Objetivo

Completar Brujo Infernal **8→9** con D&D 2024 y ordenar el Bestiario por **valor de desafío numérico ascendente y luego nombre alfabético español**, sin modificar las siete pestañas comunes ni duplicar fichas de hechizos o criaturas. Se implementa un solo nivel porque la magia de quinto círculo, las invocaciones y el recurso de Contactar con el patrón añaden suficiente complejidad para una entrega propia.

## Alcance funcional

| Elemento | Antes: nivel 8 | Después: nivel 9 | Control |
| --- | --- | --- | --- |
| Competencia | +3 | **+4** | Derivados automáticos: habilidades, salvaciones, ataque mágico y CD |
| Invocaciones | 6 | **7** | Mantener al menos cinco anteriores; una nueva y como máximo una sustitución |
| Invocaciones nuevas | — | Don de los protectores, Bebedor de vida y Visiones de reinos distantes | Requisitos de Tomo/Hoja validados en motor |
| Trucos | 3 | 3 | Conservar dos, hasta una sustitución |
| Preparados ordinarios | 9 | **10** | Conservar ocho de nueve; biblioteca de conjuros nivel 1–5 |
| Preparados del Patrón Infernal | 8 | 8 | No ocupan las diez elecciones ordinarias |
| Contactar con el patrón | — | Contactar con otro plano preparado automáticamente | 1 uso gratis por descanso largo y éxito automático en su salvación de Inteligencia |
| Magia de Pacto | 2 ranuras nivel 4 | **2 ranuras nivel 5** | Marcar gasto manual; descanso corto/largo recupera ranuras |
| PG | 8d8 acumulados | 9d8 acumulados | Media +5 o 1d8, con Constitución y rasgos existentes |

Las invocaciones se presentan en Rasgos; **Bebedor de vida** dispone de tirada adicional **1d6** desde el arma del pacto *equipada*, con tarjetas `WeaponRollCards`. Daño necrótico/psíquico/radiante y uso máximo una vez por turno quedan en manos del jugador. Don de los protectores usa el Libro de las Sombras y se resuelve manualmente; Visiones de reinos distantes permite Ojo arcano sin ranuras. Contactar con el patrón se muestra en los módulos específicos de Recursos, Rasgos y Hechizos con el mismo contador persistido. No se automatizan preguntas, decisiones de daño ni las acciones narrativas.

## Conjuros y fuente de verdad

Los nueve conjuros del Brujo de quinto nivel son `contact_other_plane`, `dream`, `hold_monster`, `jallarzis_storm_of_radiance`, `mislead`, `planar_binding`, `scrying`, `synaptic_static` y `teleportation_circle`. **Ya disponían de definición en el catálogo de Mago**: `WARLOCK_LEVEL_FIVE_SPELLS` resuelve sus IDs a las mismas instancias, sin copiar textos ni añadir fichas innecesarias. La biblioteca compartida `SHARED_SPELL_RULES` conserva catálogo universal, búsqueda y filtros por clase. Contactar con otro plano **no consume una preparación ordinaria** porque se concede de manera permanente por el rasgo de nivel 9; sí puede lanzarse con ranura usando las reglas de magia ordinarias cuando el jugador elija hacerlo.

## Arquitectura y persistencia

- `warlock.ts`: nivel 9, bonificación +4, décimo preparado, séptima invocación, dado de PG, usos de `contactPatronUsed`, descanso largo y validación de snapshots de esquema 4.
- `warlock-level-up.ts`: subida 8→9, historial `level9History` y descenso 9→8 con `LevelDownSummary` del diálogo universal. Preservar elecciones, daño, gastos, perfil, equipo y compañeros anteriores.
- `WarlockLevelUpWizard.tsx`: el mismo `LevelUpDialogFrame` con etapas **Novedades → Elecciones → Confirmación**, selector común de dado de golpe, buscador y tarjetas `WizardSpellDetails`.
- `WarlockAttacks.tsx` y `warlock/page.tsx`: módulos de clase en los huecos previstos de `SharedPrincipalSheet`, `TraitsPanel` y `SharedSpellsLayout`. No se crean páginas o estilos divergentes.
- `bestiary.ts`: parser de VD fraccional `challengeRatingValue`, comparador `compareBestiaryEntries`, ordenación de `BESTIARY_ENTRIES` al construir el catálogo. `BestiaryBrowser.tsx` consume esta lista ya ordenada y presenta una leyenda informativa.
- La ficha del familiar y los guardados de personajes conservan sus IDs; la nueva ordenación **no cambia selección ni estadísticas**.

## Verificaciones ejecutadas en la copia de trabajo

- `node --import ./_patch74_ts_resolve_hook.mjs ./_warlock78_smoke.mjs`: **correcto**; nivel 9, conjuros compartidos, orden del Bestiario, activación del rasgo, descanso, guardado y descenso 9→8→7.
- Comprobadores anteriores de Brujo 1–8: **correctos**; no se detectan regresiones en el motor con el conjunto de pruebas rápidas disponible.
- Se incluyen pruebas Vitest nuevas `warlock-level-9-78.test.ts` y `bestiary-order-78.test.ts`. La copia parcial no contiene `package.json`, `node_modules` ni configuración completa de Next.js: **no se han ejecutado aquí** `pnpm test`, `pnpm lint` ni `pnpm build`. Deben ejecutarse en el repositorio local completo antes de GitHub.

## Pruebas manuales de aceptación

1. Copiar el ZIP conservando la estructura de carpetas y ejecutar por separado: `pnpm --filter @dnd/rules-engine test`, `pnpm --filter @dnd/web lint`, `pnpm build`.
2. Crear o cargar Brujo Infernal nivel 8 y subir al 9: comprobar las **mismas tres etapas y botones del Mago**, elección de media/tirada 1d8, séptima invocación y décimo preparado.
3. Verificar nueva competencia +4, dos ranuras de nivel 5, ocho gratuitos del patrón más **Contactar con otro plano** gratuito y guardado independiente de los diez preparados.
4. Gastar el uso gratuito de Contactar con el patrón: el botón debe quedar inactivo, el descanso corto no lo restablece y el largo sí.
5. Con Pacto de la Hoja y **Bebedor de vida**, equipar el arma de pacto y tirar 1d6: visualizar tarjeta de dados con total y advertencia manual. Desequipar el arma: el botón ya no debe aparecer.
6. Guardar personaje con daño y ranuras gastadas, cargarlo, descender 9→8 y continuar 8→7: recuperar las elecciones previas y mantener daño y recursos compatibles.
7. Abrir Bestiario sin filtro: desafíos 0, 1/8, 1/4, 1, etc. Por cada desafío, nombres A–Z. Buscar y filtrar: el subconjunto conserva el mismo orden; limpiar filtro restaura el original.
8. Comparar Principal, Rasgos, Hechizos, Personaje y Compañeros con Mago y Guerrero: estructura común intacta.

## Próxima entrega propuesta

Brujo **nivel 10**, revisión del rasgo de subclase del Patrón Infernal y preparación de su progresión reversible, usando los contratos ya documentados. Considerar dos niveles por entrega únicamente si el segundo tiene baja carga de reglas y puede auditarse sin riesgo.

## Nota para el TFG

La actualización evidencia normalización de datos (mismo catálogo de conjuros para varias clases), validación de progresión reversible con historial tipado y separación entre reglas y presentación. La ordenación del Bestiario vive en la capa de datos, de modo que todas las consultas y futuras clases disfrutan de la misma semántica sin duplicar lógica de interfaz. Registro de limitación: la suite completa solo puede verificarse en el monorepo local del estudiante.
