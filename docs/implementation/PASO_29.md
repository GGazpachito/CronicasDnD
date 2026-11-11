# Paso 29 · Guerrero 8–9: progresión, Indomable y Dominio táctico

## Propósito

Extiende el prototipo del Guerrero Campeón de niveles 1–7 a **1–9**, siguiendo el Manual del Jugador 2024 (tabla y rasgos del Guerrero, página impresa 92). Corrige además la visibilidad del nivel seleccionado, especialmente el nivel 7.

## Cambios funcionales

- **Nivel 8:** tercera elección de la dote *Mejora de característica*: +2 a una característica o +1 a dos características distintas, con límite de 20. Independiente de las elecciones de niveles 4 y 6. Las otras dotes generales siguen pendientes del catálogo.
- **Nivel 9:** competencia +4; 1 uso de **Indomable** por descanso largo; **Dominio táctico** permite sustituir por Empujar (Push), Debilitar (Sap) o Ralentizar (Slow) la propiedad de maestría de un arma que ya dominas, *solo para ese ataque*.
- **Indomable:** debe utilizarse tras una tirada de salvación fallida. Se introduce la tirada nueva del d20 y se calcula con el bonificador de salvación del personaje, penalización por agotamiento, modificadores situacionales y un bono igual al nivel de Guerrero. La segunda tirada es obligatoria, aunque resulte peor. Los fallos también gastan el recurso. Recuperación exclusiva con descanso largo. El control actual es para salvaciones ordinarias; el sistema especial de salvaciones contra muerte no queda conectado a Indomable en esta fase.
- **Dominio táctico:** la maestría elegida se incorpora al perfil de ataque y a los efectos pendientes e historial al confirmar. No sobrescribe la elección permanente. No se permite con armas sin maestría dominada o antes de nivel 9. Conserva los bonificadores de armas mágicas y los dos ataques de nivel 5.
- **Selector visual de nivel:** ahora `aria-pressed`, `data-current`, una marca ✓ y la etiqueta «Nivel actual» reflejan el valor efectivo. Estilo de alto contraste con selector explícito; funciona también en las últimas filas del panel.
- **Persistencia:** continúa el esquema v2 de `CharacterSnapshot` almacenado en la columna JSON de Prisma. Los guardados 1–7 siguen válidos; al alcanzar 9 se agrega el recurso `indomitable`. No requiere migraciones de Prisma.
- **Pruebas:** se conserva la limitación `vitest run --maxWorkers=2` y **no** se utiliza `--minWorkers` (incompatible con Vitest 5.1.0).

## Instalación

Desde la raíz del repositorio, copia las carpetas `apps`, `packages` y `docs` del ZIP, fusionando y reemplazando solo los archivos contenidos. No elimines la base de datos ni los volúmenes de Docker. En PowerShell:

```powershell
docker compose up -d
pnpm test
pnpm build
pnpm dev
```

Después de cargar el personaje de nivel 7, en **Características** escoge «Tercera mejora de característica · nivel 8». En **Identidad**, sube al nivel 8 y luego al 9. El nivel actual debe resaltarse y mostrarse como texto. En **Jugar con tu personaje**, aparece Indomable. En **Ataques con armas**, aparece Dominio táctico para armas cuya maestría conozcas.

## Pruebas manuales

1. Cargar un guardado anterior de nivel 7: el selector marca claramente **Nivel 7 ✓**.
2. Elegir mejora de nivel 8, subir y comprobar que la hoja y el selector muestran 8.
3. Subir a nivel 9 y comprobar competencia +4, maestrías originales y 1 uso de Indomable.
4. Tras fallar una salvación, usar Indomable. Verificar resultado de la nueva tirada y consumo del uso.
5. Confirmar que un descanso corto **no** recupera Indomable y el largo sí.
6. Con espadón dominado, sustituir Rozar por Empujar durante un golpe; comprobar el registro y que otro ataque vuelve a Rozar por defecto.
7. Comprobar que Dominio táctico está deshabilitado con armas sin maestría dominada.
8. En nivel 9, registrar dos ataques con la misma acción Atacar; sigue sin gastarse la segunda acción.
9. Guardar y cargar el personaje de nivel 9; comprobar el nivel, características, historial y usos gastados.
10. Confirmar que `pnpm test` muestra `vitest run --maxWorkers=2` y que `pnpm build` termina correctamente.

## Archivos modificados

- `packages/rules-engine/src/progression.ts`: mejora del nivel 8.
- `packages/rules-engine/src/guided.ts`: validar y calcular niveles 8 y 9.
- `packages/rules-engine/src/sheet.ts`: rasgos y recursos de nivel 9.
- `packages/rules-engine/src/resources.ts`: límite, gasto y descansos de Indomable.
- `packages/rules-engine/src/adventure.ts`: nuevo tipo de acción y persistencia del recurso.
- `packages/rules-engine/src/attacks.ts`: Dominio táctico como opción de ataque.
- `packages/rules-engine/src/origin-magic.ts`: permitir niveles 8 y 9 sin perder conjuros de linaje élfico.
- `packages/rules-engine/tests/progression-8-9.test.ts`: pruebas específicas.
- `apps/web/src/app/page.tsx`, `globals.css`: progresión y nivel resaltado.
- `apps/web/src/components/PlayPanel.tsx`: panel de Indomable.
- `apps/web/src/components/AttacksPanel.tsx`: selector de Dominio táctico.
- `packages/rules-engine/package.json`: se incluye explícitamente para conservar el límite de dos workers.

## Limitaciones

El catálogo de dotes generales alternativas a *Mejora de característica*, la integración de Indomable con salvaciones contra muerte y la gestión automática de condiciones de enemigos permanecen pendientes. Las tiradas del d20 y los resultados de enemigos siguen introduciéndose manualmente.
