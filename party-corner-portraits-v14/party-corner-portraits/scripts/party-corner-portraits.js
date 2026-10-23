const MODULE_ID = "party-corner-portraits";
const SETTING_KEY = "config";

const DEFAULT_CONFIG = {
  position: "bottom-left",
  orientation: "horizontal",
  size: 86,
  offsetX: 16,
  offsetY: 16,
  showNames: true,
  borderColor: "#dccdaf",
  order: [],
  actors: {}
};

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function getConfig() {
  const stored = game.settings.get(MODULE_ID, SETTING_KEY) || {};
  return foundry.utils.mergeObject(foundry.utils.deepClone(DEFAULT_CONFIG), stored, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true
  });
}

function normalizeColor(value, fallback = DEFAULT_CONFIG.borderColor) {
  const color = String(value ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}

function clamp(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function normalizeMarkers(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).map(marker => ({
    id: String(marker?.id || foundry.utils.randomID()),
    color: normalizeColor(marker?.color, "#ffcc00")
  }));
}

function normalizeResourceBars(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map(bar => ({
    id: String(bar?.id || foundry.utils.randomID()),
    color: normalizeColor(bar?.color, "#3ba55d"),
    currentPath: String(bar?.currentPath || ""),
    maximumPath: String(bar?.maximumPath || ""),
    height: Math.trunc(clamp(bar?.height, 1, 20, 4))
  }));
}

function normalizeResourceBarOffset(value) {
  return Math.trunc(clamp(value, 0, 100, 1));
}

function normalizeResourceBarDepletedOpacity(value) {
  return Math.trunc(clamp(value, 0, 100, 30));
}

function normalizeResourceBarSpacing(value) {
  return Math.trunc(clamp(value, 0, 20, 0));
}

function normalizeBorderWidth(value) {
  return Math.trunc(clamp(value, 0, 20, 2));
}

function normalizeNameFontSize(value, portraitSize = DEFAULT_CONFIG.size) {
  const fallback = Math.max(10, Math.round(clamp(portraitSize, 48, 160, DEFAULT_CONFIG.size) * 0.14));
  return Math.trunc(clamp(value, 8, 64, fallback));
}

function normalizeNameOffset(value) {
  return Math.trunc(clamp(value, 0, 100, 0));
}

function normalizeCustomName(value) {
  return String(value ?? "").trim().slice(0, 100);
}

function getNumericActorResources(actor) {
  const flattened = foundry.utils.flattenObject(actor.system || {});
  return Object.entries(flattened)
    .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
    .map(([path, value]) => ({ path: `system.${path}`, value }))
    .sort((a, b) => a.path.localeCompare(b.path, game.i18n.lang));
}

function createResourceSelect(resources, selectedPath, name) {
  const select = document.createElement("select");
  select.name = name;
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "Select a resource";
  select.append(empty);

  const availablePaths = new Set(resources.map(resource => resource.path));
  if (selectedPath && !availablePaths.has(selectedPath)) {
    resources = [...resources, { path: selectedPath, value: "?" }];
  }

  for (const resource of resources) {
    const option = document.createElement("option");
    option.value = resource.path;
    option.textContent = `${resource.path} (${resource.value})`;
    if (resource.path === selectedPath) {
      option.selected = true;
      option.setAttribute("selected", "");
    }
    select.append(option);
  }
  return select;
}

function createDialogField(labelText, input) {
  const label = document.createElement("label");
  label.className = "pcp-decoration-field";
  const text = document.createElement("span");
  text.textContent = labelText;
  label.append(text, input);
  return label;
}

function setDialogInputValue(input, value) {
  const normalized = String(value);
  input.value = normalized;
  input.defaultValue = normalized;
  input.setAttribute("value", normalized);
}

function createDialogSection(title) {
  const section = document.createElement("section");
  section.className = "pcp-options-section";
  const heading = document.createElement("h3");
  heading.textContent = title;
  section.append(heading);
  return section;
}

async function managePortraitOptions(actorId) {
  const actor = game.actors.get(actorId);
  if (!actor) return;
  const config = getConfig();
  const framing = config.actors?.[actorId] ?? {};
  const markers = normalizeMarkers(framing.markers);
  const bars = normalizeResourceBars(framing.resourceBars);
  const resources = getNumericActorResources(actor);
  const content = document.createElement("div");
  const dialogBody = document.createElement("div");
  dialogBody.className = "pcp-decoration-dialog pcp-portrait-options-dialog";
  content.append(dialogBody);

  const borderColor = document.createElement("input");
  borderColor.type = "color";
  borderColor.name = "borderColor";
  setDialogInputValue(borderColor, normalizeColor(framing.borderColor, normalizeColor(config.borderColor)));

  const borderWidth = document.createElement("input");
  borderWidth.type = "number";
  borderWidth.name = "borderWidth";
  borderWidth.min = "0";
  borderWidth.max = "20";
  borderWidth.step = "1";
  setDialogInputValue(borderWidth, normalizeBorderWidth(framing.borderWidth));

  const applyBorderToAll = document.createElement("input");
  applyBorderToAll.type = "checkbox";
  applyBorderToAll.name = "applyBorderToAll";

  const borderSection = createDialogSection("Border");
  const borderSettings = document.createElement("div");
  borderSettings.className = "pcp-border-settings";
  borderSettings.append(
    createDialogField("Border color", borderColor),
    createDialogField("Border width (px)", borderWidth),
    createDialogField("Apply border settings to all visible characters", applyBorderToAll)
  );
  borderSection.append(borderSettings);
  dialogBody.append(borderSection);

  const useCustomName = document.createElement("input");
  useCustomName.type = "checkbox";
  useCustomName.name = "useCustomName";
  useCustomName.checked = Boolean(framing.useCustomName);
  if (useCustomName.checked) useCustomName.setAttribute("checked", "");

  const customName = document.createElement("input");
  customName.type = "text";
  customName.name = "customName";
  customName.maxLength = 100;
  customName.disabled = !useCustomName.checked;
  if (customName.disabled) customName.setAttribute("disabled", "");
  setDialogInputValue(customName, normalizeCustomName(framing.customName) || actor.name);

  const nameFontSize = document.createElement("input");
  nameFontSize.type = "number";
  nameFontSize.name = "nameFontSize";
  nameFontSize.min = "8";
  nameFontSize.max = "64";
  nameFontSize.step = "1";
  setDialogInputValue(nameFontSize, normalizeNameFontSize(framing.nameFontSize, config.size));

  const nameColor = document.createElement("input");
  nameColor.type = "color";
  nameColor.name = "nameColor";
  setDialogInputValue(nameColor, normalizeColor(framing.nameColor, "#ffffff"));

  const nameOffset = document.createElement("input");
  nameOffset.type = "number";
  nameOffset.name = "nameOffset";
  nameOffset.min = "0";
  nameOffset.max = "100";
  nameOffset.step = "1";
  setDialogInputValue(nameOffset, normalizeNameOffset(framing.nameOffset));

  const applyNameStyleToAll = document.createElement("input");
  applyNameStyleToAll.type = "checkbox";
  applyNameStyleToAll.name = "applyNameStyleToAll";

  const nameSection = createDialogSection("Name");
  const nameSettings = document.createElement("div");
  nameSettings.className = "pcp-name-settings";
  nameSettings.append(
    createDialogField("Use custom name", useCustomName),
    createDialogField("Custom name", customName),
    createDialogField("Name size (px)", nameFontSize),
    createDialogField("Name color", nameColor),
    createDialogField("Offset from bars or bottom (px)", nameOffset),
    createDialogField("Apply name style to all visible characters", applyNameStyleToAll)
  );
  nameSection.append(nameSettings);
  dialogBody.append(nameSection);

  const markersSection = createDialogSection("Color dots");
  const markerRows = document.createElement("div");
  markerRows.className = "pcp-options-rows pcp-marker-rows";

  const createMarkerRow = (marker = {}, index = null) => {
    const row = document.createElement("div");
    row.className = "pcp-decoration-row pcp-marker-dialog-row";
    if (index !== null) row.dataset.index = String(index);
    const color = document.createElement("input");
    color.type = "color";
    color.name = "color";
    setDialogInputValue(color, normalizeColor(marker.color, "#ffcc00"));
    const remove = document.createElement("input");
    remove.type = "checkbox";
    remove.name = "remove";
    row.append(createDialogField(index === null ? "Dot" : `Dot ${index + 1}`, color), createDialogField("Remove", remove));
    return row;
  };

  for (const [index, marker] of markers.entries()) markerRows.append(createMarkerRow(marker, index));
  const addMarkerButton = document.createElement("button");
  addMarkerButton.type = "button";
  addMarkerButton.className = "pcp-add-marker";
  addMarkerButton.innerHTML = '<i class="fa-solid fa-plus"></i> Add dot';
  markersSection.append(markerRows, addMarkerButton);
  dialogBody.append(markersSection);

  const barsSection = createDialogSection("Resource bars");
  const bottomOffset = document.createElement("input");
  bottomOffset.type = "number";
  bottomOffset.name = "bottomOffset";
  bottomOffset.min = "0";
  bottomOffset.max = "100";
  bottomOffset.step = "1";
  setDialogInputValue(bottomOffset, normalizeResourceBarOffset(framing.resourceBarOffset));

  const depletedOpacity = document.createElement("input");
  depletedOpacity.type = "number";
  depletedOpacity.name = "depletedOpacity";
  depletedOpacity.min = "0";
  depletedOpacity.max = "100";
  depletedOpacity.step = "1";
  setDialogInputValue(depletedOpacity, normalizeResourceBarDepletedOpacity(framing.resourceBarDepletedOpacity));

  const spacing = document.createElement("input");
  spacing.type = "number";
  spacing.name = "spacing";
  spacing.min = "0";
  spacing.max = "20";
  spacing.step = "1";
  setDialogInputValue(spacing, normalizeResourceBarSpacing(framing.resourceBarSpacing));

  const generalSettings = document.createElement("div");
  generalSettings.className = "pcp-resource-general-settings";
  generalSettings.append(createDialogField("Bottom offset (px)", bottomOffset), createDialogField("Depleted opacity (%)", depletedOpacity), createDialogField("Bar spacing (px)", spacing));
  barsSection.append(generalSettings);

  const applyBarsToAll = document.createElement("input");
  applyBarsToAll.type = "checkbox";
  applyBarsToAll.name = "applyBarsToAll";

  const barRows = document.createElement("div");
  barRows.className = "pcp-options-rows pcp-bar-rows";

  const createBarRow = (bar = {}, index = null) => {
    const row = document.createElement("div");
    row.className = "pcp-decoration-row pcp-resource-dialog-row";
    if (index !== null) row.dataset.index = String(index);
    const current = createResourceSelect(resources, bar.currentPath || "", "currentPath");
    const maximum = createResourceSelect(resources, bar.maximumPath || "", "maximumPath");
    const color = document.createElement("input");
    color.type = "color";
    color.name = "color";
    setDialogInputValue(color, bar.color || "#3ba55d");
    const height = document.createElement("input");
    height.type = "number";
    height.name = "height";
    height.min = "1";
    height.max = "20";
    height.step = "1";
    setDialogInputValue(height, Math.trunc(clamp(bar.height, 1, 20, 4)));
    const remove = document.createElement("input");
    remove.type = "checkbox";
    remove.name = "remove";
    const label = index === null ? "Current" : `Bar ${index + 1} current`;
    row.append(createDialogField(label, current), createDialogField("Maximum", maximum), createDialogField("Color", color), createDialogField("Height (px)", height), createDialogField("Remove", remove));
    return row;
  };

  for (const [index, bar] of bars.entries()) barRows.append(createBarRow(bar, index));

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "pcp-add-resource-bar";
  addButton.innerHTML = '<i class="fa-solid fa-plus"></i> Add another bar';
  barsSection.append(barRows, addButton, createDialogField("Apply bar settings to all visible characters", applyBarsToAll));
  dialogBody.append(barsSection);

  const readBar = (row, original = {}) => {
    return {
      id: original.id || foundry.utils.randomID(),
      color: normalizeColor(row.querySelector('[name="color"]')?.value, "#3ba55d"),
      currentPath: String(row.querySelector('[name="currentPath"]')?.value || ""),
      maximumPath: String(row.querySelector('[name="maximumPath"]')?.value || ""),
      height: Math.trunc(clamp(row.querySelector('[name="height"]')?.value, 1, 20, 4))
    };
  };

  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: `Portrait options — ${actor.name}` },
    content,
    modal: true,
    render: (_event, dialog) => {
      const form = dialog.element.querySelector("form");
      const markerButton = form?.querySelector(".pcp-add-marker");
      markerButton?.addEventListener("click", () => {
        form.querySelector(".pcp-marker-rows")?.append(createMarkerRow());
      });
      const barButton = form?.querySelector(".pcp-add-resource-bar");
      barButton?.addEventListener("click", () => {
        form.querySelector(".pcp-bar-rows")?.append(createBarRow());
      });
      const customNameToggle = form?.elements.useCustomName;
      const customNameInput = form?.elements.customName;
      const updateCustomNameState = () => {
        if (customNameInput) customNameInput.disabled = !customNameToggle?.checked;
      };
      customNameToggle?.addEventListener("change", updateCustomNameState);
      updateCustomNameState();
    },
    buttons: [
      {
        action: "save",
        label: "Save",
        icon: "fa-solid fa-floppy-disk",
        default: true,
        callback: (_event, button) => {
          const updatedMarkers = [...button.form.querySelectorAll(".pcp-marker-dialog-row")]
            .filter(row => !row.querySelector('[name="remove"]')?.checked)
            .map(row => ({
              id: markers[Number(row.dataset.index)]?.id || foundry.utils.randomID(),
              color: normalizeColor(row.querySelector('[name="color"]')?.value, "#ffcc00")
            }));
          const updatedBars = [...button.form.querySelectorAll(".pcp-resource-dialog-row")]
            .filter(row => !row.querySelector('[name="remove"]')?.checked)
            .map(row => readBar(row, bars[Number(row.dataset.index)]));
          return {
            markers: updatedMarkers,
            bars: updatedBars.filter(bar => bar.currentPath && bar.maximumPath),
            bottomOffset: normalizeResourceBarOffset(button.form.elements.bottomOffset?.value),
            depletedOpacity: normalizeResourceBarDepletedOpacity(button.form.elements.depletedOpacity?.value),
            spacing: normalizeResourceBarSpacing(button.form.elements.spacing?.value),
            borderColor: normalizeColor(button.form.elements.borderColor?.value, normalizeColor(config.borderColor)),
            borderWidth: normalizeBorderWidth(button.form.elements.borderWidth?.value),
            nameFontSize: normalizeNameFontSize(button.form.elements.nameFontSize?.value, config.size),
            nameColor: normalizeColor(button.form.elements.nameColor?.value, "#ffffff"),
            nameOffset: normalizeNameOffset(button.form.elements.nameOffset?.value),
            useCustomName: Boolean(button.form.elements.useCustomName?.checked),
            customName: normalizeCustomName(button.form.elements.customName?.value),
            applyBorderToAll: Boolean(button.form.elements.applyBorderToAll?.checked),
            applyNameStyleToAll: Boolean(button.form.elements.applyNameStyleToAll?.checked),
            applyBarsToAll: Boolean(button.form.elements.applyBarsToAll?.checked)
          };
        }
      },
      { action: "cancel", label: "Cancel", icon: "fa-solid fa-xmark" }
    ]
  });

  if (!result || !Array.isArray(result.markers) || !Array.isArray(result.bars)) return;
  config.actors ??= {};
  config.actors[actorId] = {
    ...(config.actors[actorId] || {}),
    markers: normalizeMarkers(result.markers),
    resourceBars: normalizeResourceBars(result.bars),
    resourceBarOffset: result.bottomOffset,
    resourceBarDepletedOpacity: result.depletedOpacity,
    resourceBarSpacing: result.spacing,
    borderColor: result.borderColor,
    borderWidth: result.borderWidth,
    nameFontSize: result.nameFontSize,
    nameColor: result.nameColor,
    nameOffset: result.nameOffset,
    useCustomName: result.useCustomName,
    customName: result.customName
  };

  for (const visibleActorId of config.order || []) {
    if (visibleActorId === actorId) continue;
    const visibleFraming = config.actors[visibleActorId] || {};
    if (result.applyBorderToAll) {
      visibleFraming.borderColor = result.borderColor;
      visibleFraming.borderWidth = result.borderWidth;
    }
    if (result.applyNameStyleToAll) {
      visibleFraming.nameFontSize = result.nameFontSize;
      visibleFraming.nameColor = result.nameColor;
      visibleFraming.nameOffset = result.nameOffset;
    }
    if (result.applyBarsToAll) {
      visibleFraming.resourceBars = normalizeResourceBars(foundry.utils.deepClone(result.bars));
      visibleFraming.resourceBarOffset = result.bottomOffset;
      visibleFraming.resourceBarDepletedOpacity = result.depletedOpacity;
      visibleFraming.resourceBarSpacing = result.spacing;
    }
    config.actors[visibleActorId] = visibleFraming;
  }
  await game.settings.set(MODULE_ID, SETTING_KEY, config);
}

function removeHud() {
  document.getElementById("pcp-party-hud")?.remove();
}

function renderHud() {
  if (!game?.ready) return;

  removeHud();
  const config = getConfig();
  const actorIds = Array.isArray(config.order) ? config.order : [];
  if (!actorIds.length) return;

  const hud = document.createElement("div");
  hud.id = "pcp-party-hud";
  hud.classList.add("pcp-party-hud", `pcp-${config.position}`, `pcp-${config.orientation}`);
  hud.style.setProperty("--pcp-size", `${clamp(config.size, 48, 160, 86)}px`);
  hud.style.setProperty("--pcp-offset-x", `${clamp(config.offsetX, 0, 1000, 16)}px`);
  hud.style.setProperty("--pcp-offset-y", `${clamp(config.offsetY, 0, 1000, 16)}px`);

  for (const actorId of actorIds) {
    const actor = game.actors.get(actorId);
    if (!actor) continue;

    const framing = config.actors?.[actorId] ?? {};
    const x = clamp(framing.x, 0, 100, 50);
    const y = clamp(framing.y, 0, 100, 50);
    const zoom = clamp(framing.zoom, 1, 3, 1);

    const card = document.createElement("div");
    card.className = "pcp-card";
    card.dataset.actorId = actor.id;
    card.title = actor.name;
    card.style.setProperty("--pcp-border-color", normalizeColor(framing.borderColor, normalizeColor(config.borderColor)));
    card.style.setProperty("--pcp-border-width", `${normalizeBorderWidth(framing.borderWidth)}px`);
    card.style.setProperty("--pcp-name-font-size", `${normalizeNameFontSize(framing.nameFontSize, config.size)}px`);
    card.style.setProperty("--pcp-name-color", normalizeColor(framing.nameColor, "#ffffff"));
    card.style.setProperty("--pcp-name-offset", `${normalizeNameOffset(framing.nameOffset)}px`);
    card.style.setProperty("--pcp-name-base-bottom", "0px");

    const portrait = document.createElement("div");
    portrait.className = "pcp-portrait";

    const img = document.createElement("img");
    img.src = actor.img || "icons/svg/mystery-man.svg";
    img.alt = actor.name;
    img.draggable = false;
    img.style.objectPosition = `${x}% ${y}%`;
    img.style.transformOrigin = `${x}% ${y}%`;
    img.style.transform = `scale(${zoom})`;

    portrait.appendChild(img);

    const markers = normalizeMarkers(framing.markers);
    if (markers.length) {
      const markerContainer = document.createElement("div");
      markerContainer.className = "pcp-color-markers";
      for (const marker of markers) {
        const dot = document.createElement("span");
        dot.className = "pcp-color-marker";
        dot.style.setProperty("--pcp-marker-color", marker.color);
        markerContainer.appendChild(dot);
      }
      portrait.appendChild(markerContainer);
    }

    const resourceBars = normalizeResourceBars(framing.resourceBars);
    if (resourceBars.length) {
      const bottomOffset = normalizeResourceBarOffset(framing.resourceBarOffset);
      const depletedOpacity = normalizeResourceBarDepletedOpacity(framing.resourceBarDepletedOpacity);
      const spacing = normalizeResourceBarSpacing(framing.resourceBarSpacing);
      const barContainer = document.createElement("div");
      barContainer.className = "pcp-resource-bars";
      barContainer.style.setProperty("--pcp-resource-bottom-offset", `${bottomOffset}px`);
      barContainer.style.setProperty("--pcp-resource-bar-spacing", `${spacing}px`);
      let renderedBarHeight = 0;
      for (const bar of resourceBars) {
        const current = Number(foundry.utils.getProperty(actor, bar.currentPath));
        const maximum = Number(foundry.utils.getProperty(actor, bar.maximumPath));
        if (!Number.isFinite(current) || !Number.isFinite(maximum) || maximum <= 0) continue;
        const track = document.createElement("div");
        track.className = "pcp-resource-bar";
        track.title = `${bar.currentPath}: ${current} / ${maximum}`;
        track.style.setProperty("--pcp-resource-color", bar.color);
        track.style.setProperty("--pcp-resource-depleted-opacity", `${depletedOpacity}%`);
        track.style.setProperty("--pcp-resource-bar-height", `${bar.height}px`);
        const fill = document.createElement("span");
        fill.style.width = `${clamp((current / maximum) * 100, 0, 100, 0)}%`;
        track.appendChild(fill);
        barContainer.appendChild(track);
        renderedBarHeight += bar.height;
      }
      if (barContainer.children.length) {
        card.classList.add("pcp-has-resource-bars");
        const spacingHeight = Math.max(0, barContainer.children.length - 1) * spacing;
        card.style.setProperty("--pcp-name-base-bottom", `${bottomOffset + renderedBarHeight + spacingHeight}px`);
        portrait.appendChild(barContainer);
      }
    }
    card.appendChild(portrait);

    if (config.showNames !== false) {
      const label = document.createElement("div");
      label.className = "pcp-name";
      const customName = normalizeCustomName(framing.customName);
      label.textContent = framing.useCustomName && customName ? customName : actor.name;
      card.appendChild(label);
    }

    card.addEventListener("click", () => {
      if (actor.isOwner || game.user.isGM) actor.sheet?.render(true);
    });
    if (game.user.isGM) {
      card.addEventListener("contextmenu", event => {
        event.preventDefault();
        event.stopPropagation();
        void managePortraitOptions(actor.id);
      });
    }

    hud.appendChild(card);
  }

  if (!hud.children.length) return;
  document.body.appendChild(hud);
}

async function submitConfiguration(_event, _form, formData) {
  const expanded = foundry.utils.expandObject(formData.object);
  const oldConfig = getConfig();
  const previousOrderIndex = new Map((oldConfig.order || []).map((id, index) => [id, index]));
  const selectedActors = [];
  const actors = {};

  for (const [actorIndex, actor] of game.actors.contents.entries()) {
    const row = expanded.actors?.[actor.id] ?? {};
    if (!row.enabled) continue;

    const oldActorConfig = oldConfig.actors?.[actor.id] ?? {};
    const sortOrder = Math.trunc(clamp(row.sortOrder, -9999, 9999, oldActorConfig.sortOrder ?? 0));
    selectedActors.push({
      id: actor.id,
      sortOrder,
      previousIndex: previousOrderIndex.get(actor.id) ?? previousOrderIndex.size + actorIndex
    });
    actors[actor.id] = {
      x: clamp(row.x, 0, 100, oldActorConfig.x ?? 50),
      y: clamp(row.y, 0, 100, oldActorConfig.y ?? 50),
      zoom: clamp(row.zoom, 1, 3, oldActorConfig.zoom ?? 1),
      sortOrder,
      markers: normalizeMarkers(oldActorConfig.markers),
      resourceBars: normalizeResourceBars(oldActorConfig.resourceBars),
      resourceBarOffset: normalizeResourceBarOffset(oldActorConfig.resourceBarOffset),
      resourceBarDepletedOpacity: normalizeResourceBarDepletedOpacity(oldActorConfig.resourceBarDepletedOpacity),
      resourceBarSpacing: normalizeResourceBarSpacing(oldActorConfig.resourceBarSpacing),
      borderColor: normalizeColor(oldActorConfig.borderColor, normalizeColor(oldConfig.borderColor)),
      borderWidth: normalizeBorderWidth(oldActorConfig.borderWidth),
      nameFontSize: normalizeNameFontSize(oldActorConfig.nameFontSize, oldConfig.size),
      nameColor: normalizeColor(oldActorConfig.nameColor, "#ffffff"),
      nameOffset: normalizeNameOffset(oldActorConfig.nameOffset),
      useCustomName: Boolean(oldActorConfig.useCustomName),
      customName: normalizeCustomName(oldActorConfig.customName)
    };
  }

  selectedActors.sort((a, b) => a.sortOrder - b.sortOrder || a.previousIndex - b.previousIndex);

  const config = {
    position: expanded.position || DEFAULT_CONFIG.position,
    orientation: expanded.orientation || DEFAULT_CONFIG.orientation,
    size: clamp(expanded.size, 48, 160, DEFAULT_CONFIG.size),
    offsetX: clamp(expanded.offsetX, 0, 1000, DEFAULT_CONFIG.offsetX),
    offsetY: clamp(expanded.offsetY, 0, 1000, DEFAULT_CONFIG.offsetY),
    showNames: Boolean(expanded.showNames),
    order: selectedActors.map(actor => actor.id),
    actors
  };

  await game.settings.set(MODULE_ID, SETTING_KEY, config);
  renderHud();
  ui.notifications.info("Party Corner Portraits: configuration saved.");
}

class PartyCornerPortraitsConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "party-corner-portraits-config",
    tag: "form",
    position: {
      width: 800,
      height: Math.max(400, Math.min(860, window.innerHeight - 80))
    },
    window: {
      title: "Party Corner Portraits — Configuration",
      icon: "fa-solid fa-users",
      resizable: true,
      contentClasses: ["party-corner-portraits-form"]
    },
    form: {
      closeOnSubmit: true,
      submitOnChange: false,
      handler: submitConfiguration
    }
  };

  static PARTS = {
    form: {
      template: `modules/${MODULE_ID}/templates/config.html`
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const config = getConfig();
    const orderIndex = new Map((config.order || []).map((id, index) => [id, index]));

    const actors = game.actors.contents
      .map(actor => {
        const framing = config.actors?.[actor.id] ?? {};
        return {
          id: actor.id,
          name: actor.name,
          img: actor.img || "icons/svg/mystery-man.svg",
          enabled: orderIndex.has(actor.id),
          order: orderIndex.get(actor.id) ?? 999999,
          sortOrder: Math.trunc(clamp(framing.sortOrder, -9999, 9999, 0)),
          x: clamp(framing.x, 0, 100, 50),
          y: clamp(framing.y, 0, 100, 50),
          zoom: clamp(framing.zoom, 1, 3, 1),
          borderColor: normalizeColor(framing.borderColor, normalizeColor(config.borderColor)),
          borderWidth: normalizeBorderWidth(framing.borderWidth)
        };
      })
      .sort((a, b) => {
        if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
        if (a.enabled && b.enabled && a.order !== b.order) return a.order - b.order;
        return a.name.localeCompare(b.name, game.i18n.lang);
      });

    return {
      ...context,
      config,
      actors,
      positions: [
        { value: "top-left", label: "Top left", selected: config.position === "top-left" },
        { value: "top-right", label: "Top right", selected: config.position === "top-right" },
        { value: "bottom-left", label: "Bottom left", selected: config.position === "bottom-left" },
        { value: "bottom-right", label: "Bottom right", selected: config.position === "bottom-right" }
      ],
      orientations: [
        { value: "horizontal", label: "Horizontal", selected: config.orientation === "horizontal" },
        { value: "vertical", label: "Vertical", selected: config.orientation === "vertical" }
      ]
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    for (const input of this.element.querySelectorAll(".pcp-framing input[type='range']")) {
      input.addEventListener("input", event => {
        const currentInput = event.currentTarget;
        const row = currentInput.closest(".pcp-actor-row");
        if (!row) return;

        const actorId = row.dataset.actorId;
        const preview = row.querySelector(".pcp-config-preview img");
        if (!preview) return;

        const x = row.querySelector(`input[name="actors.${actorId}.x"]`)?.value ?? 50;
        const y = row.querySelector(`input[name="actors.${actorId}.y"]`)?.value ?? 50;
        const zoom = row.querySelector(`input[name="actors.${actorId}.zoom"]`)?.value ?? 1;

        preview.style.objectPosition = `${x}% ${y}%`;
        preview.style.transformOrigin = `${x}% ${y}%`;
        preview.style.transform = `scale(${zoom})`;

        const output = currentInput.parentElement?.querySelector("output");
        if (output) {
          output.value = currentInput.name.endsWith(".zoom")
            ? `${Number(currentInput.value).toFixed(2)}×`
            : `${currentInput.value}%`;
        }
      });
    }

    for (const checkbox of this.element.querySelectorAll(".pcp-enable")) {
      checkbox.addEventListener("change", event => {
        const currentCheckbox = event.currentTarget;
        const row = currentCheckbox.closest(".pcp-actor-row");
        row?.classList.toggle("pcp-disabled", !currentCheckbox.checked);
      });
    }

    const actorSearch = this.element.querySelector(".pcp-actor-search");
    const actorRows = [...this.element.querySelectorAll(".pcp-actor-row")];
    const noResults = this.element.querySelector(".pcp-no-results");
    if (actorSearch) {
      actorSearch.addEventListener("input", event => {
        const query = event.currentTarget.value.trim().toLocaleLowerCase(game.i18n.lang);
        let matches = 0;

        for (const row of actorRows) {
          const name = row.dataset.actorName?.toLocaleLowerCase(game.i18n.lang) ?? "";
          const visible = !query || name.includes(query);
          row.hidden = !visible;
          if (visible) matches += 1;
        }

        if (noResults) noResults.hidden = matches > 0;
      });
    }
  }
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, SETTING_KEY, {
    name: "Party Corner Portraits Config",
    scope: "world",
    config: false,
    type: Object,
    default: foundry.utils.deepClone(DEFAULT_CONFIG),
    onChange: () => renderHud()
  });

  game.settings.registerMenu(MODULE_ID, "configuration", {
    name: "Configure party portraits",
    label: "Configure Portraits",
    hint: "Choose the characters every player will see and adjust each portrait's framing.",
    icon: "fa-solid fa-users",
    type: PartyCornerPortraitsConfig,
    restricted: true
  });
});

Hooks.once("ready", () => renderHud());
Hooks.on("canvasReady", () => renderHud());
Hooks.on("updateActor", actor => {
  const config = getConfig();
  if (config.order?.includes(actor.id)) renderHud();
});
Hooks.on("deleteActor", actor => {
  const config = getConfig();
  if (config.order?.includes(actor.id)) renderHud();
});
