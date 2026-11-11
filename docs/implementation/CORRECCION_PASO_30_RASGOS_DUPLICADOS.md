# Corrección de la actualización 30: rasgos duplicados del Campeón

## Problema

Desde nivel 10 React muestra el aviso `Encountered two children with the same key, champion_heroic_warrior` al dibujar `sheet.features`. Al nivel 11 también se repite `two_extra_attacks`.

## Causa

`fighterFeatures()` en `packages/rules-engine/src/sheet.ts` añadía dos veces, por error, los bloques que asignan esos dos rasgos. El componente de `page.tsx` utiliza `key={f}` correctamente, pues cada identificador debería ser único. **No cambies las keys de React** para esconder el fallo.

## Solución

La función del motor incluye ahora **una sola** inserción de `champion_heroic_warrior` (nivel 10+) y de `two_extra_attacks` (nivel 11+). Se agregó una regresión que recorre los niveles 9, 10 y 11, y comprueba la unicidad de toda la lista y la presencia exactamente una vez de cada rasgo.

## Instalación

1. Extraer este ZIP.
2. Copiar la carpeta `packages` y, opcionalmente, `docs` encima de la raíz de `DndEditor`, conservando la estructura y reemplazando los dos archivos correspondientes.
3. Desde la raíz del proyecto, ejecutar `pnpm test` y después `pnpm build`.
4. Con `pnpm dev`, abrir un Guerrero Campeón de nivel 10 y otro de nivel 11 y confirmar que los rasgos aparecen una sola vez y que no hay errores en la consola.

No modifica personajes, base de datos, Prisma, React ni la configuración de Vitest (`--maxWorkers=2`).

## Subir la corrección

```powershell
git add packages/rules-engine/src/sheet.ts packages/rules-engine/tests/progression-10-11.test.ts docs/implementation/CORRECCION_PASO_30_RASGOS_DUPLICADOS.md
git commit -m "fix: evitar rasgos duplicados del Campeon"
git push
```

## Verificación local

La prueba de regresión falló antes del cambio y pasó después. 588 comprobaciones locales mediante un verificador de aserciones, 0 fallos. `tsc` estricto del motor sin errores. `pnpm test` real y `pnpm build` deberán ejecutarse en Windows.
