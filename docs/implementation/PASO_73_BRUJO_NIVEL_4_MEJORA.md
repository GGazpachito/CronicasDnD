# Paso 73 · Brujo nivel 4 y mejora de característica

Fecha: 20 de noviembre de 2026. Actualización incremental posterior a Brujo nivel 3 (paso 72).

## Decisión de alcance y justificación (TFG)

Se evaluó implementar dos niveles a la vez. Se decidió entregar **solo el nivel 4** para no mezclar una actualización de mejora de característica con la del nivel 5, que exige diseñar e integrar conjuros de nivel 3, dos nuevas invocaciones, mejoras a familiares y ataques de pacto, competencia +3 y nuevos conjuros gratuitos del Patrón Infernal. Esta separación mantiene el riesgo de regresión bajo control y permite pruebas precisas de reversibilidad. El criterio de agrupar dos niveles sigue vigente para niveles de baja complejidad.

## Cambios

- En `warlock.ts` se permite nivel 4: 3 trucos, 5 preparados ordinarios, 3 invocaciones, 2 ranuras de Pacto de nivel de conjuro 2, competencia +2 y dado `level4HitDieRoll` (1d8 o media 5). La dote `level4Improvement` aplica +2 a una característica o +1/+1 a dos diferentes con máximo 20 reutilizando la función común `applyFighterAbilityImprovement` de `progression.ts`.
- Se recalculan características y modificadores, CD de salvación, ataque mágico, iniciativa, habilidades, salvaciones y PG. En concreto, si cambia Constitución se actualizan los PG de **todos** los niveles anteriores.
- `warlock-level-up.ts` valida `advanceWarlockToLevelFour`, impide sustituir más de un truco o conjuro anterior y conserva tres invocaciones (con posible sustitución de una). `level4History` guarda elecciones del nivel 3, incluidas dotes de invocación, pactos y efectos para restaurarlas en 4→3. `level3History` se conserva para permitir un posterior descenso 3→2.
- `WarlockLevelUpWizard.tsx` integra el nivel 4 en **el mismo diálogo común de tres pasos** y con los mismos filtros, fichas de magia, selector de PG y tarjetas que ya utilizan Mago, Guerrero y Brujo. La mejora de característica comparte diseño y reglas con Mago/Guerrero. No se introducen módulos o pestañas nuevas.
- `warlock-traits.ts` incorpora la dote de mejora en `TraitsPanel` y muestra tres trucos y cinco preparados en la descripción de Magia de Pacto. La página principal mantiene sus siete pestañas, el contador de recursos, el Patrón Infernal, los conjuros compartidos y el Bestiario.
- Los guardados anteriores (niveles 1, 2 y 3) mantienen `schemaVersion: 4`; el nivel 4 añade solo campos opcionales aceptados por el validador. Las dotes generales alternativas a Mejora de característica quedan pendientes por consistencia con el motor actual de Mago/Guerrero.

## Verificaciones manuales

En la raíz de tu repositorio, ejecutar cada comando de forma individual:

```
pnpm --filter @dnd/rules-engine test
pnpm --filter @dnd/web lint
pnpm build
```

1. **Subir de nivel:** cargar un Brujo de nivel 3 válido. Pulsar «Subir nivel» y comparar el diálogo con Mago/Guerrero. Debe tener tres pasos, los mismos botones, buscador, campo de PG promedio/d8 y fichas de conjuros.
2. **Mejora:** elegir +2 CAR (si no supera 20) y confirmar que cambian su puntuación, modificador y los valores derivados. Repetir con la opción +1/+1 en dos características distintas. Intentar una mejora inválida para confirmar que se bloquea el avance.
3. **Constitución y PG:** con Constitución 13 (+1), elegir +2 CON: debe llegar a 15 (+2) y el aumento se debe reflejar también en los PG de niveles anteriores. Probar igualmente la tirada 1d8 en vez del promedio.
4. **Magia:** comprobar que el Brujo conoce ahora **3 trucos y 5 conjuros ordinarios preparados**, además de 4 gratuitos del Patrón Infernal. Intentar sustituir dos trucos o dos conjuros antiguos: debe mostrar error de validación.
5. **Ranuras y recursos:** comprobar que siguen siendo **2 ranuras de nivel 2**, Astucia mágica con su mismo uso y Bendición del Oscuro con PG temporales recalculados si ha cambiado Carisma; probar que no acumula con PG temporales existentes.
6. **Hoja común:** visitar Principal, Rasgos, Equipo, Hechizos, Personaje, Compañeros y Combate. El diseño, los controles y los filtros de la biblioteca completa deben permanecer idénticos a las otras clases. Confirmar que el Bestiario sigue accesible y el familiar elegido aparece en Compañeros.
7. **Bajada:** pulsar «Bajar nivel» desde nivel 4. Comprobar vista previa con pérdida de dote, tercer truco, quinto preparado y PG; cancelar sin alterar nada. Después confirmar: deben restaurarse exactamente los dos trucos, cuatro preparados, invocaciones y pactos de nivel 3. Bajar de 3 a 2 y verificar que el historial previo persiste.
8. **Guardados:** guardar un Brujo de nivel 4 y recargarlo. Abrir también personajes previamente guardados en niveles 1, 2 y 3. Comparar el contador de PG, las ranuras y el módulo de compañeros.

## Pruebas automáticas y restricciones

`packages/rules-engine/tests/warlock-level-4-73.test.ts` comprueba reglas, elección +2/+1+1, límites de selección, aumento de PG por Constitución, Bendición del Oscuro, estados, guardado v4 y descenso 4→3→2. La prueba de humo con Node 24 valida este conjunto y se han vuelto a ejecutar sin errores las pruebas de humo disponibles de los pasos 66, 69, 70 y 72. El entorno de preparación es una copia parcial del monorepo sin dependencias completas de Next/Vitest; es obligatorio ejecutar `pnpm test`, `pnpm lint` y `pnpm build` en el proyecto local antes de subirlo.

## Próxima actualización

**Brujo nivel 5**: nuevos conjuros de nivel 3 y gratuitos del Patrón Infernal, +3 en competencia, dos invocaciones nuevas (y todas las nuevas elegibles, con sus requisitos), posible ataque adicional con Pacto de la Hoja y otras interacciones con familiares y Descarga sobrenatural. Se implementará manteniendo las tres etapas de subida y bajada y las siete pestañas universales.
