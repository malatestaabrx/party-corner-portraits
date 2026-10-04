PARTY CORNER PORTRAITS — Foundry VTT 13
=======================================

Features
--------
- Displays portraits and names for characters selected by the GM.
- Every player sees the same party bar.
- A player may control multiple characters; the module does not depend on user-to-character assignment.
- Adjusts horizontal position, vertical position, and zoom for each portrait without modifying the original image.
- Supports all four screen corners.
- Supports horizontal and vertical layouts.
- Provides a configurable border color for every portrait.
- Clicking a portrait opens its sheet when the user has permission to view that Actor.

Manual installation
-------------------
1. Extract the "party-corner-portraits" folder into:
   <Foundry User Data>/Data/modules/
2. Restart Foundry VTT.
3. Open your world and enable "Party Corner Portraits" in Manage Modules.
4. Open Game Settings > Configure Settings > Module Settings.
5. Find "Party Corner Portraits" and click "Configure Portraits".
6. Select the player characters you want to display, adjust their images, and save.

Important
---------
The folder ID must remain exactly:
party-corner-portraits

Compatibility
-------------
Designed for Foundry VTT 13.
The configuration window uses ApplicationV2 and HandlebarsApplicationMixin.

Version 2.2.0
- Added a numeric order field to each character.
- Lower numbers appear first; equal numbers keep the existing order.

Version 2.1.4
- Fixed scrolling for the complete configuration form.
- The window now fits the available screen height.
- The Save button remains visible while scrolling.

Version 2.1.3
- Increased the configuration window height.
- Added live character search.
- Visible characters remain at the top in their configured order.

Version 2.1.2
-------------
- Aligned the general configuration fields into consistent two-column rows.
- Expanded the visible-character list and fixed its vertical scrolling.

Version 2.1.1
-------------
- Fixed the ApplicationV2 configuration template to render a single root HTML element.

Version 2.1.0
-------------
- Added a border color picker to the configuration window.
- Added an immediate border color preview.
- Applied the saved color to every player's HUD.
- Kept #dccdaf as the default color to preserve the previous appearance.

Version 2.0.0
-------------
- Migrated the configuration interface from FormApplication (ApplicationV1) to ApplicationV2.
- Removed the jQuery dependency from the configuration window.
- Updated the manifest and limited compatibility to Foundry VTT 13.
- Preserved position, orientation, size, names, offsets, and individual portrait framing.

Version 1.1.0
-------------
- Added configurable horizontal and vertical offsets from 0 to 1000 pixels.
- Offsets are calculated from the edges associated with the selected corner:
  * Top left: left and top.
  * Top right: right and top.
  * Bottom left: left and bottom.
  * Bottom right: right and bottom.
This allows the party bar to avoid sidebars, panels, widgets, and other interface elements.
