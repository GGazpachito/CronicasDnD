# Caso de referencia 001: Guerrero 2024, niveles 1 a 3

**Estado:** Especificación funcional v0.1, para revisión y posterior implementación.  
**Fuente primaria:** *Player's Handbook* (2024), capítulo 3, páginas impresas 90-92 y 96; capítulo 2 para creación de personaje; capítulo 6 para equipo y armas.  
**Fuente complementaria:** SRD 5.2.1 (contenido sujeto a su propia licencia).  
**Objetivo:** definir datos, decisiones y cálculos del primer personaje de pruebas, sin copiar descripciones extensas del manual.

> Nota de alcance: se analiza un **Guerrero creado como clase inicial y sin multiclase**, de niveles 1 a 3, con **Campeón** como primera subclase automatizada. Otras tres subclases del manual se incorporarán posteriormente. Las páginas citadas son las impresas en el libro: en el PDF cargado, las páginas impresas 91, 92 y 96 corresponden aproximadamente a las páginas 90, 91 y 95 del archivo.

## 1. Rasgos y competencias iniciales

| Campo | Regla / decisión | Comportamiento del programa |
|---|---|---|
| Característica principal | Fuerza o Destreza | Sugerir, no imponer |
| Dado de golpe | d10 por nivel de Guerrero | Registrar tipo y cantidad de dados |
| Salvaciones competentes | Fuerza y Constitución | Aplicar competencia una sola vez |
| Habilidades iniciales | Elegir 2 distintas entre Acrobacias, Trato con animales, Atletismo, Historia, Perspicacia, Intimidación, Persuasión, Percepción, Supervivencia | Validar opciones y duplicados; si una elección ya está concedida por otra fuente, tratar según la regla de sustitución pertinente |
| Armas competentes | Sencillas y marciales | Aplicar competencia a tiradas de ataque pertinentes |
| Entrenamiento de armadura | Ligera, media, pesada y escudos | Habilitar cálculos y advertencias de equipo |
| Equipamiento inicial | Tres alternativas: lote A, lote B o 155 po | Registrar elección y cantidades; no conceder simultáneamente las tres |

### Equipo de Guerrero al nivel 1 (resumen estructurado)

- **A:** cota de malla, espadón, mangual, 8 jabalinas, equipo de exploración de mazmorras y 4 po.
- **B:** armadura de cuero tachonado, cimitarra, espada corta, arco largo, 20 flechas, carcaj, equipo de exploración de mazmorras y 11 po.
- **C:** 155 po.

Los equipos de trasfondo se seleccionan adicionalmente según la opción de origen y deben almacenarse como elecciones separadas.

## 2. Tabla de progresión inicial

| Nivel de Guerrero | Bonif. de competencia | Usos máximos de Segundo aliento | Maestrías de armas conocidas | Nuevos rasgos |
|---:|---:|---:|---:|---|
| 1 | +2 | 2 | 3 | Estilo de combate, Segundo aliento, Maestría de armas |
| 2 | +2 | 2 | 3 | Acción súbita, Mente táctica |
| 3 | +2 | 2 | 3 | Subclase de Guerrero; para este caso, Campeón |

**No se recibe Ataque adicional a nivel 3**: el Guerrero obtiene esa característica por primera vez a nivel 5.

### Nivel 1: Estilo de combate

- El personaje elige **una dote de estilo de combate** para la cual cumpla los requisitos.
- Al ganar **otro nivel de Guerrero**, puede cambiar la dote elegida por otra dote de estilo de combate.
- Se almacenan tanto la elección como su fuente y nivel de adquisición. Los efectos concretos se obtienen de la definición de la dote seleccionada, no se codifican dentro de la clase.

### Nivel 1: Segundo aliento

- **Activación:** acción adicional.
- **Curación:** `1d10 + nivel_de_guerrero`, limitada por los PG máximos.
- **Usos máximos en niveles 1–3:** 2.
- **Descanso corto:** recupera 1 uso gastado, sin exceder el máximo.
- **Descanso largo:** recupera todos los usos.
- Se guarda `usos_actuales` independientemente del valor máximo calculado.

### Nivel 1: Maestría de armas

- Seleccionar **3 tipos de arma** sencillos o marciales, sin duplicados.
- Permite usar sus propiedades de maestría cuando proceda.
- Al terminar un descanso largo se puede cambiar **una** de las selecciones.
- Guardar los identificadores de tipos de arma, no de objetos físicos del inventario.

### Nivel 2: Acción súbita (*Action Surge*)

- Permite tomar **una acción adicional** en el turno, **excepto la acción Magia**.
- **Un uso** disponible por descanso corto o largo en niveles 2–3.
- Es un recurso distinto de Segundo aliento.

### Nivel 2: Mente táctica (*Tactical Mind*)

- Ante una prueba de característica fallida, se puede intentar añadir **1d10** al resultado gastando potencialmente un uso de Segundo aliento.
- Si el nuevo resultado convierte la prueba en éxito, se gasta el uso.
- Si sigue fallando, **no se gasta**.
- El motor debe conocer la CD y el resultado original para resolver el gasto automáticamente; si no los conoce, el usuario confirmará el resultado.

### Nivel 3: Campeón

Se desbloquea la selección de subclase de Guerrero; en este primer caso se implementa Campeón.

**Crítico mejorado (*Improved Critical*):** los ataques con armas y los golpes desarmados consiguen crítico con un resultado natural de **19 o 20**. No implica un acierto automático con otros resultados distintos del 20: se debe evaluar la regla específica del crítico.

**Atleta extraordinario (*Remarkable Athlete*):** ventaja en las tiradas de iniciativa y en las pruebas de Fuerza (Atletismo). Además, inmediatamente después de conseguir un crítico, puede desplazarse hasta la mitad de su velocidad sin provocar ataques de oportunidad.

En el primer prototipo, la aplicación debe indicar el movimiento especial como **efecto disponible tras un evento**, sin pretender controlar un tablero de combate.

## 3. Datos persistentes y calculados

**Guardar como estado/elecciones:** clase y niveles, subclase, estilo de combate elegido, tres armas de maestría, conjunto de equipo inicial, PG actuales, usos gastados de Segundo aliento y Acción súbita, tiradas o política de aumento de PG por nivel, fuente/versión de cada contenido.

**Calcular al mostrar la hoja:** bonificador de competencia, PG máximos, atributos y salvaciones derivados, habilidades, CA según fórmula elegida y equipo, ataques, daño, rasgos disponibles, máximos de recursos, ventaja en iniciativa/Atletismo y rango de crítico pertinente.

**Separar del estado calculado:** eventos transitorios como «acabo de conseguir un crítico», «he terminado un descanso corto» y «acabo de fallar una prueba».

## 4. Casos de prueba reproducibles

Para que los resultados sean exactos, utilizar el siguiente **personaje de laboratorio**, con los valores **finales** de características ya aplicados todos los efectos del trasfondo y especie:

- Guerrero, clase inicial; Fuerza **16** (+3), Destreza **12** (+1), Constitución **14** (+2), Inteligencia **10** (+0), Sabiduría **10** (+0), Carisma **8** (-1).
- Ninguna dote, objeto o condición adicional modifica estadísticas en estos ejemplos; no se aplican efectos mecánicos de estilo de combate al ataque comprobado.
- Se usa **incremento fijo de PG** para niveles posteriores al primero, a razón de 6 + modificador de Constitución por nivel adicional, con Constitución constante.
- Armadura de **cota de malla** (CA base 16), sin escudo ni efectos mágicos.
- Ataque de **espadón** con Fuerza y competencia, sin bonificadores adicionales.

| Caso | Situación | Resultado esperado |
|---|---|---|
| T01 | Nivel 1, competencia | +2 |
| T02 | Nivel 1, PG máximos | `10 + 2 = 12` |
| T03 | Nivel 2, PG máximos con incremento fijo | `12 + (6 + 2) = 20` |
| T04 | Nivel 3, PG máximos con incremento fijo | `20 + (6 + 2) = 28` |
| T05 | Salvación de Fuerza | `+3 + 2 = +5` |
| T06 | Salvación de Constitución | `+2 + 2 = +4` |
| T07 | Ataque con espadón | `+3 + 2 = +5` al ataque; daño `2d6 + 3` cortante |
| T08 | CA con cota de malla y sin escudo | 16 |
| T09 | Iniciativa sin efectos adicionales, nivel 1 | +1, sin ventaja |
| T10 | Segundo aliento a nivel 1, tirada de d10 = 6 | Curación potencial de 7 PG, limitada por el máximo, y consume un uso |
| T11 | Descanso corto con Segundo aliento en 0/2 | Pasa a 1/2 |
| T12 | Descanso corto con Segundo aliento en 2/2 | Sigue en 2/2 |
| T13 | Acción súbita a nivel 2, después de gastarse | 0 usos hasta descanso corto/largo; no permite la acción Magia extra |
| T14 | Mente táctica: prueba total 11, CD 15 y d10 = 4 | Éxito; consume un uso de Segundo aliento |
| T15 | Mente táctica: prueba total 11, CD 15 y d10 = 3 | Sigue fallando; no consume un uso |
| T16 | Guerrero Campeón nivel 3: ataque de arma con d20 natural 19 | Crítico; condición de movimiento especial disponible |
| T17 | Guerrero Campeón nivel 3: iniciativa | Modificador +1 y ventaja |
| T18 | Guerrero Campeón nivel 3: Atletismo competente | +5 y ventaja |
| T19 | Guerrero nivel 3 sin Campeón, ataque natural 19 | No se considera crítico por la característica del Campeón |
| T20 | Intentar elegir cuatro maestrías a nivel 1 | Rechazar elección: máximo 3 |

**Importante para T16:** el alcance del crítico se limita a ataques con armas y golpes desarmados; no se extiende indiscriminadamente a ataques de conjuro.

## 5. Pruebas de interfaz y validación

- No permitir seleccionar subclase antes del nivel 3 por la progresión ordinaria del Guerrero 2024.
- A nivel 3, marcar la subclase como una elección pendiente hasta que el jugador la confirme.
- Mostrar el origen de cada bonificador (característica, competencia, armadura, rasgo, estilo, etc.).
- No duplicar una competencia cuando varias fuentes la conceden.
- Conservar los usos actuales al recalcular estadísticas o cambiar de pantalla.
- Nunca superar máximos de PG ni de usos de recursos.
- Permitir volver del nivel 3 al nivel 2 únicamente mediante una operación explícita que gestione la retirada de la subclase y sus efectos.
- Registrar decisiones importantes para facilitar historial y restauración futura.

## 6. Campos y operaciones que el motor necesita soportar

**Operaciones:** `grant_proficiency`, `grant_feat_choice`, `grant_weapon_mastery_choice`, `grant_subclass_choice`, `heal_formula`, `consume_resource`, `restore_resource`, `grant_advantage`, `set_critical_range`, `conditional_movement`, `additional_action_restriction`, `test_result_adjustment`.

**Eventos:** `short_rest_completed`, `long_rest_completed`, `ability_check_failed`, `critical_hit_scored`, `fighter_level_gained`.

Las operaciones son nombres de **contrato conceptual**, no una API cerrada ni código implementado. Debemos definir su semántica, validación y pruebas antes de incorporarlas.

## 7. Cuestiones que se deben resolver antes de codificar

1. Qué dotes de estilo de combate estará habilitado para escoger el usuario en M1 y cuáles se automatizarán primero.
2. Cómo manejar las sustituciones de competencia cuando un origen y una clase conceden la misma habilidad.
3. Qué forma de aumento de PG se ofrece: incremento fijo, tirada o ambas (registrando el resultado de cada nivel).
4. Cómo representar la maestría del arma independientemente de la posesión física del arma.
5. Qué acciones temporales requieren confirmación del usuario en lugar de cálculos automáticos.
6. Qué metadatos de fuente y licencia acompañan cada definición usada por la aplicación.

## 8. Criterio de aceptación de este caso de referencia

El caso de Guerrero 1–3 estará listo para implementación cuando:

- [ ] Todos los elementos seleccionables estén identificados por IDs y fuente.
- [ ] Los veinte casos T01–T20 estén definidos en pruebas ejecutables.
- [ ] Se haya elegido el tratamiento de los puntos pendientes de la sección 7.
- [ ] La interfaz pueda explicar las elecciones que faltan y los modificadores aplicados.
- [ ] Las reglas implementadas estén verificadas contra las páginas citadas del manual.

**Siguiente paso:** diseñar contratos JSON/TypeScript y modelo relacional mínimo a partir de este caso de referencia. No importar todavía todo el catálogo del manual.
