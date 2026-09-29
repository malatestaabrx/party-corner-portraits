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

class PartyCornerPortraitsConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "party-corner-portraits-config",
      title: "Party Corner Portraits — Configuración",
      template: `modules/${MODULE_ID}/templates/config.html`,
      width: 760,
      height: 720,
      resizable: true,
      closeOnSubmit: true,
      submitOnChange: false,
      submitOnClose: false
    });
  }

  async getData() {
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
      config,
      actors,
      positions: [
        { value: "top-left", label: "Arriba izquierda", selected: config.position === "top-left" },
        { value: "top-right", label: "Arriba derecha", selected: config.position === "top-right" },
        { value: "bottom-left", label: "Abajo izquierda", selected: config.position === "bottom-left" },
        { value: "bottom-right", label: "Abajo derecha", selected: config.position === "bottom-right" }
      ],
      orientations: [
        { value: "horizontal", label: "Horizontal", selected: config.orientation === "horizontal" },
        { value: "vertical", label: "Vertical", selected: config.orientation === "vertical" }
      ]
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".pcp-framing input[type='range']").on("input", event => {
      const input = event.currentTarget;
      const row = input.closest(".pcp-actor-row");
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

      const output = input.parentElement?.querySelector("output");
      if (output) {
        output.value = input.name.endsWith(".zoom") ? `${Number(input.value).toFixed(2)}×` : `${input.value}%`;
      }
    });

    html.find('input[name="borderColor"]').on("input", event => {
      const color = normalizeColor(event.currentTarget.value);
      html[0]?.style.setProperty("--pcp-border-color", color);
    });

    html.find(".pcp-enable").on("change", event => {
      const row = event.currentTarget.closest(".pcp-actor-row");
      row?.classList.toggle("pcp-disabled", !event.currentTarget.checked);
    });
  }

  async _updateObject(_event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    const oldConfig = getConfig();
    const order = [];
    const actors = {};

    for (const actor of game.actors.contents) {
      const row = expanded.actors?.[actor.id] ?? {};
      if (!row.enabled) continue;

      order.push(actor.id);
      actors[actor.id] = {
        x: clamp(row.x, 0, 100, oldConfig.actors?.[actor.id]?.x ?? 50),
        y: clamp(row.y, 0, 100, oldConfig.actors?.[actor.id]?.y ?? 50),
        zoom: clamp(row.zoom, 1, 3, oldConfig.actors?.[actor.id]?.zoom ?? 1)
      };
    }

    // Mantener primero el orden previo de los actores que siguen seleccionados.
    const previousOrder = (oldConfig.order || []).filter(id => order.includes(id));
    const newlySelected = order.filter(id => !previousOrder.includes(id));

    const config = {
      position: expanded.position || DEFAULT_CONFIG.position,
      orientation: expanded.orientation || DEFAULT_CONFIG.orientation,
      size: clamp(expanded.size, 48, 160, DEFAULT_CONFIG.size),
      offsetX: clamp(expanded.offsetX, 0, 1000, DEFAULT_CONFIG.offsetX),
      offsetY: clamp(expanded.offsetY, 0, 1000, DEFAULT_CONFIG.offsetY),
      showNames: Boolean(expanded.showNames),
      borderColor: normalizeColor(expanded.borderColor),
      order: [...previousOrder, ...newlySelected],
      actors
    };

    await game.settings.set(MODULE_ID, SETTING_KEY, config);
    renderHud();
    ui.notifications.info("Party Corner Portraits: configuración guardada.");
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
    name: "Configurar retratos del grupo",
    label: "Configurar retratos",
    hint: "Elige los personajes que verán todos los jugadores y ajusta el encuadre de cada retrato.",
    icon: "fas fa-users",
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
