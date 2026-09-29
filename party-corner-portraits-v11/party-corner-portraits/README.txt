PARTY CORNER PORTRAITS — Foundry VTT 11
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
Designed for Foundry VTT 11.

Version 1.2.0
-------------
- Added a color picker for portrait borders.

Version 1.1.0
-------------
- Added configurable horizontal and vertical offsets from 0 to 1000 pixels.
- Offsets are calculated from the edges associated with the selected corner:
  * Top left: left and top.
  * Top right: right and top.
  * Bottom left: left and bottom.
  * Bottom right: right and bottom.
This allows the party bar to avoid sidebars, panels, widgets, and other interface elements.
