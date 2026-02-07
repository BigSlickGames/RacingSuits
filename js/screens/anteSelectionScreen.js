function formatAnteValue(value, max) {
  if (value === max) {
    return `${value} (ALL IN)`;
  }
  return `${value}`;
}

export class AnteSelectionScreen {
  constructor({
    screenEl,
    sliderEl,
    valueEl,
    minLabelEl,
    maxLabelEl,
    chipsEl,
    backButton,
    confirmButton
  }) {
    this.screenEl = screenEl;
    this.sliderEl = sliderEl;
    this.valueEl = valueEl;
    this.minLabelEl = minLabelEl;
    this.maxLabelEl = maxLabelEl;
    this.chipsEl = chipsEl;
    this.backButton = backButton;
    this.confirmButton = confirmButton;
    this.currentMax = Number(this.sliderEl.max);
    this.currentAnte = Number(this.sliderEl.value);

    this.handlers = {
      onBack: () => {},
      onAnteChanged: () => {},
      onAnteLocked: () => {}
    };

    this.sliderEl.addEventListener("input", () => {
      this.currentAnte = Number(this.sliderEl.value);
      this.valueEl.textContent = formatAnteValue(this.currentAnte, this.currentMax);
      this.handlers.onAnteChanged(this.currentAnte);
    });

    this.backButton.addEventListener("click", () => {
      this.handlers.onBack();
    });

    this.confirmButton.addEventListener("click", () => {
      this.handlers.onAnteLocked(this.currentAnte);
    });
  }

  init(handlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  show({ chips, ante, minAnte, maxAnte, step }) {
    this.currentMax = maxAnte;
    this.currentAnte = ante;

    this.sliderEl.min = String(minAnte);
    this.sliderEl.max = String(maxAnte);
    this.sliderEl.step = String(step);
    this.sliderEl.value = String(ante);

    this.chipsEl.textContent = String(chips);
    this.minLabelEl.textContent = String(minAnte);
    this.maxLabelEl.textContent = `${maxAnte} (ALL IN)`;
    this.valueEl.textContent = formatAnteValue(ante, maxAnte);

    this.screenEl.classList.add("active");
  }

  hide() {
    this.screenEl.classList.remove("active");
  }
}
