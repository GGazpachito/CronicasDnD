# Paso 71 · Bestiario y familiares del Pacto de la Cadena

Fecha: 19 de noviembre de 2026. Entrega incremental posterior al parche 70.1.

## Solicitud y decisiones

Se añade un **tercer botón principal**, «Bestiario», como biblioteca central de hojas de criaturas para uso futuro por clases, subclases, enemigos y compañeros. El primer conjunto son **las 23 formas actualmente elegibles de familiar del Brujo**, incluidas las ocho especiales del Pacto de la Cadena.

- `bestiary.ts`: catálogo único con bloques tipados y datos mecánicos de las *Basic Rules* 2024; comprobación de unicidad y una función de consulta por ID. Se conservan las formas antiguas `fish` y `poisonous_snake` mediante equivalentes vigentes documentados.
- `CreatureStatBlock.tsx`: mismo renderer de compañero manual, familiar y Bestiario; incluye características, seis tiradas, CA, PG de referencia, iniciativa, habilidades, sentidos, defensas, ataques, rasgos y acciones.
- `BestiaryBrowser.tsx` y `/bestiary`: buscador, filtro por tipo de familiar, selector de criatura, tarjeta de estadísticas y enlace a fuente.
- `WarlockCompanionsPanel.tsx`: cuando el usuario selecciona su forma de familiar, muestra la ficha real del Bestiario y un enlace a la página del catálogo. La pestaña «Compañeros» común y sus fichas manuales no cambian de sitio ni de comportamiento.
- `apps/web/src/app/page.tsx` y CSS: tercer botón en inicio, disposición adaptable a escritorio y móvil.
- [`ARQUITECTURA_BESTIARIO.md`](../architecture/ARQUITECTURA_BESTIARIO.md): nuevo contrato obligatorio para no duplicar datos de criaturas.

No se crea un segundo tipo de guardado, no se altera la progresión de clases y no se automatizan decisiones de combate. Los PG mostrados para familiares son valores del bloque original, no un contador temporal editable.

## Pruebas de verificación manual

Desde la raíz del repositorio ejecutar **cada comando por separado**:

```
pnpm --filter @dnd/rules-engine test
pnpm --filter @dnd/web lint
pnpm build
```

1. **Inicio:** comprobar tres tarjetas «Crear personaje», «Cargar personaje» y «Bestiario»; en una pantalla estrecha deben aparecer apiladas y legibles.
2. **Bestiario:** entrar, navegar por las 23 fichas, comprobar que se muestran CA, PG, seis características, velocidad, habilidades, salvaciones, ataques, rasgos, acciones y fuente. Probar «Buscar» con «esfinge», «bestia» y «1/4».
3. **Filtros:** marcar «Pacto de la Cadena: especiales» (ocho fichas) y «Familiares comunes» (quince); volver a «Todas las criaturas».
4. **Tiradas:** en Diablillo realizar tirada de característica, iniciativa y Aguijón; debe verse el resultado d20 con su modificador, manteniendo los valores originales de la criatura.
5. **Brujo con Pacto de la Cadena:** abrir la pestaña Compañeros, seleccionar **Diablillo** y comprobar CA 13, 21 PG, características, ataque Aguijón y resistencias. Cambiar a **Esfinge maravillosa** y comprobar CA 13 y 24 PG. Cambiar a **Esqueleto** y ver dos ataques. Probar un nombre personalizado.
6. **Enlace cruzado:** desde la hoja del familiar pulsar «Ver en el Bestiario»: debe abrirse la criatura correspondiente (sin crear un personaje nuevo).
7. **Conservación:** crear y guardar un compañero manual en un Brujo; cambiar el familiar no debe eliminar ni sobrescribir dicho compañero. En un Guerrero/Mago, los compañeros manuales siguen apareciendo con el mismo formato, botones y tiradas.
8. **Persistencia:** guardar el Brujo, recargarlo y comprobar que el familiar seleccionado y su nombre siguen dando acceso a la ficha. Los guardados anteriores que empleaban `fish` o `poisonous_snake` deben poder abrirse.
9. **Sin pacto:** un Brujo sin invocación Pacto de la Cadena no muestra la extensión del familiar; puede seguir usando los compañeros manuales. No cambia ninguna otra pestaña.

## Prueba automatizada y límites

`packages/rules-engine/tests/bestiary-familiars-71.test.ts` comprueba que hay un bloque por forma, que son validables, la lista de ocho especiales, varios valores de referencia, los alias históricos y la separación de plantillas. En el entorno de entrega, la ejecución de humo de Node 24 valida las 23 fichas contra `validateCompanionSheets`; no están instalados manifiestos/dependencias pnpm para ejecutar la suite de Vitest, el lint Next ni `pnpm build`, de modo que estas pruebas siguen siendo necesarias en el equipo del usuario.

## Próxima entrega recomendada

Avanzar al **Brujo nivel 3 (Patrón Infernal)**, utilizando los asistentes comunes de subida/bajada. Más adelante, el Bestiario podrá incorporar enemigos y criaturas por fuente y categoría; si se introduce seguimiento de PG del familiar, hacerlo mediante estado de instancia separado del bloque estático.
