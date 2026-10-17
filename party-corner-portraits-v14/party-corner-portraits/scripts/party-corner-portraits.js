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
      sortOrder
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
