import { SUITS } from "../data/suits.js";

export class SuitSelectionScreen {
  constructor({ screenEl, optionsEl, confirmButton }) {
    this.screenEl = screenEl;
    this.optionsEl = optionsEl;
    this.confirmButton = confirmButton;
    this.selectedSuitId = null;

    this.handlers = {
      onSuitPicked: () => {},
      onSuitLocked: () => {}
    };

    this.optionsEl.addEventListener("click", (event) => {
      const optionButton = event.target.closest("[data-suit-id]");
      if (!optionButton) {
        return;
      }
      this.selectSuit(optionButton.dataset.suitId);
    });

    this.confirmButton.addEventListener("click", () => {
      if (!this.selectedSuitId) {
        return;
      }
      this.handlers.onSuitLocked(this.selectedSuitId);
    });
  }

  init(handlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  show(selectedSuitId) {
    this.selectedSuitId = selectedSuitId;
    this.renderSuitOptions();
    this.refreshSelection();
    this.screenEl.classList.add("active");
  }

  hide() {
    this.screenEl.classList.remove("active");
  }

  renderSuitOptions() {
    const cardsMarkup = SUITS.map((suit) => {
      return `
        <button
          class="suit-option suit-image-only ${suit.id}"
          data-suit-id="${suit.id}"
          type="button"
          aria-label="${suit.name}"
          title="${suit.name}"
        >
          <img
            class="suit-racer-image"
            src="${suit.racerImage}"
            alt="${suit.name} racer"
            loading="eager"
            decoding="sync"
          >
        </button>
      `;
    }).join("");

    this.optionsEl.innerHTML = cardsMarkup;
  }

  refreshSelection() {
    const optionButtons = this.optionsEl.querySelectorAll("[data-suit-id]");

    optionButtons.forEach((button) => {
      const isSelected = button.dataset.suitId === this.selectedSuitId;
      button.classList.toggle("selected", isSelected);
      button.setAttribute("aria-pressed", isSelected ? "true" : "false");
    });

    this.confirmButton.disabled = !this.selectedSuitId;
  }

  selectSuit(suitId) {
    this.selectedSuitId = suitId;
    this.handlers.onSuitPicked(this.selectedSuitId);
    this.refreshSelection();
  }
}

