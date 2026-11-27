# Parche 74.1 — TS7053 en las invocaciones del Brujo (nivel 5)

**Alcance:** corrección de compilación de la actualización 74. No incorpora rasgos, hechizos ni cambios visuales.

## Incidencia

En `packages/rules-engine/src/warlock-level-up.ts`, línea de validación de requisitos de invocaciones de nivel 5, `pnpm build` fallaba con TS7053 por indexar `WARLOCK_INVOCATION_PREREQUISITES` mediante un identificador inferido como `any`.

La comprobación previa `Array.isArray(choices.invocations)` permite que TypeScript estreche el array a `any[]`, incluso cuando el contrato de entrada declara `readonly WarlockInvocationId[]`. Ese estrechamiento afecta al argumento de `.some()`.

## Solución

- Se fija explícitamente un alias local `selectedInvocations: readonly WarlockInvocationId[]` antes de recorrer los identificadores.
- Se consulta el requisito una sola vez en `requiredPact`, de tipo `WarlockInvocationId | undefined`.
- La condición valida que la invocación requerida esté dentro de las cinco seleccionadas, manteniendo los mismos errores y las mismas reglas que antes.
- No hay cambios en persistencia, migraciones, estructura de hoja ni interfaz de subida de nivel.

## Comprobación

1. Ejecutar `pnpm --filter @dnd/rules-engine test`.
2. Ejecutar `pnpm --filter @dnd/web lint`.
3. Ejecutar `pnpm build`; el TS7053 ya no debe aparecer.
4. Subir el Brujo de nivel 4 a 5 con `Pacto de la Hoja` y `Hoja sedienta`: combinación admitida.
5. Intentar elegir `Hoja sedienta` sin `Pacto de la Hoja`: combinación rechazada.
6. Intentar elegir `Investidura del Amo de la Cadena` sin `Pacto de la Cadena`: combinación rechazada.

### Validación realizada en el entorno del parche

La comprobación de comportamiento del paso 74 mediante Node y resolución local de imports TypeScript ha terminado correctamente. Este entorno contiene una copia parcial del monorrepositorio y no dispone de todas las dependencias de compilación, por lo que `pnpm build` debe confirmarse en la instalación completa del usuario.

## Archivos alterados

- `packages/rules-engine/src/warlock-level-up.ts`
- `docs/implementation/PARCHE_74_1_TIPADO_INVOCACIONES.md`

**Continuación prevista:** una vez pasado `pnpm build`, continuar con Brujo nivel 6 (Suerte del Oscuro).
