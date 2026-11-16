# Paso 50.1 · Corrección del prerenderizado del creador de Mago

## Incidencia observada

En la actualización 50, `pnpm lint` y `pnpm test` terminaban sin errores, y el build de Next.js 16.4.6 compilaba y superaba TypeScript. La generación estática de la ruta `/wizard`, sin embargo, fallaba con:

```
Error occurred prerendering page "/wizard"
RangeError: Nombre de Mago inválido
  at calculateGuidedWizardOne (.../wizard-creation.ts:89)
  at initialWizardOneState (.../wizard-creation.ts:148)
  at WizardPage (.../app/wizard/page.tsx:43)
```

El estado React se inicializaba con `initialWizardOneState(defaultInput)`, donde `defaultInput.name === ''`. El motor exige correctamente un nombre no vacío. En el prerenderizado de Next.js se ejecuta el inicializador de estado y se produce la excepción incluso antes de que el jugador pueda introducir el nombre.

## Decisión y cambio

Se introduce `wizardInputForPreview(input)` en el motor. Genera una proyección temporal con `name: 'Mago provisional'` **solo si el nombre del borrador está vacío o contiene espacios**; no modifica el objeto de entrada. La página utiliza esa proyección únicamente para:

- Calcular el estado inicial (`initialWizardOneState`).
- Calcular estadísticas de vista previa (`calculateGuidedWizardOne`).
- Validar transacciones de inventario durante la edición.

El campo de nombre del usuario sigue vacío. La creación del snapshot (`makeWizardCharacterSnapshot`) recibe **el `input` original**, no la proyección temporal, de modo que el personaje no se puede guardar hasta que el usuario introduzca un nombre válido.

También se corrige la señal de validez de la cabecera para que use `actualSnapshot`, y se presenta un mensaje específico sobre el nombre faltante en lugar de un aviso genérico de sincronización.

## Alternativas descartadas

1. Poner un nombre predefinido en el formulario. Permitiría guardar accidentalmente varios personajes llamados «Mago provisional».
2. Relajar `calculateGuidedWizardOne` para admitir nombres vacíos. Debilitaría el control de creación y persistencia.
3. Desactivar la generación estática de `/wizard`. Es innecesario y ocultaría la causa real.
4. Encapsular toda la ruta en un `try/catch` con una página vacía. Evitaría el error pero no ofrecería una ficha útil hasta introducir el nombre.

## Compatibilidad y alcance

- No cambian esquema, endpoints, migraciones ni revisiones de PostgreSQL.
- No cambia el modelo de guardado ni se alteran datos existentes de Guerrero/Mago.
- Los cálculos oficiales del Mago y las ranuras continúan bajo validación estricta.
- Se modifican solo `wizard-creation.ts` y `/wizard/page.tsx`, más una prueba nueva y este documento.

## Verificación realizada en el entorno de preparación

- TypeScript 5.8.3: compilación estricta del motor `wizard-creation.ts` y dependencias, sin errores.
- Transpilación de la página TSX: sin diagnósticos de sintaxis.
- Ejecución directa de ocho aserciones del motor real compilado: inicialización con nombre provisional, PG máximos, dos ranuras, rechazo de guardado vacío, conservación del nombre real, rechazo de nombres demasiado largos.
- Se incorpora `wizard-prerender-50-1.test.ts` con cuatro casos de regresión para Vitest.

No se dispone aquí de un entorno completo con Next.js/Prisma/Vitest; **no se afirma haber ejecutado el build completo de producción**.

## Matriz de aceptación local

Desde la raíz del repositorio, tras descomprimir el ZIP:

```powershell
pnpm lint
pnpm test
pnpm build
pnpm dev
```

1. `pnpm build` debe completar la generación de `/wizard` sin `RangeError`.
2. En `http://localhost:3000/create`, elegir Mago debe abrir el formulario con el nombre vacío y las estadísticas de nivel 1 visibles.
3. «Guardar personaje» debe permanecer inhabilitado mientras falte el nombre.
4. Al escribir un nombre válido, el guardado debe habilitarse; tras guardar y recargar desde la galería, debe conservarse ese nombre, nunca «Mago provisional».
5. Las operaciones de inventario y los rombos de ranura deben seguir funcionando.
6. Un Guerrero guardado antes de esta entrega debe seguir cargándose normalmente.

## Siguiente actualización prevista

Tras validar 50.1, la actualización 51 conectará la progresión del Mago más allá del nivel 1 a la arquitectura de hojas compartidas, preservando el guardado y los recursos mágicos.
