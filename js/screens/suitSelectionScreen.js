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
    this.render();
    this.refreshSelection();
    this.screenEl.classList.add("active");
  }

  hide() {
    this.screenEl.classList.remove("active");
  }

  render() {
    const cardsMarkup = SUITS.map((suit) => {
      return `
        <button class="suit-option ${suit.id}" data-suit-id="${suit.id}" type="button">
          <span class="suit-symbol">${suit.symbol}</span>
          <span class="suit-name">${suit.name}</span>
        </button>
      `;
    }).join("");

    this.optionsEl.innerHTML = cardsMarkup;

    const optionButtons = this.optionsEl.querySelectorAll("[data-suit-id]");
    optionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        this.selectSuit(button.dataset.suitId);
      });
    });
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
