# PASO 21: Catálogo de defensas mágicas (fase 4.9)

## Alcance

- Añadimos un registro de objetos mágicos defensivos del SRD 5.2.1 al **estado de partida** (`adventure.magicWards`).
- Catálogo inicial: **Ring of Resistance**, **Brooch of Shielding** y **Periapt of Proof against Poison**.
- El Ring of Resistance **no requiere vinculación** en D&D 2024 (a diferencia de la versión 2014).
- El Brooch of Shielding requiere vinculación y aporta resistencia a fuerza. Su inmunidad específica a *Magic Missile* **no se automatiza** todavía.
- El Periapt of Proof against Poison requiere vinculación y aporta inmunidad al daño de veneno. La inmunidad a la condición Envenenado **no se automatiza** todavía.
- La defensa solo se activa si el objeto está puesto y, cuando hace falta, vinculado.
- La resistencia del Enano y las de objetos mágicos se combinan sin aplicar dos veces la misma resistencia.
- El motor reutiliza la resolución de daño mixto, concentración, PG temporales y muerte de fases anteriores.
- La propiedad de objetos mágicos **se registra aparte del inventario mundano** en esta etapa. Se concede manualmente por el director de juego; no hay compra automática, integración con monedas ni comercio mágico.
- No se ejecuta código de datos externos ni se permite definir efectos arbitrarios desde la interfaz.

## Archivos de la actualización

- `packages/rules-engine/src/magic-wards.ts` (nuevo)
- `packages/rules-engine/src/adventure.ts` (modificado: campo opcional y normalización del legado)
- `packages/rules-engine/src/damage-defenses.ts` (modificado: declaraciones del catálogo)
- `packages/rules-engine/src/incoming.ts` (modificado: obtiene magia desde el estado persistente)
- `packages/rules-engine/src/index.ts` (modificado: exportaciones)
- `packages/rules-engine/tests/magic-wards.test.ts` (nuevo)
- `apps/web/src/components/MagicWardsPanel.tsx` (nuevo)
- `apps/web/src/components/IncomingAttacksPanel.tsx` (modificado)
- `apps/web/src/app/page.tsx` (modificado)
- `docs/implementation/PASO_21.md` (nuevo)

## Instalación

1. Guarda tus modificaciones actuales con Git o crea una copia de seguridad.
2. Descomprime `actualizacion-web-15.zip` en la raíz del proyecto, combinando `apps/`, `packages/` y `docs/`.
3. Comprueba que Docker Desktop y PostgreSQL están iniciados si vas a probar el guardado.
4. Ejecuta `pnpm test`, `pnpm build`, `pnpm dev`.
5. Abre `http://localhost:3000` y carga un personaje.
6. Abre «Defensas mágicas», registra un anillo de resistencia (por ejemplo al fuego), márcalo como puesto y consulta «Ataques recibidos». El daño de fuego debe reducirse a la mitad.
7. Desmarca el anillo y comprueba que el daño vuelve a su valor original.
8. Registra el broche, marca puesto y vinculado, comprueba resistencia a fuerza; sin vinculación no debe tenerla.
9. Registra el amuleto, marca puesto y vinculado; el daño de veneno debe anularse.
10. Pulsa **Actualizar guardado** en «Mis personajes», recarga, y comprueba que reaparecen los objetos y sus estados.

## Pruebas clave

- Anillo sin vinculación; solo resistencia al tipo elegido; no resistencia al daño cortante por elegir un anillo.
- Broche sin vinculación no genera resistencia.
- Amuleto activo concede inmunidad únicamente al daño de veneno.
- Objetos no puestos o eliminados no generan defensas.
- Un origen Enano y un anillo de resistencia al veneno no aplican resistencia por duplicado.
- Ataques con varios componentes procesan cada tipo una vez.
- No se altera el estado guardado al visualizar un ataque.
- Lectura de guardados previos sin `magicWards`: se normaliza a `[]` sin migración SQL.
- Rechazo de datos manipulados, IDs duplicados y vinculaciones inválidas.

## Seguridad y persistencia

No es necesario crear migraciones nuevas: el campo se incluye en el JSON `adventure` existente con `schemaVersion: 2`. Los objetos mágicos se validan antes de guardar y recuperar. Recuerda no subir archivos `.env` ni `.env.local`.

## Pendiente

- Vincular objetos mágicos al inventario general y a su valor o rareza comercial.
- Inmunidades contextuales de hechizos (*Magic Missile*) y condiciones (Envenenado).
- Equipar armaduras mágicas que sustituyan a la armadura mundana.
- Permitir dotes, hechizos y homebrew como fuentes declarativas auditadas.
- Procesar de forma explícita las acciones de vinculación/desvinculación mediante las reglas completas de descansos.

## Fuentes y licencia

Datos mecánicos basados en el **System Reference Document 5.2.1**, Wizards of the Coast LLC, con licencia **Creative Commons Attribution 4.0 International (CC BY 4.0)**. Documento: https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf. Licencia: https://creativecommons.org/licenses/by/4.0/.
El Manual del Jugador 2024 proporcionado por el usuario sirve como referencia privada del proyecto; aquí no se reproducen descripciones extensas ni ilustraciones del libro.
