# Paso 30 · Guerrero 10–11 y Campeón: Guerrero heroico

## Alcance

Se amplía el creador del Guerrero de D&D 2024 desde nivel 9 a **niveles 10 y 11**. Se mantienen los niveles anteriores, la subclase **Campeón** y la progresión mediante flechas de un nivel cada vez. No se implementan otras clases, subclases ni dotes generales en esta actualización.

Reglas contrastadas con el *Player's Handbook* 2024, tabla **Fighter Features** (p. 92 de la numeración impresa, índice PDF 91) y **Champion** (p. 96, índice PDF 95):

- Nivel 10: 4 usos máximos de **Second Wind**, 5 maestrías de armas conocidas, **Heroic Warrior** del Campeón, competencia +4.
- Nivel 11: **Two Extra Attacks**, es decir, 3 ataques mediante una acción Atacar, competencia +4.
- Guerrero heroico: al empezar tu turno **durante el combate**, si no tienes Inspiración heroica, la obtienes. Puedes gastarla para repetir un dado; la nueva tirada es obligatoria. No concederla a otras subclases por el mero nivel.
- En nivel 10 deben elegirse **cinco armas distintas** para Maestría; el quinto desplegable aparece en Equipo al estar en nivel 9. La subida comprueba la elección.
- En nivel 11 no se añaden mejoras de característica ni recursos de clase nuevos.

## Implementación

- `packages/rules-engine/src/{progression,guided,martial,sheet,resources,origin-magic,attacks,turns,combat,adventure,level-up}.ts`: rango de niveles, quinta maestría, nuevos máximos, tres ataques por acción Atacar, Inspiración heroica validada y persistente.
- `apps/web/src/app/page.tsx`: nivel máximo 11 en selector de flechas, quinta maestría, resumen de rasgos y guardado; conserva el mismo mecanismo validado de subir nivel.
- `apps/web/src/components/TurnPanel.tsx`: Guerrero heroico. El turno concede Inspiración solo si la hoja incluye el rasgo del Campeón. Botón para gastar la inspiración; el dado se vuelve a tirar manualmente.
- `apps/web/src/components/AttacksPanel.tsx`: tercera oportunidad automática de Ataque adicional en nivel 11, con contador 0/3, 1/3, 2/3, 3/3.
- `packages/rules-engine/tests/{progression-10-11,level-stepper}.test.ts`: nuevos casos, límite 11 en la navegación y regresión de 9→10→11.

La Inspiración heroica es un dato opcional de `CombatState`, guardado dentro de `AdventureState`, sin cambios en las tablas de Prisma ni en `schemaVersion: 2`. Los nuevos personajes adquieren la estructura cuando usan el panel de turnos. La regla de repetición del dado no se simula: el usuario la resuelve en mesa y confirma el gasto.

**Decisión de diseño:** `startCharacterTurn` recibe la presencia del rasgo `champion_heroic_warrior` y **no** deduce la subclase a partir del nivel. Esto permite ampliar clases posteriormente sin conceder el beneficio erróneamente.

**Limitación actual:** el gestor no conoce las criaturas enemigas ni todos los tipos de acciones especiales. La tercera tirada se registra sobre la misma acción Atacar. Tras agotar los tres ataques, el modo automático propone una nueva acción; solo será válida si existen acciones disponibles (p. ej. Acción súbita).

## Instalar en Windows

1. Combina el contenido del ZIP con la raíz de `DndEditor`; reemplaza los archivos incluidos y conserva los demás.
2. Arranca PostgreSQL con `docker compose up -d` si vas a guardar personajes.
3. Ejecuta, desde la raíz:
   ```powershell
   pnpm test
   pnpm build
   pnpm dev
   ```
4. Abre `http://localhost:3000`.
5. Vitest sigue configurado en `packages/rules-engine/package.json` como `vitest run --maxWorkers=2`. **No** se ha añadido `--minWorkers`.

## Pruebas manuales

1. Crea un Guerrero Campeón, llega a nivel 9, guarda y carga.
2. En **Equipo**, selecciona la quinta maestría antes de subir a nivel 10. Si falta, la flecha debe informar del requisito.
3. Al subir a 10, verifica 4 usos máximos de Segundo aliento y cinco maestrías.
4. En **Tu turno de combate**, inicia un turno: se concede Inspiración heroica. Gástala. En el siguiente turno vuelve a obtenerse. Guardar y cargar debe conservar su estado actual.
5. Sube a nivel 11 y confirma tres ataques con la **misma** acción Atacar: 1/3, 2/3, 3/3. El cuarto sin acción adicional debe bloquearse.
6. Prueba Acción súbita: concede otra acción disponible, de la que pueden salir tres nuevos ataques.
7. Guarda, cierra y carga el personaje nivel 11. Comprueba nivel, recursos, las cinco maestrías y los contadores de la sesión.
8. Comprueba `pnpm test` y `pnpm build` antes de subir a GitHub.

## Verificación local

- Comprobaciones de TypeScript estricto sobre motor, tests y pantallas modificadas.
- Ejecutor local de aserciones sobre la batería del motor. El entorno de desarrollo del asistente no permite ejecutar la instalación real de Next.js/Vitest con las dependencias de `pnpm`; la validación final corresponde al entorno de Windows.
