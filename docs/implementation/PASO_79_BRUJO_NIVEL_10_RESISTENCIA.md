# Actualización 79 · Brujo Infernal nivel 10 · Cuarto truco y Resistencia infernal

Fecha: 25 de noviembre de 2026. Reglas objetivo: D&D 2024.

## Alcance y decisión de corte

Se implementa **solo el nivel 10**, porque el nivel 11 introduce un subsistema nuevo (Arcanum místico, sexto nivel de magia y tercera ranura de Pacto). No se mezcla con el cambio de resistencia ni se altera la arquitectura común de ficha y subida/bajada de nivel.

| Aspecto | Nivel 9 | Nivel 10 |
| --- | --- | --- |
| Bonificación de competencia | +4 | +4 |
| Trucos de Brujo | 3 | **4** |
| Conjuros ordinarios preparados | 10 | 10 |
| Invocaciones sobrenaturales | 7 | 7 |
| Ranuras de Magia de Pacto | 2, nivel 5 | 2, nivel 5 |
| Patrón Infernal | Bendición, Suerte, conjuros | **Resistencia infernal** adicional |
| Dados de golpe | 9d8 | 10d8 |

## Diseño del rasgo y estados

El motor publica `WARLOCK_FIEND_DAMAGE_TYPES` (12 tipos de daño, exceptuando fuerza) y `chooseWarlockFiendishResilience(input,state,type)`.

- `fiendishResilienceType: WarlockFiendDamageType | null` guarda la resistencia vigente. `null` significa ninguna elección todavía.
- `fiendishResiliencePending: boolean` indica si ha terminado un descanso y se puede realizar una elección.
- Al subir 9→10 ambos campos se inicializan a `null` y `false`. No se concede una resistencia arbitraria sin descansar.
- Al finalizar un descanso corto o largo, `fiendishResiliencePending` pasa a `true`. El tipo resistente anterior se **mantiene** hasta confirmar otro.
- Al confirmar un tipo válido, el campo de resistencia se actualiza y se cierra la ventana de elección (`pending: false`). No puede volver a cambiarse sin nuevo descanso.
- Fuerza queda excluida por validación en el **motor de reglas**; no solo en la interfaz.
- La aplicación de daño y el desencadenante del descanso son responsabilidad de los jugadores. La hoja solo representa el estado elegido.
- El validador de guardados rechaza campos de resistencia en niveles anteriores a 10 y rechaza valores desconocidos. Se conserva `schemaVersion: 4`.

## Arquitectura y persistencia

- `packages/rules-engine/src/warlock.ts`: tipos, validadores, cálculo de PG, resistencia y descansos.
- `packages/rules-engine/src/warlock-level-up.ts`: `advanceWarlockToLevelTen` y bajada reversible 10→9 con `level10History`.
- `packages/rules-engine/src/warlock-traits.ts`: ficha textual del rasgo en la colección común de Rasgos, y contador actualizado de cuatro trucos.
- `apps/web/src/components/WarlockLevelUpWizard.tsx`: mismo `LevelUpDialogFrame` de tres etapas; selector d8 común, `WizardSpellDetails`, búsqueda, listas de invocaciones y conjuros. Se añade un cuarto truco y se permite una sustitución en las otras elecciones según reglas.
- `apps/web/src/app/warlock/page.tsx`: módulo de resistencia dentro de `SharedPrincipalSheet` y Rasgos, sin crear pestañas distintas ni duplicar componentes compartidos. Selector visible solo después de descanso; contador de trucos corregido en biblioteca compartida.
- `packages/rules-engine/tests/warlock-level-10-79.test.ts`: pruebas nuevas de reglas, uso, persistencia y regreso al nivel 9.

### Descenso

`level10History` conserva las diez preparaciones, tres trucos, siete invocaciones y los vínculos de pactos que existían antes de subir. La bajada a nivel 9 restaura esas elecciones, elimina el dado e historial del nivel 10 y los estados de resistencia; conserva el resto de recursos, daño acumulado compatible, compañeros, equipo y todos los historiales anteriores. Después es posible continuar 9→8.

## Verificación

El motor tiene una prueba nueva (paso 79) y se han ejecutado con Node 24 diez guiones de humo de los pasos previos y el actual, todos correctos. En el entorno de parche no existe el monorepositorio completo con `pnpm` y sus dependencias, por lo que hay que ejecutar el control final en el equipo de desarrollo:

```powershell
pnpm --filter @dnd/rules-engine test
pnpm --filter @dnd/web lint
pnpm build
```

### Comprobaciones manuales en interfaz

1. Cargar un Brujo Infernal de nivel 9 y abrir **Subir nivel**: comprobar exactamente tres etapas y los estilos comunes de Guerrero/Mago.
2. Elegir media o tirada d8. Ver cuatro trucos, diez preparados y siete invocaciones, con las descripciones de hechizos existentes; no aparece un selector de resistencia en la subida.
3. Confirmar y verificar PG, cuatro trucos en `Hechizos`, el rasgo en `Rasgos` y el módulo específico en `Principal`.
4. Antes de descansar, ningún cambio de resistencia debe ser posible.
5. Completar un descanso corto, escoger Fuego y confirmar. Ver resistencia activa; Fuerza no debe aparecer en el desplegable.
6. Volver a descansar, escoger Frío; la resistencia anterior permanece hasta confirmar la nueva.
7. Guardar/cargar personaje y comprobar que se conserva la resistencia y su disponibilidad. Dejar que `validateWarlockCharacterSnapshot` rechace valores adulterados.
8. Bajar 10→9 con `LevelDownDialog`: comprobar restauración de tres trucos y eliminación del rasgo. Bajar 9→8 y comprobar el historial restante.
9. Repetir en un personaje con Hoja, Cadena o Tomo, inventario y compañeros: los módulos compartidos permanecen en su sitio.

## Próxima actualización propuesta

Brujo Infernal **nivel 11**: tercera ranura de Pacto de nivel 5, undécimo preparado y primera elección de **Arcanum místico** (conjuro de nivel 6, una vez por descanso largo y sin consumir ranura). Preparar primero modelo persistente de 3 ranuras y Arcanum; después conectarlo al módulo común de hechizos, el asistente de progresión, la hoja principal y la bajada 11→10. Ampliar catálogo común solo con las fichas que aún no existan, sin duplicar conjuros de Mago.
