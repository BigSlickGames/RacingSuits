export class AnteSelectionScreen {
  constructor({
    screenEl,
    sliderEl,
    minLabelEl,
    maxLabelEl,
    valueEl,
    chipsEl,
    backButton,
    confirmButton
  }) {
    this.screenEl = screenEl;
    this.sliderEl = sliderEl;
    this.minLabelEl = minLabelEl;
    this.maxLabelEl = maxLabelEl;
    this.valueEl = valueEl;
    this.chipsEl = chipsEl;
    this.backButton = backButton;
    this.confirmButton = confirmButton;

    this.currentAnte = null;
    this.currentChips = 0;
    this.anteOptions = [];
    this.availableAntes = [];

    this.handlers = {
      onBack: () => {},
      onAnteChanged: () => {},
      onAnteLocked: () => {}
    };

    this.sliderEl.addEventListener("input", () => {
      this.setAnteBySliderIndex(Number(this.sliderEl.value), true);
    });

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

  show({ chips, ante, anteOptions }) {
    this.currentChips = chips;
    this.anteOptions = anteOptions;
    this.chipsEl.textContent = String(chips);

    this.availableAntes = this.getEnabledAnteOptions();
    this.currentAnte = this.resolveAnte(ante);

    this.renderSlider();
    this.refreshAnteValue();
    this.confirmButton.disabled = this.currentAnte === null;
    this.screenEl.classList.add("active");
  }

  hide() {
    this.screenEl.classList.remove("active");
  }

  getEnabledAnteOptions() {
    return this.anteOptions.filter((option) => option <= this.currentChips);
  }

  resolveAnte(requestedAnte) {
    const available = this.availableAntes;
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

  renderSlider() {
    if (this.availableAntes.length === 0) {
      this.sliderEl.disabled = true;
      this.sliderEl.min = "0";
      this.sliderEl.max = "0";
      this.sliderEl.step = "1";
      this.sliderEl.value = "0";
      this.minLabelEl.textContent = "-";
      this.maxLabelEl.textContent = "-";
      return;
    }

    const selectedIndex = Math.max(0, this.availableAntes.indexOf(this.currentAnte));

    this.sliderEl.disabled = false;
    this.sliderEl.min = "0";
    this.sliderEl.max = String(this.availableAntes.length - 1);
    this.sliderEl.step = "1";
    this.sliderEl.value = String(selectedIndex);

    this.minLabelEl.textContent = String(this.availableAntes[0]);
    this.maxLabelEl.textContent = String(this.availableAntes[this.availableAntes.length - 1]);
  }

  refreshAnteValue() {
    this.valueEl.textContent = this.currentAnte === null ? "-" : String(this.currentAnte);
  }

  setAnteBySliderIndex(index, notifyChange) {
    if (this.availableAntes.length === 0) {
      this.currentAnte = null;
      this.confirmButton.disabled = true;
      this.refreshAnteValue();
      return;
    }

    const clampedIndex = Math.max(0, Math.min(index, this.availableAntes.length - 1));
    this.currentAnte = this.availableAntes[clampedIndex];
    this.sliderEl.value = String(clampedIndex);
    this.refreshAnteValue();
    this.confirmButton.disabled = this.currentAnte === null;

    if (notifyChange && this.currentAnte !== null) {
      this.handlers.onAnteChanged(this.currentAnte);
    }
  }
}

