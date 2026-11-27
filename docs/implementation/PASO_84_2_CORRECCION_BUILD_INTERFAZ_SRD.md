# Paso 84.2 — Corrección de tipado de la interfaz tras la auditoría SRD

## Motivo

Después de retirar del catálogo base las funcionalidades no incluidas en el SRD, la compilación de producción detectó referencias antiguas en tres componentes de la interfaz. Los tests del motor seguían pasando porque estas incompatibilidades se encontraban en las llamadas TSX a los contratos del motor y en una comparación contra un tipo de estilo de combate ya depurado.

## Cambios

- `PlayPanel.tsx`: las acciones de curar, Segundo aliento y descanso corto dejan de enviar la propiedad inexistente `fortitudeBonus`; se elimina el control asociado a `epic_boon_fortitude`.
- `PrincipalSessionControls.tsx`: se retira el mismo parámetro de las acciones de curar y Segundo aliento y los controles visuales de Fortaleza épica.
- `PrincipalEquippedAttacks.tsx`: desaparecen las comparaciones contra el estilo `dueling`, que ya no forma parte del tipo admitido, y su opción visual dependiente; permanecen las opciones de arma de sutileza, versátil y arrojadiza.

## Arquitectura y alcance

La capa de presentación consume los contratos y catálogos vigentes del paquete `rules-engine`. Cuando un contenido se retira del programa base SRD, también deben retirarse sus controles de la interfaz. Esto es compatible con la arquitectura modular prevista, en la que el contenido adicional se incorporará mediante módulos separados y explícitamente habilitados.

No se alteran la semántica de los tipos `AdventureAction` ni las reglas de cálculo de ataques. No se añaden dependencias ni migraciones de datos.

## Verificación

Las referencias obsoletas se eliminaron de los tres componentes. La validación íntegra mediante `pnpm test` y `pnpm build` queda pendiente de ejecutarse en la copia completa del repositorio con sus dependencias instaladas.
