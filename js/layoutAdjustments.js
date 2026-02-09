import { LAYOUT_ADJUSTMENTS_CONFIG } from "./layoutAdjustments.config.js";

/*
  Racing Suits Layout Adjustments

  Edit values in js/layoutAdjustments.config.js to tune each screen and element.

  Supported properties per selector:
  - x, y: translate offset (number => px, string => CSS value)
  - scale: uniform transform scale
  - scaleX, scaleY: axis-specific scale override
  - sizeX, sizeY: width / height
  - positionX, positionY: left / top offset (forces position: relative when needed)
  - padding
  - paddingX, paddingY
  - paddingTop, paddingRight, paddingBottom, paddingLeft
  - origin: transform-origin (example: "center center", "top left")

  Special selector keys:
  - :screen => the screen container itself (#screen-...)
  - :app => #app
  - :root => html
  - :body => body
*/

export const ADJUSTMENT_PROPS_HELP = Object.freeze({
  x: "Move element on X axis (px unless you pass a CSS unit string).",
  y: "Move element on Y axis (px unless you pass a CSS unit string).",
  scale: "Scale element size (1 = normal, 1.1 = 10% larger).",
  scaleX: "Scale element width only (overrides uniform scale on X axis).",
  scaleY: "Scale element height only (overrides uniform scale on Y axis).",
  sizeX: "Set width.",
  sizeY: "Set height.",
  positionX: "Set left offset (requires relative/absolute positioning).",
  positionY: "Set top offset (requires relative/absolute positioning).",
  padding: "Set all padding sides.",
  paddingX: "Set left and right padding.",
  paddingY: "Set top and bottom padding.",
  paddingTop: "Set top padding.",
  paddingRight: "Set right padding.",
  paddingBottom: "Set bottom padding.",
  paddingLeft: "Set left padding.",
  origin: "Set transform origin."
});

const SCREEN_TARGETS = {
  global: [
    ":root",
    ":body",
    ":app",
    ".app-header",
    ".player-profile",
    ".player-avatar",
    ".player-meta",
    ".player-kicker",
    ".tagline",
    ".player-stats",
    "#chip-count",
    "#floating-nav",
    "#floating-menu-btn",
    "#screen-transition-streak"
  ],

  "screen-banner": [
    ":screen",
    ".banner-image"
  ],

  "screen-suit": [
    ":screen",
    "#suit-title",
    "#suit-options",
    ".suit-option",
    ".suit-racer-image",
    "#suit-confirm-btn"
  ],

  "screen-ante": [
    ":screen",
    "#ante-title",
    ".ante-panel",
    ".ante-summary",
    "#available-chip-count",
    ".ante-slider-wrap",
    "#ante-slider",
    ".ante-slider-labels",
    "#ante-min-label",
    "#ante-max-label",
    ".ante-value",
    "#ante-value",
    ".ante-racer-stage",
    "#ante-racer-image",
    ".ante-actions",
    "#ante-back-btn",
    "#ante-confirm-btn"
  ],

  "screen-menu": [
    ":screen",
    "#menu-title",
    ".menu-panel",
    "#menu-home-btn",
    "#menu-leaderboard-btn",
    "#menu-settings-btn",
    "#menu-bsg-btn",
    "#menu-store-btn",
    "#menu-back-btn"
  ],

  "screen-stats": [
    ":screen",
    "#stats-title",
    ".stats-page-tabs",
    ".stats-page-btn",
    "#stats-page-wins-btn",
    "#stats-page-streak-btn",
    "#stats-page-chips-btn",
    ".stats-leaderboards",
    ".stats-board",
    ".leaderboard-page",
    ".medal-strip",
    ".leaderboard-main-value",
    ".player-position-note",
    "#wins-board-page",
    "#streak-board-page",
    "#chips-board-page",
    "#wins-main-value",
    "#streak-main-value",
    "#chips-main-value",
    "#wins-player-position",
    "#streak-player-position",
    "#chips-player-position",
    "#stats-menu-btn",
    "#stats-selection-btn"
  ],

  "screen-bsg": [
    ":screen",
    "#bsg-title",
    ".info-panel",
    "#bsg-menu-btn"
  ],

  "screen-store": [
    ":screen",
    "#store-title",
    ".info-panel",
    "#store-menu-btn"
  ],

  "screen-settings": [
    ":screen",
    "#settings-title",
    ".settings-panel",
    ".settings-row",
    "#settings-sound-toggle",
    "#settings-music-toggle",
    "#settings-instant-win-toggle",
    "#settings-menu-btn"
  ],

  "screen-race": [
    ":screen",
    "#race-title",
    ".race-layout",
    ".track-board",
    ".track-viewport",
    "#race-grid",
    ".track-row",
    ".track-row.finish-row",
    ".track-row.start-row",
    ".track-cell",
    ".track-cell.lane-cell",
    ".track-cell.side-card-cell",
    ".side-card-image",
    ".race-marker-layer",
    ".lane-racer-marker",
    ".lane-racer-icon",
    ".race-sidebar",
    "#race-rankings",
    ".leaderboard-entry",
    ".leaderboard-racer",
    ".draw-area",
    "#current-draw-card",
    ".draw-card",
    ".draw-card-image",
    ".draw-card-back",
    ".race-start-sequence",
    ".start-lights",
    ".start-light",
    ".start-go"
  ],

  "screen-result": [
    ":screen",
    "#result-title",
    "#result-banner",
    "#result-showcase",
    ".result-showcase",
    "#result-crowd",
    "#result-confetti",
    ".winner-medal",
    ".result-trophy",
    "#result-winner-image",
    "#result-copy",
    "#race-again-btn"
  ]
};

export const DEFAULT_ADJUSTMENT_VALUES = Object.freeze({
  x: 0,
  y: 0,
  scale: 1,
  scaleX: "",
  scaleY: "",
  sizeX: "",
  sizeY: "",
  positionX: "",
  positionY: "",
  padding: "",
  paddingX: "",
  paddingY: "",
  paddingTop: "",
  paddingRight: "",
  paddingBottom: "",
  paddingLeft: "",
  origin: ""
});

const ADJUSTMENT_KEYS = Object.keys(DEFAULT_ADJUSTMENT_VALUES);

function createDefaultAdjustment() {
  return { ...DEFAULT_ADJUSTMENT_VALUES };
}

function createDefaultAdjustments(selectors) {
  return Object.fromEntries(
    selectors.map((selector) => {
      return [selector, createDefaultAdjustment()];
    })
  );
}

function createDefaultLayoutAdjustments() {
  return Object.fromEntries(
    Object.entries(SCREEN_TARGETS).map(([screenId, selectors]) => {
      return [screenId, createDefaultAdjustments(selectors)];
    })
  );
}

export const LAYOUT_ADJUSTMENTS = createDefaultLayoutAdjustments();

function applyConfiguredAdjustments(targetAdjustments, configuredAdjustments) {
  if (!configuredAdjustments || typeof configuredAdjustments !== "object") {
    return;
  }

  Object.entries(configuredAdjustments).forEach(([screenId, selectors]) => {
    if (!targetAdjustments[screenId] || !selectors || typeof selectors !== "object") {
      return;
    }

    Object.entries(selectors).forEach(([selector, adjustment]) => {
      if (!targetAdjustments[screenId][selector] || !adjustment || typeof adjustment !== "object") {
        return;
      }

      ADJUSTMENT_KEYS.forEach((key) => {
        if (hasOwn(adjustment, key)) {
          targetAdjustments[screenId][selector][key] = adjustment[key];
        }
      });
    });
  });
}

applyConfiguredAdjustments(LAYOUT_ADJUSTMENTS, LAYOUT_ADJUSTMENTS_CONFIG);

const HAS_INDIVIDUAL_TRANSFORM = "translate" in document.documentElement.style;

function hasOwn(target, key) {
  return Object.prototype.hasOwnProperty.call(target, key);
}

function hasDefinedValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function toLength(value) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === "") {
    return "";
  }
  if (typeof value === "number") {
    return `${value}px`;
  }
  return String(value);
}

function toScale(value) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === "") {
    return "";
  }
  return String(value);
}

function setInlineStyle(node, property, value) {
  if (value === undefined) {
    return;
  }
  if (value === "") {
    node.style.removeProperty(property);
    return;
  }
  node.style.setProperty(property, value);
}

function applyTranslationAndScale(node, adjustment) {
  const hasTranslate = hasOwn(adjustment, "x") || hasOwn(adjustment, "y");
  const hasScale = hasOwn(adjustment, "scale") || hasOwn(adjustment, "scaleX") || hasOwn(adjustment, "scaleY");

  if (!hasTranslate && !hasScale) {
    return;
  }

  const xValue = toLength(hasOwn(adjustment, "x") ? adjustment.x : 0) ?? "0px";
  const yValue = toLength(hasOwn(adjustment, "y") ? adjustment.y : 0) ?? "0px";
  const uniformScale = toScale(hasOwn(adjustment, "scale") ? adjustment.scale : 1) ?? "1";
  const hasScaleX = hasDefinedValue(adjustment.scaleX);
  const hasScaleY = hasDefinedValue(adjustment.scaleY);
  const scaleXValue = toScale(hasScaleX ? adjustment.scaleX : hasScaleY ? adjustment.scaleY : uniformScale) ?? uniformScale;
  const scaleYValue = toScale(hasScaleY ? adjustment.scaleY : hasScaleX ? adjustment.scaleX : uniformScale) ?? uniformScale;
  const isAxisScale = hasScaleX || hasScaleY;
  const scaleValue = isAxisScale ? `${scaleXValue} ${scaleYValue}` : uniformScale;

  if (HAS_INDIVIDUAL_TRANSFORM) {
    setInlineStyle(node, "translate", `${xValue} ${yValue}`);
    setInlineStyle(node, "scale", scaleValue);
    return;
  }

  const transformScale = isAxisScale
    ? `scale(${scaleXValue}, ${scaleYValue})`
    : `scale(${uniformScale})`;
  setInlineStyle(node, "transform", `translate(${xValue}, ${yValue}) ${transformScale}`);
}

function applyPositionOffset(node, adjustment) {
  const hasPositionOffset =
    (hasOwn(adjustment, "positionX") && hasDefinedValue(adjustment.positionX)) ||
    (hasOwn(adjustment, "positionY") && hasDefinedValue(adjustment.positionY));

  if (!hasPositionOffset) {
    return;
  }

  const computedPosition = getComputedStyle(node).position;
  if (computedPosition === "static") {
    node.style.position = "relative";
  }

  setInlineStyle(node, "left", toLength(adjustment.positionX));
  setInlineStyle(node, "top", toLength(adjustment.positionY));
}

function applyPadding(node, adjustment) {
  setInlineStyle(node, "padding", toLength(adjustment.padding));
  setInlineStyle(node, "padding-left", toLength(adjustment.paddingX));
  setInlineStyle(node, "padding-right", toLength(adjustment.paddingX));
  setInlineStyle(node, "padding-top", toLength(adjustment.paddingY));
  setInlineStyle(node, "padding-bottom", toLength(adjustment.paddingY));
  setInlineStyle(node, "padding-top", toLength(adjustment.paddingTop));
  setInlineStyle(node, "padding-right", toLength(adjustment.paddingRight));
  setInlineStyle(node, "padding-bottom", toLength(adjustment.paddingBottom));
  setInlineStyle(node, "padding-left", toLength(adjustment.paddingLeft));
}

function applySingleAdjustment(node, adjustment) {
  applyTranslationAndScale(node, adjustment);
  applyPositionOffset(node, adjustment);
  setInlineStyle(node, "transform-origin", adjustment.origin);
  setInlineStyle(node, "width", toLength(adjustment.sizeX));
  setInlineStyle(node, "height", toLength(adjustment.sizeY));
  applyPadding(node, adjustment);
}

function getScreenContainer(screenId) {
  if (screenId === "global") {
    return document;
  }
  return document.getElementById(screenId);
}

function getTargetNodes(container, selector) {
  if (selector === ":screen") {
    return container instanceof Element ? [container] : [];
  }
  if (selector === ":app") {
    const app = document.getElementById("app");
    return app ? [app] : [];
  }
  if (selector === ":root") {
    return [document.documentElement];
  }
  if (selector === ":body") {
    return [document.body];
  }
  return Array.from(container.querySelectorAll(selector));
}

export function applyLayoutAdjustments() {
  Object.entries(LAYOUT_ADJUSTMENTS).forEach(([screenId, selectors]) => {
    const screenContainer = getScreenContainer(screenId);
    if (!screenContainer || !selectors) {
      return;
    }

    Object.entries(selectors).forEach(([selector, adjustment]) => {
      if (!adjustment) {
        return;
      }

      const nodes = getTargetNodes(screenContainer, selector);
      nodes.forEach((node) => {
        applySingleAdjustment(node, adjustment);
      });
    });
  });
}

export function getLayoutAdjustmentTargets() {
  return SCREEN_TARGETS;
}

export function resetLayoutAdjustmentsToDefaults() {
  const defaultConfig = createDefaultLayoutAdjustments();

  Object.keys(LAYOUT_ADJUSTMENTS).forEach((screenId) => {
    delete LAYOUT_ADJUSTMENTS[screenId];
  });

  Object.assign(LAYOUT_ADJUSTMENTS, defaultConfig);
  applyConfiguredAdjustments(LAYOUT_ADJUSTMENTS, LAYOUT_ADJUSTMENTS_CONFIG);
  applyLayoutAdjustments();
}

let applyScheduled = false;

function scheduleApplyLayoutAdjustments() {
  if (applyScheduled) {
    return;
  }

  applyScheduled = true;
  window.requestAnimationFrame(() => {
    applyScheduled = false;
    applyLayoutAdjustments();
  });
}

function printLayoutHelp() {
  console.group("Racing Suits Layout Help");
  console.log("Properties:", ADJUSTMENT_PROPS_HELP);
  console.log("Default values:", DEFAULT_ADJUSTMENT_VALUES);
  console.log("Targets by screen:", SCREEN_TARGETS);
  console.log("Configured values source:", "js/layoutAdjustments.config.js");
  console.log("Current editable object:", LAYOUT_ADJUSTMENTS);
  console.log("Reset command: window.resetRacingSuitsLayoutAdjustments()");
  console.groupEnd();
}

function startLayoutAdjustments() {
  applyLayoutAdjustments();

  const observer = new MutationObserver(() => {
    scheduleApplyLayoutAdjustments();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  window.addEventListener("resize", scheduleApplyLayoutAdjustments);
}

if (typeof window !== "undefined") {
  window.RacingSuitsLayoutAdjustments = LAYOUT_ADJUSTMENTS;
  window.RacingSuitsLayoutAdjustmentTargets = SCREEN_TARGETS;
  window.RacingSuitsLayoutAdjustmentPropsHelp = ADJUSTMENT_PROPS_HELP;
  window.RacingSuitsLayoutAdjustmentDefaults = DEFAULT_ADJUSTMENT_VALUES;
  window.applyRacingSuitsLayoutAdjustments = applyLayoutAdjustments;
  window.resetRacingSuitsLayoutAdjustments = resetLayoutAdjustmentsToDefaults;
  window.printRacingSuitsLayoutHelp = printLayoutHelp;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startLayoutAdjustments, { once: true });
} else {
  startLayoutAdjustments();
}
