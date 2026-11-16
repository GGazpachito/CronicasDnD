# Actualización 47: núcleo de Mago (1–20) y Evocación en D&D 2024

**Estado:** implementación de motor independiente preparada; **integración con la web pendiente**.  
**Fecha:** 16 de noviembre de 2026.  
**Requisitos del usuario:** priorizar el Mago completo, con Evocación como primera subclase, antes de ampliar especies. Preparar la hoja Hechizos como componente reutilizable. Al terminar cada actualización indicar el siguiente objetivo.

## 1. Decisión de alcance y entregas

El prototipo actual está diseñado alrededor de `GuidedFighterInput`, `calculateGuidedFighter`, recursos de Guerrero y una hoja de hechizos de **origen**. Añadir Mago y sus nueve niveles de ranuras directamente a `page.tsx` sería un cambio transversal arriesgado, especialmente para los personajes guardados. Se adopta una implementación progresiva, verificable por hitos:

- **47 (esta entrega):** motor puro de progresión de Mago 1–20, recurso de ranuras reutilizable, capacidades de Evocación, validadores, cálculos básicos y pruebas.
- **48 (siguiente):** introducir elección de clase y estructura tipada de personajes Mago; adaptar creación y persistencia de forma compatible con el Guerrero.
- **49 (previsto):** catálogo oficial completo de conjuros del Mago y estado persistente del libro, preparación, ranuras y descanso; ampliar Hechizos para un lanzador de clase.
- **50 (previsto):** conectar acciones asistidas de Evocación y los rasgos restantes, distinguiendo reglas pasivas de decisiones del jugador.
- **51 (previsto):** asistente de subida de nivel del Mago de 1 a 20 con selección de nuevos conjuros, mejoras, Erudito, Maestría, beneficio épico y Conjuros distintivos.
- **52 (previsto):** regresión entre Guerrero/Mago, guardados, UI responsive y documentación de aceptación.

Estas fases son propuestas y pueden cambiar después de las pruebas locales.

## 2. Fuentes y exactitud reglamentaria

Fuente primaria: *Player's Handbook* (edición 2024), PDF aportado por el propietario del proyecto. Referencias por **paginación impresa**:

- **p. 165:** aptitudes del Mago, dado de golpe d6, competencias, lanzamiento, seis conjuros iniciales y dos nuevos al ganar cada nivel.
- **p. 166:** tabla de ranuras y conjuros preparados para los 20 niveles; Adepto ritual, Recuperación arcana y Erudito.
- **p. 167:** copia al libro, elección de subclase, mejora de característica, Memorizar conjuro, Maestría, beneficio épico y Conjuros distintivos.
- **p. 174:** Evocador: Experto en Evocación, Truco potente, Esculpir conjuros, Evocación potenciada y Sobrecarga.
- **pp. 235–238:** reglas generales de lanzamiento de conjuros; servirán de apoyo para las fases de interfaz.

Las descripciones del código son **resúmenes originales en español**, no reproducción literal de los textos del libro.

## 3. Archivos afectados

| Archivo | Tipo | Responsabilidad |
|---|---|---|
| `packages/rules-engine/src/spellcasting-core.ts` | Nuevo | Ranuras por nivel, gasto, recuperación y descanso largo; operaciones inmutables y validación |
| `packages/rules-engine/src/wizard.ts` | Nuevo | Tabla oficial 1–20, rasgos Mago/Evocación, estadísticas, libro, elecciones, Recuperación arcana, Sobrecarga y Conjuros distintivos |
| `packages/rules-engine/src/index.ts` | Modificado | Exportación pública de los nuevos módulos, sin alterar las exportaciones anteriores |
| `packages/rules-engine/tests/wizard-47.test.ts` | Nuevo | Pruebas con Vitest de progresión, ranuras, validaciones y efectos |
| `docs/implementation/PASO_47_NUCLEO_MAGO_EVOCACION.md` | Nuevo | Este registro técnico |

Sin cambios en `apps/web`, Prisma, API, `package.json`, `pnpm-lock.yaml` ni los esquemas de guardado.

## 4. Arquitectura e invariantes

### 4.1. Progresión y rasgos

`wizardProgression(level, subclass)` devuelve una **proyección de solo lectura**. Las 20 filas se han tomado de la tabla del manual, con nueve columnas de espacios, 3/4/5 trucos conocidos, 4–25 conjuros preparados, competencia y d6 por nivel.

Se exige Evocación al alcanzar nivel 3, como única subclase **implementada actualmente**. Los rasgos se asignan a su nivel de desbloqueo: Evocación 3, 6, 10 y 14; Maestría de conjuros 18; beneficio épico 19; Conjuros distintivos 20.

### 4.2. Ranuras y recursos

`spellcasting-core.ts` no conoce la clase del personaje y por ello podrá reutilizarse al incorporar Clérigo, Bardo, Druida y otras clases. `createSlotPool` garantiza nueve valores enteros, `useSpellSlot` no permite gastar ranuras inexistentes, `restoreSpellSlots` no permite superar máximos y `longRestSpellSlots` restablece los valores. Todas devuelven objetos nuevos, sin modificar la entrada.

`wizardArcaneRecovery` permite recuperar tras descanso corto ranuras gastadas de niveles **1 a 5**, con suma de niveles <= techo(nivel de Mago / 2), **una vez por descanso largo**. `wizardLongRest` reinicia usos de Recuperación arcana y Sobrecarga.

`wizardAdvanceMagicState` **no convierte una subida de nivel en un descanso**: conserva el gasto previo y añade únicamente las ranuras nuevas.

### 4.3. Libro y conjuros

`validateWizardSpellChoices` comprueba de forma local: hechizos de nivel permitido, no duplicados, mínimo de 6 iniciales + 2 por nivel posterior, número de trucos, cantidad exacta de preparados, y que los preparados existan en el libro. Valida los niveles y el tiempo de lanzamiento de los conjuros de Maestría (nivel 18) y los dos conjuros distintos de nivel 3 de Firma (nivel 20). Se distinguen preparados ordinarios de los siempre preparados.

**Limitación importante:** todavía no existe un catálogo completo que garantice que un identificador arbitrario sea un conjuro oficial del Mago. Esta función está destinada a ser invocada **tras la validación con el catálogo** de la fase 49. No se conecta todavía a entradas de usuarios o a la API. Tampoco se exige por el momento el incremento extra de conjuros gratuitos concedidos por Experto en Evocación, porque sus elecciones se validarán al integrar el libro real.

Los rituales del libro pueden reconocerse aunque no estén preparados mediante `wizardCanRitualCast`. `wizardSpellCopyCost` devuelve tiempo y coste base (2 h y 50 po por nivel), sin efectuar compras.

### 4.4. Rasgos de Evocación

- **Truco potente (3):** mitad del daño, redondeado hacia abajo, para el supuesto de fallo del ataque o éxito de salvación; no aplica otros efectos por sí solo.
- **Esculpir conjuros (6):** devuelve el máximo de criaturas seleccionables (1 + nivel del conjuro). El DM/jugador determina a quién protege.
- **Evocación potenciada (10):** devuelve el modificador de Inteligencia aplicable a **una** tirada de daño de un conjuro de Evocación del Mago.
- **Sobrecarga (14):** registra usos; primera vez sin contrapartida; segunda 2d12 por nivel de ranura; tercera 3d12 por nivel, etc. Se informa del daño autoinfligido, **sin aplicarlo automáticamente** a la sesión. Solo ranuras de niveles 1 a 5.

No se simula selección de blancos, impactos, salvaciones de criaturas, concentración ni daño a enemigos. Estos actos siguen siendo decisiones de los jugadores.

### 4.5. Cálculos básicos

`wizardCoreStatistics` utiliza d6, 6 PG base en el primer nivel, 4 en posteriores, mínimo 1 PG ganado por nivel con Constitución adversa, CA base sin armadura 10 + Destreza y ataque/CD mágicos con Inteligencia. **No aplica todavía** los efectos de especie, dotes, armaduras especiales ni conjuros protectores; la futura hoja reutilizará el sistema común de efectos.

## 5. Verificaciones y resultados

| Verificación | Estado |
|---|---|
| TypeScript estricto en `index.ts` con las dependencias completas del motor | **Superado en la reconstrucción local de la versión 46** |
| Compilación CommonJS de los dos nuevos módulos | **Superada** |
| Aserciones Node directas sobre los niveles 1–20, recursos, Evocación y conjuros | **Superadas (141 comprobaciones de lógica)** |
| Pruebas directas adicionales sobre PG, ataque y CD, copia de conjuros | **Superadas** |
| Suite oficial de Vitest de la aplicación | **Pendiente en el equipo del desarrollador** |
| ESLint y build de Next.js | **Pendientes en el equipo del desarrollador** |
| Prueba visual del Mago en la web | **No aplicable a esta fase: todavía no aparece en la UI** |

### Comandos locales de aceptación

```powershell
pnpm lint
pnpm test
pnpm build
```

La instalación de esta fase **no añade el Mago al selector de clase**. Cualquier problema de regresión de un personaje Guerrero debe investigarse antes de continuar.

## 6. Riesgos y decisiones pendientes

1. **Unificar tipos de clase:** actualmente la aplicación usa `GuidedFighterInput` en múltiples paneles; la fase 48 debe introducir una discriminación de clases sin romper snapshots antiguos.
2. **Catálogo real de conjuros:** definir IDs, niveles, escuelas, rituales y requisitos de lanzamiento oficiales; no aceptar IDs inventados en entradas externas.
3. **Persistencia de estado mágico:** no usar valores transitorios de React para las ranuras ni repetir contadores en pestañas diferentes; guardar un único estado compatible.
4. **Elecciones dinámicas del Evocador:** conservar los conjuros de Experto en Evocación, la elección de Erudito y los conjuros dominados/distintivos en el personaje.
5. **Dotes y mejora de características:** reutilizar los mecanismos generales donde proceda, y distinguir alternativas aún no implementadas.
6. **No acoplar la UI a la clase:** la hoja Hechizos se rediseñará para leer un modelo de magia común que funcione con Mago y con futuros lanzadores.

## 7. Registro Git y trazabilidad

Commit recomendado tras verificar: `feat: actualizacion 47 - nucleo mago 1-20 y evocacion`. Guardar en el TFG el SHA obtenido con `git log -1 --format="%H%n%ad%n%s" --date=iso-strict` y el resultado de los comandos de pruebas.

**Siguiente actualización (48):** introducir **Mago en la creación del personaje** y establecer la representación común de clase/sesión/guardado, manteniendo la compatibilidad con el Guerrero y los personajes existentes.
