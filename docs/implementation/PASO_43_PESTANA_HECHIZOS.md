# Actualización 43. Hoja de hechizos de origen (D&D 2024)

**Proyecto:** Crónicas, hoja digital de personaje D&D 2024 / TFG.  
**Fecha:** 13 de noviembre de 2026.  
**Estado:** implementación preparada y comprobada de forma aislada; aceptación final pendiente de `pnpm lint`, `pnpm test`, `pnpm build`, pruebas visuales y commit del desarrollador.  
**Versión de partida de la implementación:** actualización 42.1, con perfil narrativo en modo lectura/edición y todos los ajustes 41.4.

## 1. Problema

La pestaña Hechizos estaba ocupada por un `SheetPlaceholder` que enumeraba los nombres de `result.spells`. El motor ya registraba algunos conjuros de la dote de origen **Iniciado en la Magia** y de los linajes élficos, pero el jugador no podía consultar con claridad sus fuentes, niveles, estadística mágica o restricciones de lanzamiento.

La aplicación **no es un videojuego**. No debe inventar hechizos, ranuras, efectos activos, blancos ni acciones de personajes no jugadores. El módulo se integra como hoja de referencia de los datos calculados que el jugador pueda usar en la mesa, y constituye el cimiento para ampliar en el futuro la magia de clases lanzadoras.

## 2. Consulta del reglamento original aportado al proyecto

Fuente primaria: *Player's Handbook* de Dungeons & Dragons, edición 2024, PDF facilitado por el desarrollador. Referencias de **paginación impresa**:

| Páginas | Concepto | Decisión del programa |
|---|---|---|
| 190 | Linajes élficos; trucos iniciales y conjuros adicionales al nivel 3 y 5 | Se muestran únicamente las concesiones devueltas por `elfLineageSpells` a partir del nivel validado. |
| 201 | Dote de origen Magic Initiate: dos trucos y un conjuro de nivel 1; lanzamiento de nivel 1 sin ranura una vez por descanso largo | Se indican fuente y permiso de uso gratuito, sin consumirlo automáticamente. |
| 235 | Trucos sin ranuras, espacios de conjuro de las clases, lanzamiento especial sin ranura | No se crean ranuras de clase para el Guerrero. |
| 238 | CD de salvación = 8 + modificador mágico + competencia; ataque mágico = modificador mágico + competencia | Se muestra cálculo por característica de lanzamiento. |
| 239 en adelante | Descripciones concretas de hechizos | No se reproducen descripciones extensas ni se presupone que un conjuro específico requiere ataque o salvación sin comprobar su ficha. |

Nota metodológica: la página 201 permite **lanzar el conjuro de nivel 1 con ranuras solo si el personaje dispone de ellas**. En nuestro Guerrero no existen ranuras de clase; la interfaz no interpretará el permiso como una concesión de ranuras. También se distingue entre un **hechizo concreto** y varias **fuentes que lo conceden**, ya que cada concesión puede tener su propia característica y forma de acceso.

El proyecto utiliza el texto del manual para justificar las reglas y referencias mecánicas, pero las descripciones de la interfaz son de redacción original, no copias del libro.

## 3. Objetivos y criterios de aceptación

| Identificador | Requisito | Evidencia esperada |
|---|---|---|
| H43-01 | Sustituir el marcador de posición | La pestaña «Hechizos» muestra la nueva hoja. |
| H43-02 | Leer solo hechizos realmente concedidos | Guerrero corriente: estado vacío; Iniciado en la Magia: dos trucos y uno de nivel 1. |
| H43-03 | Clasificar por nivel y filtrar | Trucos, nivel 1, nivel 2, búsqueda por nombre/origen/característica. |
| H43-04 | Distinguir fuentes | Trasfondo, dote adicional humana, linaje élfico visibles y separados. |
| H43-05 | Calcular bonificadores | CD y bono de ataque mágico calculados desde puntuaciones finales y competencia. |
| H43-06 | Mantener la progresión | Elfo en niveles 1, 3 y 5 ve exactamente los conjuros validados. |
| H43-07 | No inventar ranuras ni automatismos | Se informa de usos por descanso largo sin registrar consumos ni alterar partida. |
| H43-08 | Estabilidad e integración | No cambiar `GuidedFighterInput`, instantáneas, API, PostgreSQL ni `AdventureState`. |
| H43-09 | Responsive y accesibilidad | Filtros de botones `aria-pressed`, etiquetas de búsqueda, detalles desplegables y disposición adaptable. |

## 4. Archivos modificados o nuevos

1. `apps/web/src/app/page.tsx` **modificado**: sustituye `SheetPlaceholder` en la pestaña Hechizos por `SpellsPanel`. Mantiene los otros cinco paneles intactos.
2. `apps/web/src/components/SpellsPanel.tsx` **nuevo**: presentación, filtros, búsqueda, resúmenes, paneles de característica y fichas desplegables.
3. `apps/web/src/app/globals.css` **modificado**: estilos de la pestaña Hechizos, controles responsivos y foco visible.
4. `packages/rules-engine/src/spellbook.ts` **nuevo**: proyección pura de lectura desde `GuidedFighterResult.spells` y `sheet.abilityModifiers`, `sheet.proficiencyBonus`.
5. `packages/rules-engine/tests/spellbook.test.ts` **nuevo**: casos del Guerrero sin magia, Iniciado en la Magia, duplicidad de fuentes, linaje élfico 1/3/5 y cálculo de CD/ataque.
6. `docs/implementation/PASO_43_PESTANA_HECHIZOS.md` **nuevo**: este registro de decisiones, validación y límites.

**No se modifican** tablas Prisma, rutas HTTP, motor de origen y linajes, versión de snapshot, operaciones de inventario o módulos de combate. No se requieren migraciones ni reinstalación de dependencias.

## 5. Diseño técnico

### 5.1. Una fuente de verdad

El componente obtiene únicamente `GuidedFighterResult`, ya calculado por `calculateGuidedFighter`. No guarda una lista de conjuros en un estado React alternativo ni escribe cambios en las elecciones del jugador. Los filtros y la búsqueda son el único estado local, puramente visual.

`collectCharacterSpellbook` calcula:

- Tarjetas de hechizos con ID estable, nombre, nivel, procedencia y habilidad de lanzamiento.
- Bonificadores de ataque mágico y CD por fuente y característica.
- Cantidades de concesiones, trucos, conjuros de nivel 1/2 y nombres únicos.
- Un listado de características mágicas distintas utilizadas por el personaje.

### 5.2. Concesiones del mismo conjuro por diferentes fuentes

Si el trasfondo y la dote adicional humana conceden `Guidance`, se conservan **dos entradas** con distinto identificador de fuente, incluso si el ID del hechizo es el mismo. Esto evita perder procedencia, característica o permiso de uso por una deduplicación mal planteada. Una misma concesión idéntica en la misma fuente se deduplica para prevenir claves React repetidas.

### 5.3. Cálculos de lanzamiento

Se toma directamente el modificador de la puntuación final de Inteligencia/Sabiduría/Carisma correspondiente y el bono de competencia ya obtenido del motor:

```text
Bonificación de ataque mágico = modificador de lanzamiento + competencia
CD de salvación de conjuro = 8 + modificador de lanzamiento + competencia
```

Estos valores solo son aplicables a hechizos que requieran el correspondiente ataque o salvación. Se presentan como referencia y **no se simula que todos los conjuros usen ambas reglas**.

### 5.4. Disponibilidad y estado

- Trucos: se indica que pueden lanzarse sin gastar ranura.
- Conjuros de nivel 1/2 concedidos por el origen: se indica un lanzamiento gratuito por descanso largo según la fuente que los concede.
- Permiso de usar ranuras: se muestra condicionado a que una característica de clase u otra regla conceda ranuras apropiadas. El Guerrero actual no obtiene ranuras de clase.
- No se añade un contador de usos ficticio: todavía no existe una acción única del motor para registrar uso, descanso y recuperación de estos conjuros.
- Se mantiene el guardado manual actual. No cambia la forma en que se recuperan personajes antiguos.

### 5.5. Limitaciones y futuros trabajos

Esta fase **no** implementa lanzar un conjuro de verdad, gestionar ranuras, preparar magia de clases, gastar el uso gratuito, resolver daño, tirar ataques mágicos, imponer condiciones, controlar concentración, duración o componentes. La futura integración deberá hacer un inventario exacto de tipos de tirada por hechizo y decidir si las modificaciones son pasivas, una tirada solicitada manualmente o una acción que exige confirmación del jugador.

Otro límite preexistente del sistema: los cambios de truco de Alto elfo después de un descanso largo todavía no se pueden registrar. La hoja 43 muestra fielmente la concesión actual del motor; no resuelve ese sistema pendiente.

## 6. Alternativas consideradas

| Alternativa | Resultado | Motivo |
|---|---|---|
| Crear un hechicero o mago «de prueba» para llenar la pestaña | Descartada | Inventaría clases y ranuras que el creador no soporta. |
| Guardar una segunda lista de conjuros en estado React | Descartada | Riesgo de desincronizar origen, personaje guardado y vista. |
| Mostrar ficha vacía de hechizos hasta tener clases lanzadoras | Descartada | Desperdicia los conjuros de origen que ya calcula el motor. |
| Registrar uso con una casilla temporal sin persistencia | Pospuesta | Al recargar se perdería el contador y se induciría a error. |
| Proyección pura y hoja de lectura de magia de origen | **Seleccionada** | Compatible, trazable, comprobable y extensible. |

## 7. Verificaciones y criterios para cerrar la fase

### Comprobaciones de preparación

- Comprobación TypeScript estricta sobre el módulo nuevo del motor.
- Comprobación TypeScript estricta y de JSX sobre `SpellsPanel` aislado.
- Pruebas directas del motor: personaje sin conjuros, Acólito con Iniciado, doble origen, características separadas y linaje élfico a niveles 1/3/5.
- Revisión manual del ZIP para confirmar las seis rutas originales y que no contiene dependencias, secretos ni archivos externos.

### Pruebas obligatorias en el ordenador del desarrollador

```powershell
pnpm lint
pnpm test
pnpm build
pnpm dev
```

Pruebas manuales:

1. Guerrero humano Soldado sin Iniciado: pestaña vacía, sin ranuras inventadas.
2. Acólito con Iniciado en la Magia: dos trucos, conjuro de nivel 1, ficha de característica mágica y CD/ataque calculados.
3. Humano con dos orígenes mágicos diferentes: distinguir los hechizos de cada fuente, incluso si coinciden los nombres.
4. Elfo de nivel 1 y 3; luego nivel 5: conjuros de linaje aparecen cuando corresponde.
5. Búsqueda y filtros; desplegar/plegar fichas; prueba móvil.
6. Abrir dos personajes guardados y confirmar que cada uno muestra únicamente sus conjuros.
7. Guardar y recuperar personaje para comprobar que no se modifican otras secciones.

**No dar por aceptada la actualización hasta recibir resultados de lint, test y build.**

## 8. Registro Git de la actualización

Al pasar las pruebas, preparar únicamente estos seis archivos y revisar `git diff --cached` antes del commit. Mensaje sugerido: `feat: actualizacion 43 - hoja de hechizos de origen`.

Commit SHA y fecha de subida: **pendientes de confirmar por el desarrollador**. Se añadirán a la memoria maestra del TFG cuando estén disponibles.
