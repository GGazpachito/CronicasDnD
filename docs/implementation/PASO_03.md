# Paso 03: modificadores numéricos y ventaja/desventaja

## Alcance

Este paso introduce un nuevo módulo independiente (`src/modifiers.ts`), sin modificar el comportamiento de `src/effects.ts` de la actualización 02.

- `parseAdvancedModifier(unknown)` acepta únicamente objetos con campos previstos; no ejecuta expresiones ni código.
- `resolveNumericModifiers(base, target, effects, context)` resuelve operaciones `add` y `replace_base`.
- `resolveRollMode(target, effects, context)` devuelve `normal`, `advantage` o `disadvantage` y la procedencia de las fuentes.
- Se mantienen las condiciones `always` y `class_level_at_least`.
- El resultado es calculado sin modificar los datos originales.

## Semántica explícita

- **Grupo `sum`**: suma sus efectos; úsese solamente cuando esa combinación se permita según la regla concreta.
- **Grupo `highest`**: elige el valor más alto del grupo.
- **Grupo `lowest`**: elige el valor más bajo del grupo.
- **`replace_base`**: elige el reemplazo de mayor prioridad y después aplica los modificadores aditivos. Empate de prioridad con valores diferentes: error, nunca resultado arbitrario.
- **Ventaja/desventaja**: múltiples fuentes iguales no aumentan la cantidad de dados; tener ambas produce tirada normal.

**Importante:** la prioridad y la política de grupos se definen conforme a las reglas reales de cada efecto. No son reglas genéricas de acumulación de todos los modificadores de D&D. Los cálculos alternativos de CA y otras excepciones requieren un modelado específico en pasos posteriores.

## Ejemplo de efecto de ventaja en iniciativa

```json
{
  "type": "roll_mode",
  "effectId": "initiative_advantage",
  "sourceRevisionId": "feat:example@1",
  "target": "initiative",
  "when": { "type": "always" },
  "mode": "advantage"
}
```

## Instalación en Windows

1. Descomprime `actualizacion-motor-03.zip`.
2. Copia `packages` y `docs` dentro de la raíz de `dnd-character-builder`, combinando carpetas.
3. Reemplaza `packages/rules-engine/src/index.ts` cuando lo solicite Windows. No elimines `abilities.ts`, `proficiencies.ts` ni `effects.ts`.
4. Abre la terminal de VS Code y ejecuta `pnpm test` y `pnpm build`.
5. Solo después de comprobar las pruebas, confirma y sube los cambios con Git.

## Limitaciones y siguientes pasos

Todavía no hay cálculo de CA, daño, PG ni acciones de combate. Los modificadores de esta fase no se aplican automáticamente sobre la salida de `applyMechanicalEffects`; su integración con una hoja de personaje unificada será un paso posterior. El motor tampoco interpreta arbitrariamente un texto de una dote; requiere datos declarativos validados.
