# Paso 57 — Mago de Evocación: nivel 13 y conjuros de nivel 7

**Proyecto:** Crónicas (D&D 2024).  
**Estado:** implementación incremental preparada sobre `main` en el commit `7323821c8b66e031cbf6d98bf22e94e65ef7bdce` (actualización 56). Pendiente de integración y verificación completa con dependencias, navegador y PostgreSQL del desarrollador.  
**Fecha:** 17 de noviembre de 2026.

## 1. Alcance funcional

Se amplía el asistente del Mago de Evocación de nivel 12 al **13**, manteniendo una hoja y controles compartidos con el Guerrero y con los niveles previos. Conforme a la tabla 2024:

| Concepto | Nivel 12 | Nivel 13 |
|---|---:|---:|
| Bonificador de competencia | +4 | +5 |
| Trucos conocidos | 5 | 5 |
| Preparados reglamentarios | 16 | 17 |
| Ranuras niveles 1–6 | 4/3/3/3/2/1 | 4/3/3/3/2/1 |
| Ranuras nivel 7 | 0 | 1 |
| Conjuros ordinarios añadidos al libro | — | 2 |
| Regalo de Experto en Evocación | — | 1, nuevo, de nivel 1–7 |

La mejora del nivel 12 se conserva. No hay nueva dote ni truco en el 13. El ascenso exige exactamente dos conjuros ordinarios nuevos del catálogo de nivel disponible y una evocación gratuita distinta de las anteriores y de las elecciones simultáneas. El sistema rechaza conjuros de nivel 8 o 9 y todas las selecciones duplicadas. Se sigue preservando la separación entre biblioteca manual sin cupos y progresión reglamentaria validada.

## 2. Catálogo, tiradas y fuente

Se incorpora `wizard-seventh-level.ts` con **15 conjuros de nivel 7**: Bola de fuego retardada, Etereidad, Dedo de la muerte, Jaula de fuerza, Mansión magnífica de Mordenkainen, Espejismo arcano, Espada de Mordenkainen, Cambio de plano, Rociada prismática, Proyectar imagen, Invertir gravedad, Ocultar, Simulacro, Símbolo y Teletransporte.

El catálogo visible pasa de **202 a 217 fichas** (20 trucos y 197 conjuros de niveles 1–7). Se integran en `WIZARD_SPELL_CATALOG` y `WIZARD_SPELL_RULES`, por lo que están disponibles en las vistas de conjuros, los filtros y el asistente. Cada entrada incluye escuela, lanzamiento, alcance, componentes, duración, identificador estable y resumen de autoría propia. Se proporciona tirada cuando existe una fórmula base: Dedo de la muerte `7d8+30`, Bola de fuego retardada `12d6` (sin turnos adicionales), Espada de Mordenkainen `4d12` (el jugador suma Inteligencia), Rociada prismática `1d8` y `12d6` según color. No se resuelven salvaciones, concentración, objetivos, condiciones ni daños automáticamente.

**Fuentes contrastadas:** [D&D Beyond — reglas básicas 2024, tabla de clase y lista de Mago](https://www.dndbeyond.com/sources/dnd/br-2024/character-classes) y [descripciones oficiales de conjuros](https://www.dndbeyond.com/sources/dnd/br-2024/spell-descriptions). La tabla básica contiene 13 de estos conjuros; las dos denominaciones del PHB adicionales son *Mordenkainen’s Sword* y *Mordenkainen’s Magnificent Mansion*, cuyas reglas están en el mismo compendio de descripciones. **Pendiente:** cotejar la paginación impresa exacta de esas quince entradas en el ejemplar del PHB 2024 del responsable; no se han inventado números de página.

El contenido del manual debe servir para consultar las excepciones. Los resúmenes no sustituyen la redacción oficial. Se mantiene la política de procedencia y contenido autorizado; no se copia una transcripción extensa del PHB.

## 3. Arquitectura y persistencia

- `wizard-creation.ts`: tipo hasta nivel 13, nuevo campo opcional `evokerLevelSevenSpellId`, regla de desbloqueo, unicidad y lista blanca de snapshots; el campo es obligatorio al validar nivel 13, ausente en niveles menores.
- `wizard-level-up.ts`: ascenso 12→13 completo y atómico, marca del nuevo hueco de nivel 7 como disponible, conservación de ranuras gastadas, PG y recursos existentes, fusión conservadora con biblioteca manual y previsualización.
- `level-down.ts`: 13→12 retira los dos conjuros ordinarios del nivel 13, el regalo de Evocación y la ranura 7. Conserva la mejora del 12, las elecciones anteriores, el libro restante, estado mutable y daño compatible.
- `wizard-spell-details.ts`: usa el catálogo ampliado para fichas y botones de dados.
- `wizard-spell-library.ts` y `wizard-traits.ts`: contemplan el regalo de nivel 13 en biblioteca y rasgos.
- `WizardLevelUpWizard.tsx`: selector de la Evocación gratuita, límites de nivel 7, resumen de cambios, prevención de duplicados y séptima fila de ranuras.
- `wizard/page.tsx`: habilita Subir nivel de 12 a 13, muestra séptima ranura en Principal y Hechizos y actualiza el indicador de la siguiente etapa.

No se crean tablas nuevas, no se cambia el esquema Prisma ni `schemaVersion: 3`, y no se reescriben módulos de Guerrero. Las actualizaciones de prueba de entregas 51–55 reflejan el nuevo tamaño de catálogo y la prueba del paso 56 ahora prevé la subida a 13. El test histórico de cobertura de páginas limita su comprobación a las fichas hasta nivel 6; los nuevos conjuros tienen metadatos y reglas comprobables pero la referencia PHB por página aún requiere cotejo.

## 4. Pruebas y criterios de aceptación

El archivo `wizard-level-13-57.test.ts` añade escenarios para: 15 entradas únicas y 217 fichas, metadatos y tiradas, nivel 13 y competencia +5, regalo de Evocación distinto, validación de niveles y duplicados, guardado v3, recuperación de ranuras previas, rechazo de recuperar el séptimo nivel con Recuperación arcana y descenso 13→12.

**Ejecutar en el proyecto integrado:**

```cmd
pnpm install --frozen-lockfile
pnpm --filter @dnd/rules-engine test
pnpm lint
pnpm build
pnpm dev
```

**Pruebas manuales recomendadas:**

1. Cargar un Mago de Evocación de nivel 12 con una ranura de nivel 6 gastada y daño recibido. Abrir 12→13, inspeccionar el resumen y cancelar para verificar que no cambia nada.
2. Seleccionar dos conjuros nuevos (uno puede ser de nivel 7) y otra Evocación gratuita no repetida. Probar un intento duplicado o no-Evocación: el asistente debe impedir la confirmación.
3. Confirmar: competencia +5, 17 preparados reglamentarios, 30 conjuros ordinarios en libro, 5 trucos y ranuras `4/3/3/3/2/1/1`. La séptima ranura aparece disponible, la sexta previamente gastada sigue gastada y los recursos previos no se reinician.
4. Comprobar en Hechizos y en Principal los siete grupos de rombos y la sincronización del gasto/restauración de la ranura 7. La Recuperación arcana no debe permitir recuperar ranuras de nivel 6 o 7.
5. Filtrar nivel 7 en Todos los conjuros: aparecen las 15 fichas. Abrir Dedo de la muerte, Bola de fuego retardada, Rociada prismática y Espada de Mordenkainen; comprobar fórmulas y que las tiradas no consumen ranura ni aplican daño.
6. Marcar un conjuro de nivel 7 como Aprendido o Preparado manualmente, guardar, cerrar y recargar desde PostgreSQL. Verificar que no se duplica el personaje y se conservan nombre, retrato, equipo, hechizos, ranuras gastadas y estado de vida.
7. Bajar 13→12, revisar el resumen, confirmar que se retira el regalo de nivel 7 y que la ranura desaparece. Deben persistir las elecciones de niveles anteriores y los PG perdidos; guardar y recuperar.
8. Abrir un Guerrero y un Mago anterior a nivel 13 para descartar regresiones. Conservar los logs y capturas de esta matriz para el TFG.

## 5. Evidencias reales y limitaciones

En el entorno de preparación se comprobó la estructura del código y la unicidad de los quince identificadores nuevos; el archivo ZIP se valida por integridad. **No se declara superado** el tipado integral, la ejecución oficial de Vitest, el lint, el build de Next.js ni los flujos con PostgreSQL: el entorno no contiene el monorepositorio completo y sus dependencias. El responsable debe registrar fecha, comando, resultado y capturas en el repositorio real.

## 6. Paso siguiente

**Paso 58: Mago nivel 14.** Integrar el rasgo de la subclase Evocación **Sobrecarga**, sus recursos y consecuencias cuando el jugador decide usarlo, la elección ordinaria de dos conjuros, el retroceso y la persistencia. La mecánica implica daño necrótico por usos repetidos y exige que la aplicación explique claramente qué se calcula automáticamente y qué activa manualmente el jugador.
