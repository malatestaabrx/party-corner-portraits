PARTY CORNER PORTRAITS — Foundry VTT 13
=======================================

Qué hace
--------
- Muestra retratos + nombres de los personajes elegidos por el GM.
- Todos los jugadores ven la misma barra de grupo.
- Un jugador puede tener varios personajes: el módulo no depende de la asignación usuario/personaje.
- Permite ajustar horizontal, vertical y zoom de cada retrato sin modificar el archivo original.
- Posición configurable en cualquiera de las cuatro esquinas.
- Barra horizontal o vertical.
- Color del borde configurable para todos los retratos.
- Al hacer clic en un retrato abre la ficha si el usuario tiene permisos sobre ese Actor.

Instalación manual
------------------
1. Descomprime la carpeta "party-corner-portraits" dentro de:
   <Foundry User Data>/Data/modules/
2. Reinicia Foundry VTT.
3. Entra en tu mundo y activa "Party Corner Portraits" en Manage Modules.
4. Ve a Game Settings > Configure Settings > Module Settings.
5. Busca "Party Corner Portraits" y pulsa "Configurar retratos".
6. Marca los PJ que quieres mostrar, ajusta sus imágenes y guarda.

Importante
----------
El ID de la carpeta debe seguir siendo exactamente:
party-corner-portraits

Compatibilidad
--------------
Diseñado para Foundry VTT 13.
La ventana de configuración usa ApplicationV2 + HandlebarsApplicationMixin.

NOVEDAD 2.1.0
-------------
- Añadido selector de color del borde en la configuración.
- Previsualización inmediata del color en los retratos de la ventana de configuración.
- El color guardado se aplica al HUD de todos los jugadores.
- Se mantiene #dccdaf como color predeterminado para conservar el aspecto anterior.

NOVEDAD 2.0.0
-------------
- Migración de la interfaz de configuración desde FormApplication (ApplicationV1) a ApplicationV2.
- Eliminada la dependencia de jQuery en la ventana de configuración.
- Manifest actualizado y limitado a Foundry VTT 13.
- Conservadas las opciones de posición, orientación, tamaño, nombres, offsets y encuadre individual.

NOVEDAD 1.1.0
-------------
- Offset horizontal y vertical configurables (0–1000 px).
- Los offsets se calculan desde los bordes correspondientes a la esquina elegida:
  * Arriba izquierda: izquierda + superior.
  * Arriba derecha: derecha + superior.
  * Abajo izquierda: izquierda + inferior.
  * Abajo derecha: derecha + inferior.
Esto permite apartar la barra de sidebars, paneles, widgets u otros elementos de interfaz.
