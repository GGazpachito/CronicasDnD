# Contratos del motor de reglas v0.1 — D&D Character Builder

**Estado:** diseño técnico, no implementado.  
**Edición inicial:** `dnd-2024`; compatible a futuro con `dnd-2014` mediante un paquete de reglas distinto.  
**Casos de referencia:** `docs/requisitos/GUERRERO_NIVELES_1_3.md`, `docs/architecture/MODELO_DATOS_V01.md`.  
**Fuentes de consulta:** *Player's Handbook* 2024 aportado al proyecto y SRD 5.2.1. No reproducir el texto íntegro del manual en el repositorio.

## 1. Objetivo y límites

Crear un motor **determinista, puro y sin dependencias de Next.js o Prisma**. Recibe un estado base de personaje, referencias a revisiones de contenido, elecciones del jugador y contexto opcional; devuelve una hoja calculada, explicaciones, decisiones pendientes, advertencias y errores. El motor no lee ni escribe en la base de datos ni ejecuta scripts suministrados por usuarios.

**M1:** Guerrero nivel 1, creación y cálculo. **M2:** niveles 2–3 y Campeón. Fuera de alcance inicial: multiclase, todas las subclases, automatización de tablero, resolución automática de todas las excepciones y ejecución libre de fórmulas homebrew.

## 2. Separación de responsabilidades

| Capa | Responsabilidad | Ejemplo |
|---|---|---|
| Catálogo de reglas | Definiciones revisadas e inmutables | Clase Guerrero, rasgo Segundo aliento |
| Elecciones | Decisiones explícitas del jugador | Estilo, tres armas de maestría |
| Estado mutable | Recursos y condiciones actuales | PG actuales, usos de Segundo aliento |
| Contexto temporal | Circunstancias aportadas en una acción | Resultado natural del d20, CD, tirada de d10 |
| Motor | Validar, obtener efectos, resolver estadísticas | CA final, competencias, recursos máximos |
| Backend | Autorización, transacciones y guardado | Confirmar descanso corto una sola vez |

**Regla principal:** calcular una hoja no puede curar al personaje, gastar recursos ni confirmar elecciones. Esos cambios requieren comandos explícitos validados.

## 3. Contrato de entrada y salida (esquema conceptual)

```json
{
  "engineSchemaVersion": "0.1.0",
  "ruleset": "dnd-2024",
  "character": {
    "id": "character:demo-001",
    "baseAbilities": {"strength": 15, "dexterity": 12, "constitution": 14, "intelligence": 10, "wisdom": 10, "charisma": 8},
    "classLevels": [{"classRevisionId": "class:fighter@2024-r1", "classLevel": 1, "takenAtCharacterLevel": 1}],
    "choices": [],
    "inventory": [],
    "state": {"currentHp": 12, "temporaryHp": 0, "resources": {"second-wind": 2}}
  },
  "catalog": {"revisions": []},
  "context": {}
}
```

El ejemplo ilustra la *forma* del contrato; está **incompleto como personaje válido**: faltan las elecciones de origen, características y equipo. Las referencias incluidas en `catalog.revisions` deben resolverse antes de calcular.

Salida de evaluación:

```json
{
  "status": "incomplete",
  "sheet": {"abilityScores": {}, "proficiencies": [], "armorClass": null, "maxHitPoints": null},
  "explanations": [],
  "pendingChoices": [{"key": "species", "reason": "required"}],
  "warnings": [],
  "errors": []
}
```

`status` admite `valid`, `incomplete` e `invalid`. Si un valor no puede calcularse, se devuelve `null` y una razón; **nunca** se inventa un valor por defecto silencioso. Las explicaciones incluyen `target`, `value`, `originRevisionId`, `effectId`, y, cuando proceda, `formula`.

## 4. Identidad y tipado

- Cada definición: `definitionId` estable, `revisionId` inmutable, `ruleset`, `contentType`, `sourceId`, `schemaVersion`.
- Cada efecto: `effectId` estable dentro de la revisión, `type`, `target`, `params`, `when`, `sourceRevisionId`.
- Referencias cruzadas por `revisionId`, no por nombre mostrado.
- Un contenido original del PHB y uno del SRD **no se fusionan automáticamente** si no se ha demostrado su equivalencia.
- Los nombres visibles son traducibles, pero los identificadores técnicos permanecen estables.
- Las revisiones antiguas se conservan si existen personajes que las utilizan.

## 5. Catálogo inicial de operaciones declarativas

Las operaciones se validarán con discriminantes estrictos (`type`) y esquemas Zod. Los `target` no serán rutas arbitrarias de objetos: se eligen de un registro de estadísticas permitido.

| Operación | Parámetros esenciales | Política |
|---|---|---|
| `grant_proficiency` | `kind`, `id` | Conjunto sin duplicados; no suma dos veces |
| `grant_expertise` | `skillId` | Multiplica competencia según reglas aplicables; requiere validación |
| `ability_increase` | `ability`, `amount`, `cap` | Se añade con límite indicado |
| `grant_choice` | `choiceKey`, `options`, `count` | Crea obligación de elegir; nunca autoselecciona |
| `grant_feature` | `featureRevisionId` | Activa otro rasgo versionado |
| `grant_advantage` | `checkSelector` | Ventaja no acumulativa |
| `grant_disadvantage` | `checkSelector` | Desventaja no acumulativa; cancela ventaja |
| `register_ac_formula` | `formulaId`, `expressionId`, `eligibility` | Fórmula alternativa; elegir una, no sumarlas |
| `add_numeric_bonus` | `statId`, `amount`, `stackGroup` | Suma solo conforme a su política de grupo |
| `set_minimum` / `set_maximum` | `statId`, `value` | Acota resultado en fase explícita |
| `register_resource` | `resourceKey`, `maxFormulaId`, `recoveryPolicyId` | Define máximos y recuperación, no cambia uso actual |
| `set_critical_threshold` | `attackSelector`, `minNaturalRoll` | Afecta al umbral crítico en ataques elegibles |
| `grant_action_option` | `actionId`, `restrictions` | Presenta acción legal, no la ejecuta |
| `grant_conditional_option` | `trigger`, `optionId` | Opción disponible ante evento conocido |

**Postergadas al implementarlas:** fórmulas curativas, modificación de resultados de una prueba, maestrías de armas y movimiento tras crítico. En v0.1 sus entradas se representan como opciones/comandos con identificadores conocidos, sin inventar un lenguaje universal de expresiones.

### Ejemplo A: competencia de salvación

```json
{
  "effectId": "fighter-saving-throw-strength",
  "type": "grant_proficiency",
  "target": "saving_throw:strength",
  "params": {"kind": "saving_throw", "id": "strength"},
  "when": {"type": "always"},
  "sourceRevisionId": "class:fighter@2024-r1"
}
```

### Ejemplo B: ventaja condicional del Campeón

```json
{
  "effectId": "champion-athletics-advantage",
  "type": "grant_advantage",
  "target": "check:strength:athletics",
  "params": {"checkSelector": {"ability": "strength", "skill": "athletics"}},
  "when": {"type": "class_level_at_least", "classId": "class:fighter", "value": 3},
  "sourceRevisionId": "subclass:champion@2024-r1"
}
```

Ejemplos ilustrativos del formato, no una copia textual de la fuente ni un catálogo ya validado.

## 6. Lenguaje limitado de condiciones

**Permitidas inicialmente:** `always`, `all`, `any`, `not`, `class_level_at_least`, `character_level_at_least`, `has_equipped_item`, `has_choice`, `has_condition`, `resource_at_least`. Su evaluación solo consulta valores conocidos del personaje/contexto. Las condiciones de entorno o enemigo que no estén presentes devuelven `unknown`, no `false`.

**Resultado ternario:** `true`, `false`, `unknown`. Si falta información indispensable, el efecto queda pendiente y se explica el motivo.

**Límites de seguridad propuestos (ajustables por medición):** árbol de condición con profundidad máxima 8; máximo 100 nodos por condición; máximo 500 efectos aplicables por evaluación de personaje. Rechazar claves desconocidas, referencias inexistentes, tipos incompatibles y entradas de tamaño excesivo. No admitir `eval`, JavaScript embebido, llamadas de red ni expresiones proporcionadas como código ejecutable.

## 7. Orden de cálculo y conflictos

Secuencia del pipeline:

1. Validar `schemaVersion`, `ruleset`, referencias y permisos de catálogo (los permisos los comprueba además el backend).
2. Construir fuentes de efectos desde clase, especie, trasfondo, elecciones, equipo y condiciones.
3. Comprobar prerrequisitos y elecciones pendientes.
4. Aplicar mejoras de características y obtener puntuaciones finales.
5. Calcular nivel total, competencia y demás estadísticas base.
6. Resolver concesiones de competencias/pericia, ventajas y desventajas.
7. Resolver fórmulas alternativas (CA, ataques) y bonificadores compatibles.
8. Calcular máximos de PG/recursos con progresiones específicas.
9. Validar el estado actual contra límites sin corregirlo en silencio.
10. Emitir hoja, desglose por procedencia y diagnósticos.

**Políticas de conflicto:**

- **Competencias:** unión de concesiones, no suma duplicada.
- **Ventaja/desventaja:** cada una actúa como indicador; ambas juntas se cancelan en el contexto de la tirada.
- **CA:** escoger exactamente una fórmula base elegible y después aplicar modificadores que correspondan. Si hay varias, registrar la seleccionada explícitamente o solicitar elección.
- **Bonificadores numéricos:** solo sumar aquellos compatibles según `stackGroup`; cada grupo define una política revisada, no una prioridad genérica.
- **Máximos/mínimos:** aplicar límites en etapas declaradas; si dos reglas se contradicen sin política definida, devolver error de conflicto.
- **Regla específica sobre general:** implementar excepciones explícitas y acotadas; no resolver mediante «gana el último efecto cargado».
- **Revisiones/ediciones:** rechazar contenidos de ediciones incompatibles salvo una regla de compatibilidad explícita.

## 8. Grafo de dependencias

Ejemplo: `strength.score -> strength.modifier -> athletics.total` y `constitution.score -> constitution.modifier -> maxHp`.

M1 puede recalcular toda la hoja para reducir complejidad. El evaluador registrará dependencias para detectar ciclos; un ciclo no soportado provoca `invalid` con identificación de efectos. Nunca iterar indefinidamente intentando alcanzar un punto fijo.

## 9. Comandos para estado mutable: NO son efectos de cálculo

Estructura conceptual: `commandId`, `type`, `characterId`, `expectedRevision`, `payload`, `idempotencyKey` (para evitar gastos duplicados por reintento). El backend autoriza, valida, calcula la transición y persiste todo en una transacción.

| Comando | Precondición | Resultado persistido |
|---|---|---|
| `spend_resource` | Recurso disponible | Disminuye usos; nunca menor que 0 |
| `restore_resource` | Política de recuperación válida | Aumenta usos hasta máximo |
| `heal` | Curación confirmada y valor válido | Aumenta PG actuales hasta máximo |
| `complete_short_rest` | Descanso permitido/confirmado | Aplica recuperaciones correspondientes una sola vez |
| `complete_long_rest` | Descanso permitido/confirmado | Aplica recuperaciones y estados pertinentes |
| `confirm_choice` | Elección disponible y válida | Registra elección versionada |
| `gain_level` | Progresión y decisiones válidas | Añade nivel y rasgos; permite revisar antes |

### Caso especial: Segundo aliento

`use_second_wind` solicita un resultado de d10 (o incorpora un dado lanzado por un módulo de dados confiable), consume un uso y aplica curación de `d10 + nivel de Guerrero`, limitada por PG máximos. Todo sucede como **una transición atómica**. Si no hay usos, se rechaza. El cálculo de la hoja por sí solo no consume nada.

**Mente táctica (nivel 2):** necesita conocer la tirada original, su total, la CD y el d10 adicional. Solo gasta uso de Segundo aliento si el resultado revisado supera o iguala la CD; si no, conserva el uso. Cuando la CD no esté disponible, se solicita confirmación del resultado al jugador/DM, en lugar de adivinar.

**Crítico del Campeón (nivel 3):** el umbral 19–20 solo se aplica a ataques con armas o golpes desarmados, según la definición del rasgo. Las opciones desencadenadas por crítico se presentan al usuario; no se teletransporta una ficha de combate que la aplicación todavía no controla.

## 10. Validación de elecciones

Cada elección define: `choiceKey`, `issuedByRevisionId`, `minCount`, `maxCount`, `eligibleOptions`, `prerequisites`, `replacementPolicy` y `madeAtLevel`. Ejemplos:

- Guerrero de nivel 1: escoger un estilo de combate permitido y tres tipos de armas de maestría distintos.
- La subclase del Guerrero se elige al nivel 3, no antes.
- Si faltan elecciones obligatorias, `status=incomplete` y se especifican `pendingChoices`.
- Las opciones que conceden un elemento ya poseído deben seguir la política concreta aplicable, no permitir duplicados silenciosos.
- La progresión al siguiente nivel se presenta primero como `preview` y únicamente se guarda tras `confirm`.

## 11. Pruebas mínimas de aceptación

| ID | Prueba | Esperado |
|---|---|---|
| E01 | Fuerza 16 | Modificador +3 |
| E02 | Guerrero nivel 1 | Competencia +2 |
| E03 | Guerrero nivel 1, Constitución 14 | PG máximos 12 |
| E04 | Guerrero nivel 3, aumentos fijos y Constitución 14 | PG máximos 28 |
| E05 | Salvación Fuerza 16 competente, nivel 1 | +5 |
| E06 | Doble concesión de competencia en Atletismo | Solo una aplicación del bonificador |
| E07 | Guerrero nivel 1, cuatro armas de maestría elegidas | `invalid`, excede máximo 3 |
| E08 | Subclase Campeón en nivel 2 | `invalid` |
| E09 | CA con cota de malla, sin escudo ni extras | 16 |
| E10 | Segundo aliento en 0 usos | Acción rechazada; estado sin cambio |
| E11 | Segundo aliento 2 usos, se gasta 1 | 1 uso; PG curados hasta máximo |
| E12 | Descanso corto, Segundo aliento 0/2 | 1/2 |
| E13 | Mente táctica: total 11, CD 15, d10 3 | No gasta recurso |
| E14 | Mente táctica: total 11, CD 15, d10 4 | Gasta 1 uso |
| E15 | Campeón nivel 3: ataque de arma, d20 natural 19 | Crítico |
| E16 | Guerrero no Campeón: ataque natural 19 | Sin crítico por rasgo de Campeón |
| E17 | Ventaja y desventaja simultáneas | Tirada neutral |
| E18 | Falta revisión de origen | `invalid` con referencia concreta |
| E19 | Efecto circular | `invalid` con ciclo identificado |
| E20 | Evaluar dos veces misma entrada | Misma salida sin alterar estado |
| E21 | Comando repetido con misma `idempotencyKey` | No duplica consumo de recurso |
| E22 | Falta decisión obligatoria | `incomplete`, no personaje válido completo |

Las pruebas E03–E16 dependen de las precondiciones del personaje de laboratorio especificado en `GUERRERO_NIVELES_1_3.md`. Evitar que resultados de ejemplos descontextualizados se conviertan en reglas generales.

## 12. Seguridad, contenido y licencias

- Solo operaciones declarativas de un registro cerrado; nada de JavaScript ejecutable enviado por usuarios.
- Validación de tamaño, profundidades, referencias, ediciones y permisos.
- El backend nunca confía en cálculos remitidos por el navegador para autorizar un guardado.
- Contenido PHB y contenido SRD conservan `sourceId`, licencia y restricciones propias; la aplicación no debe redistribuir por defecto textos protegidos.
- Todos los cambios de esquemas pasan por una migración; contenido publicado conserva sus revisiones.

## 13. Orden de implementación (siguiente etapa)

1. Crear tipos TypeScript: `Ability`, `Ruleset`, `CharacterInput`, `Effect`, `Diagnostic`, `CalculatedSheet`.
2. Crear validadores Zod de cada discriminante; entradas inválidas se rechazan antes del cálculo.
3. Implementar fórmulas puras de puntuaciones, competencia, salvaciones, habilidades y PG.
4. Implementar la recolección de efectos `grant_proficiency`, `ability_increase` y `grant_choice`.
5. Añadir CA y selección de fórmula, ventajas y desventajas.
6. Añadir recursos/acciones y transición atómica de Segundo aliento.
7. Implementar las pruebas E01–E22 y el personaje de referencia.
8. Solo entonces definir el esquema Prisma físico y las migraciones a partir de los contratos confirmados.

## 14. Criterio para cerrar esta especificación

- Los contratos distinguen definición, elección, estado y resultado.
- Cada operación inicial tiene parámetros y política de acumulación definidos.
- Hay respuesta explícita para entradas incompletas, inválidas y condiciones desconocidas.
- El motor no depende de base de datos ni ejecuta código homebrew.
- Las reglas del Guerrero 1–3 tienen casos de prueba reproducibles.
- Se conserva procedencia y revisión de contenido.

**Pendiente de validación al programar:** Zod real, esquema JSON real, semántica exacta de conflictos entre bonificadores menos frecuentes, traducciones oficiales y cobertura de excepciones complejas. El documento es una propuesta comprobable, no una implementación terminada.
