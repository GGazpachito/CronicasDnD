# Actualización 39 · Gestión de PG, inspiración y recursos desde Principal

**Proyecto:** DndEditor · D&D 2024 (5.5)  
**Fecha de preparación:** 12/11/2026  
**Estado:** implementada y verificada parcialmente en un entorno aislado. **Pendientes** los comandos completos `pnpm lint`, `pnpm test`, `pnpm build`, la comprobación manual en el navegador del autor y el commit/push de GitHub.

## 1. Objetivo

Convertir la hoja Principal (fases 37–38) en una zona de juego utilizable para **registrar manualmente** cambios de puntos de golpe, PG temporales, inspiración heroica y recursos del Guerrero sin convertir la aplicación en un videojuego. Todo el estado de partida procede del mismo `AdventureState` ya usado por `PlayPanel`, `TurnPanel`, la persistencia v2 y la página de ataques.

**No se añaden NPC, decisiones automáticas, daño a enemigos, simulación de combate ni disparos automáticos de recursos.** El jugador pulsa un control para cada modificación. La aplicación aplica únicamente las reglas ya implementadas por el motor.

## 2. Funciones implementadas

- **Puntos de golpe:** registrar daño, curación y PG temporales; retirar explícitamente PG temporales cuando un efecto termina; señalar daño crítico si el personaje ya está a 0 PG. Se respetan los máximos, la absorción de daño por PG temporales, las condiciones a 0 PG, la muerte y la concentración gestionadas por `applyAdventureAction`.
- **Segundo aliento:** entrada manual del resultado d10 o botón «Tirar d10»; el botón de uso posterior activa la operación existente `second_wind`. Se gasta el uso y se aplica la curación según reglas. Ningún recurso se consume al tirar el dado.
- **Acción súbita:** se gasta mediante la operación del motor, que ya coordina el estado de turnos cuando corresponda.
- **Indomable:** muestra los usos. Para repetir una salvación fallida se sigue utilizando el módulo de partida completo, que requiere resultado previo, CD y nueva tirada. No se añade un botón de «gastar sin comprobar».
- **Inspiración heroica:** dos botones para anotar y gastar sobre el campo **ya existente** `AdventureState.combat.heroicInspiration`. El Campeón nivel 10 ya dispone de una regla de recuperación al iniciar su turno en `TurnPanel`; ambos módulos consultan exactamente el mismo valor.
- **Estado desincronizado:** si la hoja ya no valida el estado de partida, los controles se deshabilitan. El editor/recuperación anterior sigue disponible.
- **Notificaciones:** cada acción muestra la descripción del motor o un error de validación. Los cambios se guardan en PostgreSQL solo al pulsar «Actualizar guardado» en «Mis personajes», como antes.

## 3. Decisiones arquitectónicas (ADR)

### ADR-030 · No crear un nuevo estado para inspiración

**Decisión:** reutilizar `combat.heroicInspiration`, un booleano opcional ya soportado por `validateCombatState`, `startCharacterTurn`, `spendHeroicInspiration` y guardados v2.

**Alternativa descartada:** añadir `heroicInspiration` también al objeto raíz `AdventureState` o mantenerlo en un hook independiente. Esto habría causado estados contradictorios entre las pestañas y el turno del Campeón.

**Resultado:** no se requieren migraciones Prisma ni cambio de `schemaVersion`; los guardados antiguos sin la propiedad siguen funcionando.

### ADR-031 · Reutilizar transiciones existentes para PG y recursos

**Decisión:** los botones de Principal ejecutan `applyAdventureAction` y entregan el `AdventureState` resultante al `setAdventure` central de `page.tsx`.

**Razón:** evita implementar nuevamente daño, curación, PG temporales, recursos, límites de usos, estados a 0 PG y concentración en React.

**Extensiones acotadas:** `clear_temporary_hp`, `gain_heroic_inspiration` y `spend_heroic_inspiration`, con validación de campos. No sustituyen a acciones previas.

### ADR-032 · Mantener la interacción manual en dos pasos

**Decisión:** el botón «Tirar d10» solo produce un resultado. «Usar Segundo aliento» consume el recurso en otra pulsación. El usuario puede introducir una tirada física y decidir si aplica la capacidad.

**Razón:** una tirada no debe gastar por sí misma un recurso ni imponer una decisión al jugador.

### ADR-033 · Dados uniformes y comprobables

**Decisión:** `dice.ts` introduce `rollDie(sides, draw?)` con `crypto.getRandomValues` y muestreo por rechazo, y un generador inyectable para pruebas deterministas. En esta fase se utiliza para el d10 de Segundo aliento.

**Alcance:** no sustituye todavía `d20.ts` de la fase 38; una unificación de utilidades de dados podría realizarse más adelante sin afectar al comportamiento actual.

### ADR-034 · Estado de sesión único, controles especializados

**Decisión:** `PrincipalSessionControls.tsx` separa interfaz de PG, recursos e inspiración. Estos componentes mantienen únicamente campos temporales del formulario, como «cantidad», «crítico» y «resultado d10». Ninguno almacena PG actuales ni recursos como estado duplicado.

**Razón:** modularidad, pruebas de renderizado y evolución de la hoja Principal sin volver a sobrecargar `page.tsx`.

## 4. Archivos cambiados (exclusivamente estos nueve)

| Ruta | Cambio |
|---|---|
| `apps/web/src/app/page.tsx` | Conexión de la hoja a `setAdventure`; textos de la fase |
| `apps/web/src/components/PrincipalOverview.tsx` | Controlador de acciones, mensajes e inserción de controles |
| `apps/web/src/components/PrincipalSessionControls.tsx` | **Nuevo:** PG, recursos, inspiración y d10 |
| `apps/web/src/app/globals.css` | Diseño accesible y adaptable de los nuevos controles |
| `packages/rules-engine/src/adventure.ts` | Tres nuevas acciones explícitas, validadas y puras |
| `packages/rules-engine/src/dice.ts` | **Nuevo:** generador de dN con Web Crypto |
| `packages/rules-engine/tests/session-controls.test.ts` | **Nuevo:** comprobaciones de sesión, inspiración y guardado |
| `packages/rules-engine/tests/dice.test.ts` | **Nuevo:** rangos y generación de d10 |
| `docs/implementation/PASO_39_GESTION_PG_INSPIRACION_RECURSOS.md` | Memoria técnica de este paso |

**No cambian:** Prisma, modelo SQL, paquete de dependencias, lockfile, sistema de ataques, módulos de turnos, guardado v2 ni pantalla de combate.

## 5. Pruebas efectuadas y limitaciones

- **Chequeo de tipos del proyecto web:** `tsc -p apps/web/tsconfig.check37.json --noEmit` en el árbol de preparación, con TypeScript 5.8.3: **superado**. Este `tsconfig` auxiliar omite API/Prisma generado y no sustituye el `pnpm build` del usuario.
- **Chequeo de tipos de motor, modo estricto:** `tsc --strict --module commonjs --moduleResolution node --target es2022 --skipLibCheck ...`: **superado**.
- **Prueba real de flujo con Node.js sobre módulos de motor transpilados:** cálculo de un Guerrero nivel 10, anotar y gastar inspiración, retirar PG temporales, persistencia v2 y d10 inyectado: **superada**.
- **Renderizado React aislado, sin navegador:** se comprueba hoja válida, inválida y desincronizada; se confirman seis características, 18 habilidades y los nuevos controles. **Superado**.
- **Pruebas Vitest:** archivos de prueba preparados; **no ejecutados** aquí porque faltan dependencias transitivas en el entorno aislado de Vitest.
- **ESLint y build de Next.js completos:** **pendientes** en el equipo del autor, que dispone de las versiones fijadas de TypeScript y ESLint.
- **Pruebas manuales de interacción y persistencia real:** **pendientes**.

No se deben declarar los tests automáticos globales ni el guardado real «verificados» hasta tener registros locales.

## 6. Pruebas de aceptación local

1. Ejecutar desde la raíz del proyecto:
   ```powershell
   pnpm lint
   pnpm test
   pnpm build
   pnpm dev
   ```
2. Abrir `http://localhost:3000` y seleccionar Principal.
3. Con PG completos, introducir daño 7 y pulsar «Registrar daño». Comprobar que bajan 7 PG y el panel antiguo muestra el **mismo** resultado.
4. Curar 4 y comprobar que no se supera el máximo. Activar daño crítico cuando el personaje esté a 0 PG y verificar las salvaciones de muerte en el panel existente.
5. Recibir 8 PG temporales, intentar recibir 3: deben conservarse 8. Aplicar daño 10: primero se gastan 8 temporales y luego 2 normales. Probar «Retirar temporales».
6. Usar «Tirar d10»: debe aparecer un valor entre 1 y 10 **sin** descontar Segundo aliento. Introducir un valor manual y pulsar «Usar Segundo aliento»: se consume un uso y se refleja en ambos paneles.
7. Nivel 2+: gastar Acción súbita y verificar que su contador cambia en la hoja y en herramientas. Comprobar que no se permite gastar sin usos.
8. Nivel 9+: comprobar que Indomable muestra sus usos y dirige al módulo de repetición de salvación.
9. Anotar y gastar Inspiración heroica; guardar personaje, recargarlo y comprobar que el estado se conserva. Confirmar que no es posible gastarla dos veces.
10. Nivel 10 Campeón: desde el panel de turnos, iniciar el turno sin inspiración. Verificar que aparece en Principal; gastarla desde Principal y comprobar que desaparece también del panel de turnos.
11. Cambiar el máximo de PG para provocar desincronización: los nuevos controles deben quedar bloqueados hasta resolverla explícitamente.
12. Comprobar la interfaz en móvil, tabulación del teclado, avisos de estado y ausencia de errores en la consola.

## 7. Limitaciones y trabajo pendiente

- La Inspiración heroica concedida por descansos largos del Humano y la concedida a aliados por Músico todavía no se automatizan. Puede anotarse manualmente.
- Gastar inspiración **no relanza automáticamente** una tirada anterior de otro módulo; el jugador decide cuál y realiza la repetición correspondiente.
- La gestión avanzada de Indomable, descanso corto/largo, Fortaleza y condiciones sigue disponible en el panel antiguo. El acceso rápido no pretende reemplazarlo.
- No se registra automáticamente el daño de otros personajes ni las tiradas de enemigos.
- El guardado en PostgreSQL continúa siendo **manual**. Después de probar controles, hay que pulsar «Actualizar guardado».

## 8. Subida selectiva a GitHub

Una vez superadas las pruebas, añadir **solo las nueve rutas de esta actualización**, no `git add -A`:

```powershell
git add -- "apps/web/src/app/page.tsx" "apps/web/src/app/globals.css" "apps/web/src/components/PrincipalOverview.tsx" "apps/web/src/components/PrincipalSessionControls.tsx" "packages/rules-engine/src/adventure.ts" "packages/rules-engine/src/dice.ts" "packages/rules-engine/tests/session-controls.test.ts" "packages/rules-engine/tests/dice.test.ts" "docs/implementation/PASO_39_GESTION_PG_INSPIRACION_RECURSOS.md"
git diff --cached --name-only
git diff --cached --check
git commit -m "feat: actualizacion 39 - gestion de PG inspiracion y recursos"
git push -u origin HEAD
git status
```

**Evidencias TFG por recopilar:** logs de lint/test/build, capturas escritorio/móvil, comportamiento de guardado/carga, rama, SHA, fecha de commit y lista real de archivos incluidos. No dar la actualización por validada/subida antes de recopilar esas evidencias.
