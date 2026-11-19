# Paso 66 — Primera entrega del Brujo 2024 (nivel 1) y pestaña común Compañeros

Fecha: 19/11/2026. Rama objetivo: main, repositorio GGazpachito/dnd-character-builder.

## Alcance

Esta entrega introduce la tercera clase monoclase, el Brujo de nivel 1, sin extender aún su progresión. El Patrón Infernal queda establecido como **primera subclase a desarrollar**, pero la elección y sus rasgos no se aplican hasta el nivel 3. El Guerrero y el Mago mantienen sus progresiones actuales. La arquitectura de hoja continúa siendo común, con siete pestañas: Principal, Rasgos, Equipo, Hechizos, Personaje, Compañeros y Combate.

El ZIP es incremental: se debe descomprimir en la raíz del repositorio conservando las carpetas y sustituyendo solamente los ficheros presentes en él. Antes de sobrescribir, guardar cualquier modificación local no publicada. El ZIP no incluye dependencias ni archivos ajenos a esta actualización.

## Decisiones de reglas y arquitectura

1. **Motor autónomo del Brujo**: se añade warlock.ts con elección validada, cálculos puros, una invocación inicial, recursos persistentes y snapshot versión 4. No se cambia artificialmente el modelo de Guerrero o Mago.
2. **Valores de nivel 1**: dado de golpe d8, 8 + CON al nivel inicial, competencia +2, salvaciones Sabiduría y Carisma, armadura ligera, armas simples, dos habilidades de su catálogo, dos trucos, dos conjuros de nivel 1 preparados, una ranura de Magia de Pacto. Recuperación de la ranura tras descanso corto o largo. Se admiten especies y trasfondos del catálogo compartido existente.
3. **Invocaciones sobrenaturales**: se elige exactamente una entre Armadura de sombras, Mente sobrenatural, Pacto de la Hoja, Pacto de la Cadena y Pacto del Tomo. Se refleja en Rasgos. No se habilitan invocaciones con requisito de nivel 2 o superior. El reemplazo en subida de nivel se implementará al construir el asistente de nivel 2.
4. **Pacto de la Hoja**: selector de arma cuerpo a cuerpo ya presente en inventario. La elección por sí sola **no** da bonificaciones. La función pura warlockWeaponProfile únicamente aplica la competencia y la opción de usar Carisma cuando la invocación corresponde, la identidad del arma coincide **y está equipada**. El jugador puede preferir Fuerza/Destreza, y el tipo de daño alternativo permanece como decisión manual. El arma conjurada se puede registrar en Equipo cuando se materializa; no se simula una creación física automática.
5. **Descarga sobrenatural**: tarjeta propia junto a los ataques con armas dentro de Principal. Aparece aunque no se haya elegido el truco, pero los botones se deshabilitan si no se conoce. Ataque mágico a distancia por cada rayo y 1d10 de fuerza por impacto; selección manual de objetivos, resultado y crítico. Preparada la fórmula del número de rayos en niveles de personaje 5/11/17; en esta entrega solo puede jugarse nivel 1.
6. **Pacto de la Cadena / Compañeros**: nueva pestaña común en las tres clases. Mago y Guerrero muestran un estado vacío explícito; Brujo de la Cadena permite escoger forma de familiar y nombre, persistidos como estado de partida. Se incluyen formas especiales y normales. El familiar puede ser convocado sin ranura, pero su bloque de criatura, PG, iniciativa y ataques aún requieren integración específica; el jugador consulta el bloque oficial. No se simulan turnos ni ataques automáticos.
7. **Pacto del Tomo**: tres trucos y dos rituales de nivel 1 con selector y marca manual de que se lleva el libro. Las opciones disponibles en el paso 66 proceden de fichas ya implementadas, principalmente del Mago. El reglamento permite escoger entre todas las listas: ampliar ese subconjunto se registra como trabajo pendiente, sin afirmar cobertura completa.
8. **Conjuros compartidos**: warlock-spells.ts apunta por ID a las **mismas instancias de fichas** de wizard-spell-details.ts para todos los hechizos coincidentes. Solo se crean fichas nuevas para Descarga sobrenatural, Armadura de Agathys, Brazos de Hadar, Perdición, Reprensión infernal, Maleficio y Hablar con los animales. La lista completa disponible en esta fase tiene 12 trucos y 15 conjuros de nivel 1.
9. **Estado activo y pasivo**: el motor calcula puntuaciones, competencias, CA y ataques. El jugador marca ranura gastada, PG, inspiración, Armadura de mago activa, libro presente y familiar. Los descansos se confirman explícitamente. Las tiradas nunca consumen ranuras ni ejecutan daño sobre objetivos automáticamente.
10. **Persistencia y galería**: schemaVersion 4 para Brujo, 3 para Mago y 2 para Guerrero. POST, GET, PUT, selector de clase de la galería y validador compartido reconocen el nuevo formato. La columna characterClass del esquema Prisma es texto; no requiere migración SQL.

## Componentes y separación de responsabilidades

| Capa | Responsabilidad | Archivos principales |
| --- | --- | --- |
| Motor | Validar elecciones, calcular hoja y ataque de pacto; state de magia y familiar; snapshot v4 | warlock.ts |
| Catálogo | Reutilizar reglas del Mago por referencia, extender exclusivas del Brujo | warlock-spells.ts |
| Equipo | Paquete inicial PHB 2024, procedencia y acciones de inventario común | warlock-inventory.ts, background-equipment.ts |
| UI de clase | Creación inicial, Principal, Rasgos, Hechizos, Equipo y Personaje | apps/web/src/app/warlock/page.tsx |
| Acciones de juego | Armas equipadas y módulo especializado Descarga sobrenatural | WarlockAttacks.tsx |
| Compañeros | Formas y registro de familiar, sin automatizar acciones de criaturas | WarlockCompanionsPanel.tsx |
| Hoja común | Siete pestañas; estado vacío para otras clases | CharacterTabs.tsx, pages de Guerrero y Mago, globals.css |
| API / galería | Validación, lectura, escritura y navegación para clase warlock | characters-api.ts, rutas API, load/page.tsx, character-card.ts |

## Verificaciones automatizadas y límites de entorno

Se incorpora warlock-level-1-66.test.ts con casos sobre: atributos y equipo inicial, catálogo compartido, arma de pacto equipada y no equipada, restricciones de nivel e invocaciones, familiar de la Cadena, Armadura de sombras, Tomo, descansos y guardado de versión 4. Ejecutar desde la raíz del monorepo **después de descomprimir**:

- pnpm --filter @dnd/rules-engine test
- pnpm --filter @dnd/web build (o pnpm build, según los scripts raíz del monorepo)

La copia de trabajo con que se ha generado esta actualización es parcial, sin manifest ni dependencias de PNPM, y no dispone de PostgreSQL. La validación de extremo a extremo, el chequeo TypeScript del monorepo y la integración de navegador deben ejecutarse en la copia local completa. No afirmar que han pasado sin ejecutarlos.

## Matriz de aceptación manual

| Código | Operación | Resultado esperado |
| --- | --- | --- |
| B01 | Abrir /create | Tercera tarjeta «Brujo» con enlace a /warlock |
| B02 | Crear Brujo con nombre, rasgos y puntuaciones válidas | Principal muestra PG d8, salvaciones Sabiduría y Carisma, Carisma de conjuro y CA de cuero |
| B03 | Entrar en Principal con Descarga sobrenatural aprendida | Módulo junto a armas; botón «Lanzar rayo» devuelve d20 + ataque mágico y botón de daño devuelve 1d10 de fuerza |
| B04 | Quitar Descarga sobrenatural en el editor | Módulo queda visible, pero sus tiradas están desactivadas; otro truco sigue disponible |
| B05 | Elegir Pacto de la Hoja, elegir Hoz sin equiparla | Rasgos indica «equipar para aplicar»; no aparece bonificación del pacto en ataque |
| B06 | Equipar Hoz en Equipo y volver a Principal | Ataque de Hoz marcado Pacto activo con opción Carisma; al desequiparla desaparecen estos beneficios |
| B07 | Elegir Pacto de la Cadena | Compañeros permite registrar un Diablillo, nombre y cambios de forma; sin consumo automático de ranura |
| B08 | Abrir Compañeros con Guerrero y Mago | Pestaña visible y vacía, sin error de React ni cambios en las demás |
| B09 | Elegir Armadura de sombras; quitar cuero; activar conjuro desde Rasgos | CA pasa de 10 + DES a 13 + DES; al volver a equipar cuero se usa su propia CA |
| B10 | Elegir Pacto del Tomo; completar elecciones y marcar libro presente | Trucos y rituales del libro aparecen en Hechizos; al ocultar el libro, dejan de estar accesibles |
| B11 | Seleccionar «Hechizar persona» y «Maleficio» | Ambas fichas aparecen; la primera reutiliza la ficha del Mago, la segunda es específica |
| B12 | Gastar ranura, pulsar descanso corto | Ranura vuelve; los PG actuales y temporales no cambian |
| B13 | Gastar ranura y bajar PG, pulsar descanso largo | PG normales y ranura se recuperan, PG temporales se limpian; el familiar no se invoca solo |
| B14 | Guardar Brujo, refrescar F5, abrir desde /load | URL conserva ?character=ID; se recuperan nivel, invocación, arma vinculada, familiar y ranura |
| B15 | Abrir Guerrero 20 / Mago 20 preexistentes | Guardados y hoja mantienen su clase y progresión, con nueva pestaña Compañeros |
| B16 | Intentar seleccionar invocación de nivel 2 mediante datos adulterados | El validador del servidor rechaza la selección |

## Próximo paso previsto — 67

**Brujo nivel 2**, ya con el diálogo de subida de nivel para aprender nuevas invocaciones y sustituir exactamente una por otra elegible, además de la característica Astucia mágica y la progresión de Magia de Pacto. Debe preservar y validar las elecciones realizadas a nivel 1, sus vínculos con arma/familiar/Tomo y sus efectos sobre los valores calculados. Después, **nivel 3 — Patrón Infernal**, que incorporará sus rasgos y conjuros concedidos.

## Continuidad del TFG y procedencia

Decisiones justificables: separación de cálculo determinista y actos del jugador; extensión polimórfica sin duplicar la hoja; identidad de catálogo compartido por ID; versión de snapshot para compatibilidad histórica; control de prerrequisitos; recursos de descanso corto distintos del lanzador tradicional. Anotar en memoria del TFG los resultados de la tabla B01–B16, fecha, sistema, capturas y cualquier incidencia antes de continuar.

Referencia normativa: Manual del Jugador D&D 2024, capítulo de clases (Brujo: rasgos, invocaciones y lista de conjuros) y equipo. Consulta de acceso público: https://www.dndbeyond.com/sources/dnd/br-2024/character-classes . Todos los resúmenes implementados son redacción propia; consultar el manual para reglas completas, excepciones, bloques de familiar y licencias.
