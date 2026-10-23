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
    maximumPath: String(bar?.maximumPath || "")
  }));
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

async function saveActorDecorations(actorId, markers, resourceBars) {
  const config = getConfig();
  config.actors ??= {};
  config.actors[actorId] = {
    ...(config.actors[actorId] || {}),
    markers: normalizeMarkers(markers),
    resourceBars: normalizeResourceBars(resourceBars)
  };
  await game.settings.set(MODULE_ID, SETTING_KEY, config);
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

async function manageColorMarkers(actorId) {
  const actor = game.actors.get(actorId);
  if (!actor) return;
  const framing = getConfig().actors?.[actorId] ?? {};
  const markers = normalizeMarkers(framing.markers);
  const content = document.createElement("div");
  const dialogBody = document.createElement("div");
  dialogBody.className = "pcp-decoration-dialog";
  content.append(dialogBody);

  for (const [index, marker] of markers.entries()) {
    const row = document.createElement("div");
    row.className = "pcp-decoration-row";
    row.dataset.index = String(index);
    const color = document.createElement("input");
    color.type = "color";
    color.name = "color";
    setDialogInputValue(color, marker.color);
    const remove = document.createElement("input");
    remove.type = "checkbox";
    remove.name = "remove";
    row.append(createDialogField(`Dot ${index + 1}`, color), createDialogField("Remove", remove));
    dialogBody.append(row);
  }

  const add = document.createElement("div");
  add.className = "pcp-decoration-add";
  const addEnabled = document.createElement("input");
  addEnabled.type = "checkbox";
  addEnabled.name = "add";
  const addColor = document.createElement("input");
  addColor.type = "color";
  addColor.name = "addColor";
  setDialogInputValue(addColor, "#ffcc00");
  add.append(createDialogField("Add another dot", addEnabled), createDialogField("Color", addColor));
  dialogBody.append(add);

  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: `Color dots — ${actor.name}` },
    content,
    modal: true,
    buttons: [
      {
        action: "save",
        label: "Save",
        icon: "fa-solid fa-floppy-disk",
        default: true,
        callback: (_event, button) => {
          const updated = [...button.form.querySelectorAll(".pcp-decoration-row")]
            .filter(row => !row.querySelector('[name="remove"]')?.checked)
            .map(row => ({
              id: markers[Number(row.dataset.index)]?.id || foundry.utils.randomID(),
              color: normalizeColor(row.querySelector('[name="color"]')?.value, "#ffcc00")
            }));
          if (button.form.elements.add?.checked) {
            updated.push({ id: foundry.utils.randomID(), color: normalizeColor(button.form.elements.addColor?.value, "#ffcc00") });
          }
          return updated;
        }
      },
      { action: "cancel", label: "Cancel", icon: "fa-solid fa-xmark" }
    ]
  });

  if (!Array.isArray(result)) return;
  await saveActorDecorations(actorId, result, normalizeResourceBars(framing.resourceBars));
}

async function manageResourceBars(actorId) {
  const actor = game.actors.get(actorId);
  if (!actor) return;
  const framing = getConfig().actors?.[actorId] ?? {};
  const bars = normalizeResourceBars(framing.resourceBars);
  const resources = getNumericActorResources(actor);
  const content = document.createElement("div");
  const dialogBody = document.createElement("div");
  dialogBody.className = "pcp-decoration-dialog";
  content.append(dialogBody);

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
    const remove = document.createElement("input");
    remove.type = "checkbox";
    remove.name = "remove";
    const label = index === null ? "Current" : `Bar ${index + 1} current`;
    row.append(createDialogField(label, current), createDialogField("Maximum", maximum), createDialogField("Color", color), createDialogField("Remove", remove));
    return row;
  };

  for (const [index, bar] of bars.entries()) {
    dialogBody.append(createBarRow(bar, index));
  }

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "pcp-add-resource-bar";
  addButton.innerHTML = '<i class="fa-solid fa-plus"></i> Add another bar';
  dialogBody.append(addButton);

  const readBar = (row, original = {}) => {
    return {
      id: original.id || foundry.utils.randomID(),
      color: normalizeColor(row.querySelector('[name="color"]')?.value, "#3ba55d"),
      currentPath: String(row.querySelector('[name="currentPath"]')?.value || ""),
      maximumPath: String(row.querySelector('[name="maximumPath"]')?.value || "")
    };
  };

  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: `Resource bars — ${actor.name}` },
    content,
    modal: true,
    render: (_event, dialog) => {
      const form = dialog.element.querySelector("form");
      const button = form?.querySelector(".pcp-add-resource-bar");
      button?.addEventListener("click", () => {
        button.before(createBarRow());
      });
    },
    buttons: [
      {
        action: "save",
        label: "Save",
        icon: "fa-solid fa-floppy-disk",
        default: true,
        callback: (_event, button) => {
          const updated = [...button.form.querySelectorAll(".pcp-decoration-row")]
            .filter(row => !row.querySelector('[name="remove"]')?.checked)
            .map(row => readBar(row, bars[Number(row.dataset.index)]));
          return updated.filter(bar => bar.currentPath && bar.maximumPath);
        }
      },
      { action: "cancel", label: "Cancel", icon: "fa-solid fa-xmark" }
    ]
  });

  if (!Array.isArray(result)) return;
  await saveActorDecorations(actorId, normalizeMarkers(framing.markers), result);
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
  hud.style.setProperty("--pcp-border-color", normalizeColor(config.borderColor));

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
      const barContainer = document.createElement("div");
      barContainer.className = "pcp-resource-bars";
      for (const bar of resourceBars) {
        const current = Number(foundry.utils.getProperty(actor, bar.currentPath));
        const maximum = Number(foundry.utils.getProperty(actor, bar.maximumPath));
        if (!Number.isFinite(current) || !Number.isFinite(maximum) || maximum <= 0) continue;
        const track = document.createElement("div");
        track.className = "pcp-resource-bar";
        track.title = `${bar.currentPath}: ${current} / ${maximum}`;
        track.style.setProperty("--pcp-resource-color", bar.color);
        const fill = document.createElement("span");
        fill.style.width = `${clamp((current / maximum) * 100, 0, 100, 0)}%`;
        track.appendChild(fill);
        barContainer.appendChild(track);
      }
      if (barContainer.children.length) {
        card.classList.add("pcp-has-resource-bars");
        card.style.setProperty("--pcp-resource-stack-height", `${barContainer.children.length * 4.5 + 1}px`);
        portrait.appendChild(barContainer);
      }
    }
    card.appendChild(portrait);

    if (config.showNames !== false) {
      const label = document.createElement("div");
      label.className = "pcp-name";
      label.textContent = actor.name;
      card.appendChild(label);
    }

    card.addEventListener("click", () => {
      if (actor.isOwner || game.user.isGM) actor.sheet?.render(true);
    });

    hud.appendChild(card);
  }

  if (!hud.children.length) return;
  document.body.appendChild(hud);

  if (game.user.isGM) {
    const { ContextMenu } = foundry.applications.ux;
    new ContextMenu(hud, ".pcp-card", [
      {
        name: "Manage color dots",
        icon: '<i class="fa-solid fa-circle"></i>',
        callback: target => {
          const element = target?.jquery ? target[0] : target;
          return manageColorMarkers(element?.dataset.actorId);
        }
      },
      {
        name: "Manage resource bars",
        icon: '<i class="fa-solid fa-bars-progress"></i>',
        callback: target => {
          const element = target?.jquery ? target[0] : target;
          return manageResourceBars(element?.dataset.actorId);
        }
      }
    ], { fixed: true });
  }
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

    const sortOrder = Math.trunc(clamp(row.sortOrder, -9999, 9999, oldConfig.actors?.[actor.id]?.sortOrder ?? 0));
    selectedActors.push({
      id: actor.id,
      sortOrder,
      previousIndex: previousOrderIndex.get(actor.id) ?? previousOrderIndex.size + actorIndex
    });
    actors[actor.id] = {
      x: clamp(row.x, 0, 100, oldConfig.actors?.[actor.id]?.x ?? 50),
      y: clamp(row.y, 0, 100, oldConfig.actors?.[actor.id]?.y ?? 50),
      zoom: clamp(row.zoom, 1, 3, oldConfig.actors?.[actor.id]?.zoom ?? 1),
      sortOrder,
      markers: normalizeMarkers(oldConfig.actors?.[actor.id]?.markers),
      resourceBars: normalizeResourceBars(oldConfig.actors?.[actor.id]?.resourceBars)
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
    borderColor: normalizeColor(expanded.borderColor),
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
          zoom: clamp(framing.zoom, 1, 3, 1)
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

    const borderColorInput = this.element.querySelector('input[name="borderColor"]');
    if (borderColorInput) {
      const applyBorderPreview = value => {
        this.element.style.setProperty("--pcp-border-color", normalizeColor(value));
      };

      applyBorderPreview(borderColorInput.value);
      borderColorInput.addEventListener("input", event => {
        applyBorderPreview(event.currentTarget.value);
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
