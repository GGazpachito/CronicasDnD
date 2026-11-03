# Paso 05: recursos y descansos (Guerrero niveles 1 a 3)

## Objetivo
Mantener separado el **máximo calculado** de usos del **estado persistente** de usos actuales. Se introducen funciones puras e inmutables para Segundo aliento, Acción súbita, Mente táctica, descansos y subida de nivel.

## Fuente
*Player's Handbook 2024*, Guerrero, páginas impresas 91–92. La documentación anterior `GUERRERO_NIVELES_1_3.md` define los casos T10–T15 de referencia.

## Archivos
- `packages/rules-engine/src/resources.ts`: módulo nuevo.
- `packages/rules-engine/src/index.ts`: añade la exportación pública del módulo (conserva las anteriores).
- `packages/rules-engine/tests/resources.test.ts`: 25 pruebas.

## Comportamiento
- Nivel 1: Segundo aliento 2 usos, Acción súbita todavía no disponible.
- Niveles 2–3: Segundo aliento 2 usos; Acción súbita 1 uso.
- Segundo aliento: gasta un uso, recupera `d10 + nivel de Guerrero` PG, sin superar PG máximos.
- Descanso corto: recupera 1 uso de Segundo aliento, y restaura Acción súbita.
- Descanso largo: recupera todos los usos de ambos recursos.
- Mente táctica: solo para una prueba fallida; suma el resultado de 1d10 y consume Segundo aliento **solo si** la prueba pasa a tener éxito. Si no, no consume el recurso.
- Acción súbita: no permite usar la acción Magia como acción adicional.
- Subida de nivel: habilita Acción súbita en nivel 2; conserva usos gastados. En el ejemplo de Guerrero monoclase, el aumento de PG máximos incrementa en igual cuantía los PG actuales.

## Limitaciones deliberadas
- `finishFighterRest` **solo recupera recursos de clase**. No simula curación de descansos, gastos de dados de golpe, recuperación de dados de golpe, agotamiento ni cambios de maestría. Por ello tampoco cura automáticamente los PG en descanso largo; estas mecánicas se desarrollarán en su propio módulo de descanso.
- No gestiona el presupuesto de acciones del turno ni comprueba si una acción adicional ya fue utilizada. Esto necesitará el futuro sistema de turnos/eventos.
- Las tiradas de dados se reciben como entradas validadas y no se generan dentro del núcleo determinista.
- El máximo de recursos se limita deliberadamente al Guerrero de niveles 1–3. No extrapolar a niveles superiores o multiclase sin ampliar la progresión.
- Los datos persistidos se validan con `validateFighterState`; no se corrigen automáticamente.

## Instalación
Copiar las carpetas `packages` y `docs` del ZIP sobre el repositorio, **combinando**, sin eliminar archivos anteriores. Solo se sustituye `src/index.ts` para actualizar las exportaciones.

```powershell
pnpm test
pnpm build
```

Tras superar las pruebas:

```powershell
git add packages/rules-engine docs/implementation/PASO_05.md
git commit -m "feat: implementar recursos y descansos del Guerrero"
git push
```

## Siguiente paso
Componer una ficha calculada con los módulos `abilities`, `proficiencies`, `effects`, `modifiers`, `defense` y `resources`, separando cálculo y estado guardado.
