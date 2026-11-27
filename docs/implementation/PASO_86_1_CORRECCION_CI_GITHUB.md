# Paso 86.1 · Corrección de CI después de la auditoría SRD y del renombrado

## Diagnóstico

El workflow de GitHub Actions del commit `c2a7e850daeaef2a100f65906585b66334665c8e` falló en diez casos de `adventure.test.ts`. Todos reutilizan la función `base()`, que en GitHub seguía eligiendo la dote `tough`, retirada del catálogo SRD 5.2.1 en la actualización 84. El validador rechaza correctamente esa elección y muestra «El humano debe elegir una dote de origen adicional».

La copia local de trabajo ya había sustituido `tough` por `alert` en el personaje Soldado humano. Esa corrección no se había incluido entre los archivos subidos a GitHub. Se incorpora expresamente el test corregido sin modificar las reglas ni su validación.

Al inspeccionar los archivos remotos también se detectó que todavía conservaban los controles retirados `fortitudeBonus` y `dueling` en `PlayPanel.tsx`, `PrincipalSessionControls.tsx` y `PrincipalEquippedAttacks.tsx`. Esas referencias podrían volver a romper la compilación TypeScript cuando el workflow terminase los tests. Se incluyen las tres versiones ya corregidas en el parche 84.2.

## Mantenimiento del workflow

Las acciones de GitHub `actions/checkout`, `actions/setup-node` y `pnpm/action-setup` se actualizan a sus versiones mayores 7, 7 y 6, respectivamente. Sus metadatos oficiales indican que ejecutan acciones sobre el runtime Node 24, evitando el aviso de deprecación de Node 20 que aparecía en las versiones anteriores. Se mantienen Node.js 24, pnpm 12, instalación con bloqueo, tests y build.

## Alcance y verificación

No cambian datos de juego, persistencia, recursos del personaje ni configuración de producción. La modificación de tests utiliza una dote SRD permitida que no coincide con la dote `savage_attacker` del trasfondo Soldado.

La validación completa de GitHub Actions requiere incorporar estos archivos y ejecutar un nuevo commit; una ejecución local previa no demuestra que todos los cambios estén presentes en el remoto. El repositorio sigue bajo control del propietario y este parche no modifica su visibilidad.
