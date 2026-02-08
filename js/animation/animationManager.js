const DEFAULT_EASING = "cubic-bezier(0.22, 0.7, 0.22, 1)";

function hasReducedMotionPreference() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export class AnimationManager {
  constructor() {
    this.reducedMotion = hasReducedMotionPreference();
  }

  animateTransform(element, fromTransform, toTransform, duration = 220, easing = DEFAULT_EASING) {
    if (!element) {
      return null;
    }

    if (this.reducedMotion || typeof element.animate !== "function") {
      element.style.transform = toTransform;
      return null;
    }

    return element.animate(
      [
        { transform: fromTransform },
        { transform: toTransform }
      ],
      {
        duration,
        easing,
        fill: "forwards"
      }
    );
  }

  animateReorder(container, orderedNodes, duration = 260, easing = DEFAULT_EASING) {
    if (!container || !orderedNodes.length) {
      return;
    }

    const firstPositions = new Map();
    orderedNodes.forEach((node) => {
      firstPositions.set(node, node.getBoundingClientRect());
    });

    orderedNodes.forEach((node) => {
      container.appendChild(node);
    });

    orderedNodes.forEach((node) => {
      const firstRect = firstPositions.get(node);
      const lastRect = node.getBoundingClientRect();
      const deltaY = firstRect.top - lastRect.top;

      if (Math.abs(deltaY) < 0.5) {
        return;
      }

      this.animateTransform(
        node,
        `translate3d(0, ${deltaY}px, 0)`,
        "translate3d(0, 0, 0)",
        duration,
        easing
      );
    });
  }

  animateDrawCardFlip(drawCardEl, swapFaceCallback) {
    if (!drawCardEl) {
      return;
    }

    if (this.reducedMotion || typeof drawCardEl.animate !== "function") {
      swapFaceCallback();
      return;
    }

    const firstHalf = drawCardEl.animate(
      [
        { transform: "rotateY(0deg)" },
        { transform: "rotateY(90deg)" }
      ],
      {
        duration: 140,
        easing: "ease-in",
        fill: "forwards"
      }
    );

    firstHalf.onfinish = () => {
      swapFaceCallback();
      drawCardEl.animate(
        [
          { transform: "rotateY(90deg)" },
          { transform: "rotateY(0deg)" }
        ],
        {
          duration: 140,
          easing: "ease-out",
          fill: "forwards"
        }
      );
    };
  }
}

