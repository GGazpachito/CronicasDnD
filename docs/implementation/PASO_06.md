# Paso 06. Proyección integrada de Guerrero (niveles 1-3)

## Objetivo

Unificar los módulos de `abilities`, `proficiencies`, `effects`, `modifiers`, `defense` y `resources` en una función pura `calculateFighterSheet`.

## Instalación

Copiar las carpetas `packages` y `docs` sobre el repositorio existente. Únicamente se reemplaza `packages/rules-engine/src/index.ts`; se añaden `sheet.ts` y `sheet.test.ts`.

Ejecutar desde la raíz:

```powershell
pnpm test
pnpm build
```

## Contrato

`calculateFighterSheet(input: FighterCharacterInput): CalculatedFighterSheet`

- Solo reglas `dnd-2024`, Guerrero niveles 1 a 3 y Campeón a nivel 3.
- Recibe características base, competencias ya seleccionadas, efectos simples, modificadores, progresión de PG, equipo y estado opcional persistido.
- Calcula características finales, habilidades, salvaciones, iniciativa, CA, PG máximos y actuales, recursos y rasgos disponibles.
- Añade automáticamente ventaja en iniciativa y Atletismo al Campeón de nivel 3 y desventaja en Sigilo por armaduras correspondientes.
- Si no recibe `state`, crea un estado *de presentación* inicial con PG y recursos completos. **No lo guarda**.
- Si recibe `state`, comprueba su integridad y **no** cambia usos ni PG actuales.
- Un cambio en PG máximos de un personaje persistido requiere una operación explícita (p. ej. subida de nivel o cambio de Constitución); se rechaza el recálculo discordante.

## Fuera de alcance, expresamente

- No valida todavía que el personaje haya elegido legalmente todas las competencias, trasfondo, estilo de combate, maestrías y equipo inicial. `baseProficiencies` son elecciones ya validadas por una capa futura.
- Las opciones de Campeón que dependen de un golpe crítico, así como el sistema de ataques, todavía no se resuelven en esta proyección.
- No gestiona dados de golpe gastados, progresión de otras clases, multiclase, hechizos, PG temporales, inventario, persistencia ni autenticación.
- `features` enumera rasgos desbloqueados; **no** indica que todos sus efectos estén completamente automatizados.
- Los efectos declarativos simples y los modificadores avanzados son dos colecciones distintas, conforme a los pasos anteriores.
- El SRD y el PHB sirven como referencias; no se incorporan textos extensos ni ilustraciones del manual.

## Archivo de ejemplo

```ts
import { calculateFighterSheet } from '@dnd/rules-engine';
const sheet = calculateFighterSheet({
  id: 'demo-1', name: 'Aldric', ruleset: 'dnd-2024', fighterLevel: 2,
  baseAbilities: { strength:16, dexterity:14, constitution:14, intelligence:10, wisdom:12, charisma:8 },
  baseProficiencies: { skills:['athletics','perception'], savingThrows:['strength','constitution'] },
  hpMethod: 'fixed', equipment: { armor:'chain_mail', shieldEquipped:true, shieldTrained:true },
});
console.log(sheet.maximumHitPoints); // 20
console.log(sheet.armorClass); // 18
```

## Próximo paso

Conectar esta proyección con una interfaz web local de lectura, sin base de datos, para validar el flujo antes de persistir personajes en PostgreSQL.
