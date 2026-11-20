# Paso 76 — Brujo nivel 7 y representación común de ataques con armas

**Fecha:** 20 de noviembre de 2026. **Base de reglas:** D&D 2024, Patrón Infernal. **Dependencia:** paso 75 (Brujo nivel 6). **Ámbito:** progresión y presentación transversal de tiradas con armas (Brujo/Mago).

## Necesidad y decisión de diseño

El Brujo alcanzó nivel 6 con progresión, guardado y arquitectura visual compartidos. Nivel 7 incorpora una ranura de grado superior, una invocación, un preparado adicional y dos conjuros de patrón. Por separado, el panel de armas mostraba resultados comprimidos en frases: muy distinto de las tarjetas claras de d20, salvaciones y Descarga sobrenatural. Se introduce un componente visual único (`WeaponRollCards`) que los paneles de armas de Mago y Brujo reutilizan; **no se automatizan acciones de combate** ni se cambian los cálculos de dados del motor.

## Verificación de reglas 2024

Referencia primaria: https://www.dndbeyond.com/sources/dnd/br-2024/character-classes — «Warlock Features», «Eldritch Invocation Options», «Fiend Spells» y «Level 4 Warlock Spells».

| Concepto | Nivel 6 | Nivel 7 |
| --- | --- | --- |
| Bonificador de competencia | +3 | +3 |
| Trucos de Brujo | 3 | 3 |
| Invocaciones sobrenaturales | 5 | **6** |
| Preparados ordinarios | 7 | **8** |
| Preparados siempre del Patrón Infernal | 6 | **8** |
| Magia de Pacto | 2 ranuras de nivel 3 | **2 ranuras de nivel 4** |
| Puntos de golpe | 6d8 | **+1d8**, promedio 5 o resultado tirado, más CON |
| Suerte del Oscuro | Disponible | Se conserva y no se reinicia al subir |

Seis conjuros ordinarios disponibles de nivel 4: **Destierro, Marchitar, Hechizar monstruo, Puerta dimensional, Terreno alucinatorio e Invocar aberración**. Los seis ya están en la biblioteca del Mago. El patrón añade **Escudo de fuego y Muro de fuego**; tampoco requieren fichas nuevas. La biblioteca sigue con **252 fichas globales**, y la lista ordinaria del Brujo pasa de 53 a 59 conjuros/trucos. Se conservan ocho preparados gratuitos de patrón, independientes de los ocho ordinarios.

Nueva invocación opcional: **Susurros de la tumba**, disponible desde el nivel 7. Permite lanzar Hablar con los muertos sin gastar ranura. Se usa la ficha existente en el catálogo global y el jugador resuelve las respuestas durante la partida. Se valida el requisito de nivel. Las invocaciones dependientes de Hoja y Cadena siguen exigiendo su pacto.

**Castigo sobrenatural:** el daño adicional es `1d8 + 1d8 por nivel de ranura`, por lo que pasa de **4d8 a 5d8** con una ranura de nivel 4. En crítico se duplican solo los dados (`10d8`), no un modificador fijo. Una vez por turno y con gasto de ranura marcado por el usuario.

## Arquitectura y responsabilidades

### Motor de reglas

- `warlock-spells.ts`: IDs de seis hechizos ordinarios de nivel 4 y dos del Patrón Infernal. `warlockSpellRule` retorna la **misma instancia** que `wizardSpellRule` y no crea nuevas traducciones duplicadas.
- `shared-spell-catalog.ts`: agrega referencias a la lista Brujo y Patrón Infernal, sin aumentar el conjunto global de fichas.
- `warlock.ts`: se amplían rango de niveles 1–7, número de preparaciones, invocaciones y dado `level7HitDieRoll`. Validación estricta de seis invocaciones y ocho preparados; el Patrón Infernal no ocupa estas plazas. Los PG y los demás valores pasivos se recalculan. Se mantiene `schemaVersion: 4` y compatibilidad con guardados anteriores.
- `warlock-level-up.ts`: `advanceWarlockToLevelSeven` valida ocho preparados con conservación de seis, tres trucos con conservación de dos y seis invocaciones con al menos cuatro anteriores. `level7History` conserva las elecciones y vínculos de nivel 6. `previewWarlockLevelDown` reconstruye 7→6 con resumen previo a confirmar y sigue siendo compatible con 6→5 y niveles inferiores.
- `warlock-traits.ts`: refleja los nuevos conjuros, cantidades e invocación; el rasgo Suerte del Oscuro sigue inalterado.

### Interfaz y representación común

- `WarlockLevelUpWizard.tsx` conserva el **mismo `LevelUpDialogFrame` de tres etapas**, mismo selector `LevelUpHitPointsPicker`, misma búsqueda y detalle `WizardSpellDetails`; solo cambia el contenido reglamentario de nivel 7.
- `warlock/page.tsx`: activa subir desde 6, muestra y selecciona magia de pacto de nivel 4, octava preparación, seis invocaciones y ocho hechizos del patrón. La biblioteca común y las siete pestañas son idénticas a otras clases.
- `WeaponRollCards.tsx`: nueva capa presentacional. Recibe dados, tipo de tirada, bonificador y total; renderiza tarjetas grandes con **todos los dados individuales**, el d20 elegido en ventaja/desventaja, fórmula, total destacado y nota informativa. Usa clases de estilo compartidas `overview-roll-*` y las ampliaciones `overview-roll-cards` / `overview-dice-card`.
- `BasicWeaponAttacks.tsx` (Mago) y `WarlockAttacks.tsx` (Brujo): sustituyen las frases largas por `WeaponRollCards` para ataques normales, daño, **Hoja sedienta** (dos tarjetas independientes) y **Castigo sobrenatural**. Se conserva la casilla de daño crítico y la selección global de ventaja/desventaja. El gasto de ranura de Pacto continúa explícitamente manual.
- `globals.css`: solo estilos compartidos, diseño adaptable a móvil y mismo aspecto que Descarga sobrenatural.

## Seguridad, reversibilidad y compatibilidad

El diálogo de subida calcula una instantánea validada antes de confirmar y no cambia el personaje si se cancela. La bajada muestra qué se pierde, solicita confirmación, restaura las elecciones guardadas e impide conservar magia de nivel 4 sin acceso. Los contadores de magia de pacto no se restablecen al subir ni bajar; Suerte del Oscuro mantiene los usos. Los archivos de guardado anteriores siguen usando esquema 4; los campos de nivel 7 son opcionales. Los cambios estéticos no escriben en la partida ni modifican una tirada previa: mostrar un dado no determina el impacto ni consume recursos.

## Pruebas y verificaciones

Suite nueva: `packages/rules-engine/tests/warlock-level-7-76.test.ts` (progresión, PG, ranuras, prerrequisitos, catálogo compartido, patrones, guardado, restauración y 7→6→5). Se añaden comprobaciones locales con Node al motor. Se deben ejecutar en el monorrepositorio completo del usuario las pruebas, el análisis estático y la compilación.

### Manuales

1. Brujo nivel 6 → abrir «Subir nivel»: ver **tres pasos** iguales a Mago/Guerrero, no otro diálogo; revisar promedio 5 o 1d8.
2. Elegir sexta invocación (por ejemplo, Susurros de la tumba) y octavo preparado, como Marchitar; al confirmar hay ocho preparados ordinarios, ocho del patrón, seis invocaciones y dos ranuras nivel 4.
3. Abrir Hechizos y filtrar por Brujo/Patrón Infernal/Mago, por nivel 4 y por nombre; comparar fichas de Escudo de fuego, Muro de fuego y Marchitar con las del Mago. Todas conservan sus filtros.
4. Verificar que los conjuros gratuitos del patrón no consumen los ocho huecos ordinarios.
5. Equipar un arma y pulsar «Atacar»: ver tarjeta de dados con total grande. Repetir con Ventaja y Desventaja: deben verse ambos dados y el dado elegido.
6. Pulsar «Daño», repetir con crítico: aparecen dados individuales, fórmulas, bonus una sola vez y total destacado. Repetir con un Mago para comprobar formato **idéntico**.
7. Con arma del pacto y Hoja sedienta, «Atacar ×2» debe mostrar dos tarjetas; con Castigo sobrenatural, muestra **5d8** o **10d8** si crítico y recuerda marcar manualmente la ranura.
8. Guardar y recargar en nivel 7, gastar un uso de Suerte del Oscuro y marcar ranura gastada. Bajar 7→6 tras leer el resumen: regresan cinco invocaciones, siete preparados, ranuras de nivel 3; se mantienen estado y compañeros, y se quitan los dos hechizos gratuitos de nivel 4.
9. Bajar 6→5 para comprobar que el historial anterior no se rompió.
10. Ejecutar `pnpm --filter @dnd/rules-engine test`, `pnpm --filter @dnd/web lint` y `pnpm build` en el repositorio completo.

## Siguiente fase

**Paso 77: Brujo nivel 8.** Dote/mejora de característica y noveno conjuro ordinario, sin nuevos espacios ni cambios de grado. La carga es moderada; estudiar si conviene avanzar además al nivel 9 en una única actualización, porque ese nivel ya incorpora cambios importantes (magia de pacto de nivel 5, más invocaciones y conjuros del patrón).
