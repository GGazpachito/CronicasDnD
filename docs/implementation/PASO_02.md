# Paso 02: efectos mecánicos declarativos

## Alcance

Se implementan dos operaciones `ability_increase` y `grant_proficiency`, y dos condiciones `always` y `class_level_at_least`. Son una primera porción de los contratos del motor, no un intérprete universal de D&D. Los efectos se validan sin ejecutar código, y se calculan sobre copias del estado original.

## Archivos

- `packages/rules-engine/src/effects.ts`: parser y evaluador puro.
- `packages/rules-engine/src/index.ts`: añade exportaciones de efectos; conservar `abilities.ts` y `proficiencies.ts` existentes.
- `packages/rules-engine/tests/effects.test.ts`: casos de prueba nuevos.

## Instalación y pruebas (PowerShell en la raíz)

```powershell
pnpm test
pnpm build
```

## Ejemplo JSON

```json
{
  "effectId": "demo-strength",
  "sourceRevisionId": "feat:example@2024-r1",
  "when": { "type": "always" },
  "type": "ability_increase",
  "params": { "ability": "strength", "amount": 1, "cap": 20 }
}
```

## Límites conocidos

- Para este paso, el evaluador soporta únicamente dos operaciones. Las demás definidas en `CONTRATOS_MOTOR_REGLAS_V01.md` siguen pendientes.
- Una condición de clase ausente se trata como nivel 0. No hay todavía estado ternario `unknown` para contexto no proporcionado.
- No se implementa el algoritmo general de acumulación de efectos, ni elección de alternativas, ni reglas de incompatibilidad complejas.
- Si varias mejoras de característica de distintos orígenes aparecen en distinto orden, el límite se aplica secuencialmente. Esto no constituye todavía un motor completo para todas las reglas de puntuación.
- No incluye Zod aún: se utiliza un validador cerrado escrito en TypeScript para no introducir dependencias nuevas durante este primer paso. En el siguiente módulo podremos evaluar una migración a esquemas Zod.
- Un aumento que ya está en el límite se registra como aplicado aunque no cambie el resultado. Se mejorará la explicación posteriormente.
- El motor aún no hace persistencia, autenticación ni comprobaciones de permisos: eso pertenece al backend.

## Control de versiones

```powershell
git add packages/rules-engine/src/index.ts packages/rules-engine/src/effects.ts packages/rules-engine/tests/effects.test.ts docs/implementation/PASO_02.md
git commit -m "feat: añadir efectos declarativos iniciales"
git push
```
