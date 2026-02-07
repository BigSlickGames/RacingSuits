export class AnteSelectionScreen {
  constructor({
    screenEl,
    buttonGroupEl,
    valueEl,
    chipsEl,
    backButton,
    confirmButton
  }) {
    this.screenEl = screenEl;
    this.buttonGroupEl = buttonGroupEl ?? this.ensureButtonGroupElement(screenEl);
    this.valueEl = valueEl;
    this.chipsEl = chipsEl;
    this.backButton = backButton;
    this.confirmButton = confirmButton;
    this.currentAnte = null;
    this.currentChips = 0;
    this.anteOptions = [];

    this.handlers = {
      onBack: () => {},
      onAnteChanged: () => {},
      onAnteLocked: () => {}
    };

    if (this.buttonGroupEl) {
      this.buttonGroupEl.addEventListener("click", (event) => {
        const optionButton = event.target.closest("[data-ante-value]");
        if (!optionButton || optionButton.disabled) {
          return;
        }

        const nextAnte = Number(optionButton.dataset.anteValue);
        this.setCurrentAnte(nextAnte, true);
      });
    }

    this.backButton.addEventListener("click", () => {
      this.handlers.onBack();
    });

    this.confirmButton.addEventListener("click", () => {
      if (this.currentAnte === null) {
        return;
      }
      this.handlers.onAnteLocked(this.currentAnte);
    });
  }

  init(handlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  ensureButtonGroupElement(screenEl) {
    const existing = screenEl.querySelector("#ante-button-group");
    if (existing) {
      return existing;
    }

    const antePanel = screenEl.querySelector(".ante-panel");
    if (!antePanel) {
      return null;
    }

    const created = document.createElement("div");
    created.id = "ante-button-group";
    created.className = "ante-button-group";
    created.setAttribute("role", "group");
    created.setAttribute("aria-label", "Ante options");

    const anteValue = antePanel.querySelector(".ante-value");
    if (anteValue) {
      antePanel.insertBefore(created, anteValue);
    } else {
      antePanel.appendChild(created);
    }

    return created;
  }

  show({ chips, ante, anteOptions }) {
    this.currentChips = chips;
    this.anteOptions = anteOptions;
    this.chipsEl.textContent = String(chips);
    this.currentAnte = this.resolveAnte(ante);
    this.renderButtons();
    this.refreshAnteValue();
    this.confirmButton.disabled = this.currentAnte === null;

    this.screenEl.classList.add("active");
  }

  hide() {
    this.screenEl.classList.remove("active");
  }

  resolveAnte(requestedAnte) {
    const available = this.getEnabledAnteOptions();
    if (available.length === 0) {
      return null;
    }

    if (available.includes(requestedAnte)) {
      return requestedAnte;
    }

    const lowerOptions = available.filter((option) => option <= requestedAnte);
    if (lowerOptions.length > 0) {
      return lowerOptions[lowerOptions.length - 1];
    }

    return available[0];
  }

  getEnabledAnteOptions() {
    return this.anteOptions.filter((option) => option <= this.currentChips);
  }

  renderButtons() {
    if (!this.buttonGroupEl) {
      return;
    }

    const buttonMarkup = this.anteOptions.map((option) => {
      const isDisabled = option > this.currentChips;
      const isSelected = option === this.currentAnte;
      return `
        <button
          type="button"
          class="ante-option-btn${isSelected ? " selected" : ""}"
          data-ante-value="${option}"
          ${isDisabled ? "disabled" : ""}
          aria-pressed="${isSelected ? "true" : "false"}"
        >
          ${option}
        </button>
      `;
    }).join("");

    this.buttonGroupEl.innerHTML = buttonMarkup;
  }

  refreshAnteValue() {
    this.valueEl.textContent = this.currentAnte === null ? "-" : String(this.currentAnte);
  }

  setCurrentAnte(nextAnte, notifyChange) {
    this.currentAnte = this.resolveAnte(nextAnte);
    this.renderButtons();
    this.refreshAnteValue();
    this.confirmButton.disabled = this.currentAnte === null;

    if (notifyChange && this.currentAnte !== null) {
      this.handlers.onAnteChanged(this.currentAnte);
    }
  }
}
