# Paso 59 — Mago niveles 15 y 16 · Conjuros de nivel 8 y mejora de característica

Fecha: **18/11/2026**. Repositorio: `GGazpachito/dnd-character-builder`, rama `main`. Base contrastada: commit de la actualización 58 `c684c095fc8f78a5cad8bbc67b2eb93ee7991d3e`.

## Motivación y criterio de agrupación

Se incluyen **dos niveles completos** porque el 15 requiere ampliar el catálogo de conjuros, pero el 16 reutiliza el sistema de mejora de característica de los niveles 4, 8 y 12. Agruparlos evita una entrega adicional con poca lógica nueva y permite probar conjuntamente progresión, persistencia y retroceso.

La hoja de personaje continúa siendo una **herramienta de apoyo**, no un videojuego: deriva estadísticas pasivas, ofrece tiradas vinculadas a fichas y deja acciones, objetivos, salvaciones, gasto efectivo de recursos, aplicación de daño y estados a los jugadores.

## Reglas del Mago (PHB 2024)

| Aspecto | Nivel 14 | Nivel 15 | Nivel 16 |
| --- | ---: | ---: | ---: |
| Bonificador de competencia | +5 | +5 | +5 |
| Trucos conocidos | 5 | 5 | 5 |
| Conjuros preparados | 18 | 19 | 21 |
| Conjuros ordinarios aprendidos por progresión | 32 | 34 | 36 |
| Ranuras de nivel 1 a 8 | 4/3/3/3/2/1/1/0 | 4/3/3/3/2/1/1/1 | 4/3/3/3/2/1/1/1 |
| Rasgos nuevos | — | Primera ranura 8 y Evocación gratuita | Dote Mejora de característica |

En **15**, además de los dos conjuros ordinarios, Experto en Evocación concede una Evocación gratuita de nivel 1–8 que no esté ya aprendida. En **16**, elige +2 en una característica o +1 en dos diferentes, respetando el máximo 20. La modificación se aplica a estadísticas derivadas y a todos los PG por nivel si cambia Constitución.

No se introducen conjuros de nivel 9 ni se concede una segunda ranura de nivel 8.

### Catálogo de nivel 8

Se añaden **13 fichas** de la lista de Mago del PHB 2024, en el nuevo archivo `wizard-eighth-level.ts`:

1. Campo antimagia (Abjuración).
2. Antipatía/Simpatía (Encantamiento).
3. Confusión mental / *Befuddlement* (Encantamiento).
4. Clon (Nigromancia).
5. Controlar el clima (Transmutación).
6. Semiplano (Conjuración).
7. Dominar monstruo (Encantamiento).
8. Nube incendiaria (Conjuración).
9. Laberinto (Conjuración).
10. Mente en blanco (Abjuración).
11. Palabra de poder: aturdir (Encantamiento).
12. Estallido solar (Evocación).
13. Telepatía (Adivinación).

Cada ficha especifica nivel, escuela, tiempo, alcance, componentes, duración y **resumen redactado originalmente en español**. Los efectos complejos remiten a las reglas y decisiones de mesa. Se ofrecen tiradas donde se necesitan dados: `10d12` (Confusión mental), `10d8` (Nube incendiaria), `12d6` (Estallido solar), `1d4` para intervalos del cambio de clima. Se preserva el motor común de dados y la separación entre tirada y aplicación del resultado.

Referencias de contraste:
- D&D Beyond, [Basic Rules 2024 — clases de personaje, tabla de Mago y conjuros](https://www.dndbeyond.com/sources/dnd/br-2024/character-classes).
- D&D Beyond, [Basic Rules 2024 — descripciones de conjuros](https://www.dndbeyond.com/sources/dnd/br-2024/spell-descriptions).
- Roll20, [Compendio de Mago, PHB 2024](https://roll20.net/compendium/dnd5e/Classes%3AWizard?expansion=32231). Se utiliza para verificar la presencia de *Befuddlement* y *Telepathy* en la lista completa del PHB.

## Decisiones de implementación

### Modelo y validación

- Se amplían los tipos de entrada y la validación de ficha a **niveles 1–16**.
- `evokerLevelEightSpellId` se exige desde nivel 15, se prohíbe antes y no puede repetir ningún conjuro ordinario o gratuito anterior.
- `level16Improvement` solo está permitido a partir del nivel 16 y usa el validador compartido de mejoras de característica.
- La versión del guardado continúa siendo `schemaVersion:3`: el esquema añade campos **opcionales** de progresión sin modificar las partidas antiguas.

### Subida de nivel

- `14→15`: dos conjuros, un preparado adicional, una ranura de nivel 8 disponible y una Evocación gratuita.
- `15→16`: dos conjuros, dos preparados adicionales, mejora de característica; mantiene la distribución de ranuras.
- Se conservan ranuras gastadas, PG heridos, inspiración, inventario, perfil, marcadores de muerte y contador de Sobrecarga.
- El asistente comunica los nuevos rasgos, permite consultar las fichas completas y exige finalizar todas las elecciones antes de confirmar.

### Biblioteca y controles

- La biblioteca reglamentaria y la selección manual reconocen los nuevos conjuros y el regalo de Evocación.
- La pestaña Hechizos y el bloque de ranuras de Principal muestran el nuevo **rombo de nivel 8** desde el 15.
- Recuperación arcana sigue limitada a ranuras de nivel **5 o inferior** y al máximo por descanso largo; la de nivel 8 no es recuperable mediante ese rasgo.
- Sobrecarga sigue limitada a las ranuras **1–5** aunque exista una de nivel 8; el propio contador y el daño son manuales.

### Bajada de nivel

- `16→15`: retira exclusivamente los dos conjuros adquiridos en 16 y la mejora de característica de 16; deja 19 preparados. Conserva la ranura de nivel 8 (incluido su estado gastado), el conjuro gratuito de 15 y el contador de Sobrecarga.
- `15→14`: retira los dos conjuros ordinarios de 15, el regalo de Evocación de 15 y la ranura de nivel 8; deja 18 preparados. Conserva Sobrecarga y su contador, puesto que existe desde el nivel 14.
- `14→13`: como en la actualización 58, elimina Sobrecarga y reinicia su contador. Se conservan las selecciones anteriores compatibles.
- Si la mejora de Constitución del nivel perdido alteraba los PG máximos, el retroceso revierte esa contribución y preserva el daño ya sufrido en la medida en que lo permiten los nuevos máximos.

## Archivos incluidos

| Archivo | Cambio |
| --- | --- |
| `packages/rules-engine/src/wizard-eighth-level.ts` | **Nuevo**, catálogo y metadatos de los 13 conjuros |
| `packages/rules-engine/src/wizard-creation.ts` | Niveles 1–16, regalo 15, dote 16, validación y guardado |
| `packages/rules-engine/src/wizard-level-up.ts` | Progresiones 14→15 y 15→16 |
| `packages/rules-engine/src/level-down.ts` | Retroceso 16→15→14, ranuras y contador |
| `packages/rules-engine/src/wizard-spell-details.ts` | Fichas de los conjuros nuevos |
| `packages/rules-engine/src/wizard-spell-library.ts` | Biblioteca manual y regalo de nivel 15 |
| `packages/rules-engine/src/wizard-traits.ts` | Lista de conjuros gratuitos de Evocación |
| `apps/web/src/components/WizardLevelUpWizard.tsx` | Asistente de subida 15 y 16 |
| `apps/web/src/app/wizard/page.tsx` | Ranuras de nivel 8 y acceso al nivel 16 |
| `packages/rules-engine/tests/wizard-level-14-58.test.ts` | Regresión: ahora existe progresión desde 14 |
| `packages/rules-engine/tests/wizard-level-13-57.test.ts` | Regresión: permite ampliar el tamaño del catálogo tras el nivel 7 |
| `packages/rules-engine/tests/wizard-levels-4-5-52.test.ts` | Regresión: tamaño de catálogo ampliable |
| `packages/rules-engine/tests/wizard-levels-6-7-53.test.ts` | Regresión: tamaño de catálogo ampliable |
| `packages/rules-engine/tests/wizard-levels-8-9-54.test.ts` | Regresión: tamaño de catálogo ampliable |
| `packages/rules-engine/tests/wizard-levels-10-11-55.test.ts` | Regresión: tamaño de catálogo ampliable |
| `packages/rules-engine/tests/wizard-spell-library-51-1.test.ts` | Regresión: tamaño y unicidad de catálogo |
| `packages/rules-engine/tests/wizard-levels-15-16-59.test.ts` | **Nuevo**, pruebas de niveles, fichas, guardado y retroceso |
| `docs/implementation/PASO_59_MAGO_NIVELES_15_16.md` | **Este documento**, trazabilidad para TFG |

## Verificación manual

Se recomienda empezar con un Mago de Evocación **nivel 14**:

1. Pulsar **Subir de nivel**. Elegir dos conjuros normales de nivel 1–8, añadir uno a la preparación, escoger una Evocación gratuita de nivel 1–8 (por ejemplo, *Estallido solar*) y confirmar **15**.
2. Verificar 34 conjuros ordinarios en libro, 19 preparados, 5 trucos y ranuras `4/3/3/3/2/1/1/1`.
3. En **Principal** y **Hechizos**, comprobar el rombo de la ranura 8. Gastarlo y verificar que ninguna acción de Recuperación arcana permite recuperar esa ranura.
4. Abrir las fichas *Confusión mental*, *Nube incendiaria* y *Estallido solar*; tirar sus dados y comprobar respectivamente `10d12`, `10d8` y `12d6`, sin aplicar daño automáticamente.
5. Guardar el Mago 15 y volver a cargarlo: deben persistir el regalo, la ranura y el contador de Sobrecarga.
6. Subir al **16**: elegir otros dos conjuros y **dos preparados adicionales**; seleccionar la mejora +2 Constitución o +1/+1 a características válidas. Confirmar.
7. Verificar 36 conjuros ordinarios en libro, 21 preparados, 5 trucos, competencia +5 y **las mismas ranuras** que el 15. La mejora debe actualizar modificadores y PG máximos.
8. Guardar/cargar 16 con una ranura 8 gastada y Sobrecarga utilizada, y comprobar que se conservan ambos recursos.
9. Bajar de 16 a 15: desaparecen dote y dos conjuros del 16, pero **no** la ranura 8 ni el contador de Sobrecarga.
10. Bajar de 15 a 14: desaparecen la ranura 8 y el regalo de Evocación 15; se conserva Sobrecarga.
11. Confirmar que desde 16 no se permite todavía subir al 17 y que no hay acceso a conjuros de nivel 9.

## Pruebas en la copia completa del repositorio

```cmd
pnpm --filter @dnd/rules-engine test
pnpm build
```

Las comprobaciones manuales deben realizarse antes del commit. Una comprobación local de estructura o del ZIP no sustituye la ejecución de Vitest y la compilación de Next.js en el repositorio completo.

## Siguiente paso propuesto — Actualización 60

Implementar **Mago nivel 17**: competencia +6, primera ranura de nivel 9, catálogo de conjuros de nivel 9, fichas y tiradas, dos conjuros nuevos, preparados y Evocación gratuita al obtener el nuevo nivel de ranura. Por su mayor carga de contenido se recomienda evaluar primero si es conveniente agrupar el nivel 18 (Maestría de conjuros) o entregarlo por separado.

## Registro del TFG

Este paso demuestra: integración iterativa de reglas reglamentarias y motor de validación; reutilización de componentes y mejoras de característica entre clases; diseño de estado persistente; control de regresiones y reversión segura; interfaz de apoyo sin automatizar decisiones de juego; y documentación reproducible por versión.
