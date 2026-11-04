# Paso 10 · Dotes y magia de origen (Actualización web 04)

## Objetivo

Completar el registro y validación de elecciones iniciales del Humano y los conjuros concedidos por el trasfondo y por los linajes élficos, sin fingir que ya existe un motor de lanzamiento de conjuros.

Fuentes de reglas consultadas: **Player's Handbook 2024**, páginas impresas 71 (Clérigo), 82–83 (Druida), 168 (Mago), 190 (linajes élficos), 194 (Humano), 200–202 (dotes de origen). Se almacenan identificadores, nombres y decisiones, no los textos íntegros del manual.

## Nuevas funcionalidades

- **Humano:** catálogo completo de las 10 dotes de origen de este manual: Alerta, Artesano, Sanador, Afortunado, Iniciado en la Magia, Músico, Ataque salvaje, Competente, Peleador de taberna y Duro.
- **Artesano:** elección y registro de tres herramientas válidas y distintas de la tabla correspondiente.
- **Músico:** elección y registro de tres instrumentos distintos.
- **Competente:** elección de tres competencias entre habilidades y herramientas; mejora el cálculo de las habilidades elegidas.
- **Afortunado:** registro del máximo de puntos de suerte por bonificador de competencia (sin gasto ni recuperación todavía).
- **Iniciado en la Magia:** selección de dos trucos y un conjuro de nivel 1 de una misma lista (Clérigo, Druida o Mago) y de una característica de lanzamiento (Inteligencia, Sabiduría o Carisma).
- **Acólito y Erudito:** lista fija por trasfondo (Clérigo o Mago respectivamente) con elecciones registradas y validadas.
- **Humano con Iniciado en la Magia adicional:** permite repetir la dote con lista distinta de la del trasfondo, según su cláusula de repetición.
- **Elfos:** conjuros automáticos por linaje desde nivel 1, y su conjuro adicional de nivel 3; se registra la característica elegida.
- **Hoja:** nueva sección que muestra conjuros de origen, nivel, fuente, característica de lanzamiento y si permiten un lanzamiento gratuito por descanso largo.

## Qué NO está automatizado

- No se ejecutan los efectos de los conjuros, ni las tiradas de ataque mágico, CD, concentración, componentes, rituales, duración o ranuras.
- Los conjuros de nivel 1 declaran un lanzamiento gratuito por descanso largo, pero **no se administran todavía los usos gastados**.
- El Alto elfo comienza con Prestidigitation. Cambiarlo después de un descanso largo se implementará con el sistema de descansos y conjuros.
- No se aplican aún los efectos de combate de Sanador, Peleador de taberna o Ataque salvaje, ni las acciones de Artesano y Músico.
- La Inspiración heroica del Humano y el gasto de puntos de Afortunado tampoco se administran todavía.
- El asistente sigue siendo un prototipo de Guerrero de niveles 1 a 3, sin guardado ni edición integral del inventario.

## Archivos incluidos

```text
apps/web/src/app/page.tsx                     ACTUALIZADO
apps/web/src/app/globals.css                   ACTUALIZADO
packages/rules-engine/src/guided.ts            ACTUALIZADO
packages/rules-engine/src/index.ts             ACTUALIZADO
packages/rules-engine/src/origin-magic.ts      NUEVO
packages/rules-engine/src/origin-feats.ts      NUEVO
packages/rules-engine/tests/origin-magic.test.ts NUEVO
docs/implementation/PASO_10.md                 NUEVO
```

## Instalación

1. Confirma que has aplicado las actualizaciones anteriores y `git status` está limpio.
2. Descomprime `actualizacion-web-04.zip`.
3. Copia sus carpetas `apps`, `packages` y `docs` dentro de `dnd-character-builder`, combinando carpetas. Reemplaza únicamente los archivos del listado anterior.
4. Desde la raíz del proyecto ejecuta:

```powershell
pnpm test
pnpm build
pnpm dev
```

5. Abre `http://localhost:3000` y entra en **Origen**. La vista de conjuros concedidos aparecerá en la hoja de la derecha.

## Comprobaciones manuales

1. Acólito: elegir dos trucos de Clérigo y un conjuro de nivel 1 de Clérigo; verificar que aparecen en la hoja.
2. Erudito: comprobar las elecciones de Mago y que no aparecen conjuros de otra lista.
3. Intentar elegir dos veces un mismo truco: la hoja debe mostrar un error de validación.
4. Humano con Iniciado en la Magia y trasfondo Acólito: escoger Druida como segunda lista, registrar seis conjuros; intentar repetir Clérigo y comprobar rechazo.
5. Humano con Competente: seleccionar tres habilidades/herramientas y observar las nuevas competencias calculadas; comprobar rechazo de duplicados.
6. Humano con Artesano: elegir tres herramientas; intentar repetir una y comprobar el mensaje de error.
7. Elfo drow, alto elfo y elfo de los bosques: comprobar el truco del linaje al nivel 1 y el conjuro adicional al nivel 3.
8. Seleccionar Afortunado: comprobar su máximo de puntos de suerte en la hoja.
9. Comprobar que siguen funcionando los pasos de equipo marcial y que las pruebas anteriores se mantienen.

## Verificación del paquete

- Validación estática estricta del motor TypeScript.
- Análisis de tipos de la página TSX con declaraciones mínimas locales de React (la compilación completa de Next.js debe hacerse en el proyecto).
- Revisión sintáctica del TSX.
- 151 comprobaciones ejecutadas localmente con un pequeño verificador de aserciones que cubre los casos anteriores y los 25 nuevos. **No sustituye la ejecución real de Vitest con `pnpm test`.**

## Confirmación Git

Tras superar las pruebas:

```powershell
git add apps/web/src/app packages/rules-engine docs/implementation/PASO_10.md
git commit -m "feat: añadir dotes y magia de origen DnD 2024"
git push
```

## Próximo paso

Completar el equipamiento de los trasfondos, el inventario de inicio y las decisiones de herramientas (incluidos juegos de azar), sin mezclarlos todavía con el equipamiento comprado durante la aventura.
