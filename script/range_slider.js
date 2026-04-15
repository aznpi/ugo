const initializeRangeSlider = (containerEl, minEl, maxEl) => { 
  let minRangeValueGap = 500; 
  
  const container = document.getElementById(containerEl),
        range = container.querySelector("#range_track"),
        minval = container.querySelector(".minvalue"),
        maxval = container.querySelector(".maxvalue"),
        rangeInput = container.querySelectorAll(".input-amount");

  if (!container || rangeInput.length < 2) return;

  // 1. Assign Dynamic Attributes
  rangeInput[0].min = minEl.min;
  rangeInput[0].max = maxEl.max;
  rangeInput[0].value = minEl.value;

  rangeInput[1].min = minEl.min;
  rangeInput[1].max = maxEl.max;
  rangeInput[1].value = maxEl.value;

  let minRange, maxRange;

  // 2. Updated Width Logic
  const updateTrackFill = () => {
    const minLimit = parseInt(rangeInput[0].min);
    const maxLimit = parseInt(rangeInput[0].max);
    const totalRange = maxLimit - minLimit;

    // Calculate percentages for both handles relative to the minLimit
    const leftPercent = ((parseInt(rangeInput[0].value) - minLimit) / totalRange) * 100;
    const rightPercent = ((parseInt(rangeInput[1].value) - minLimit) / totalRange) * 100;
    
    // Pin the left side and set the width to the distance between them
    range.style.left = leftPercent + "%";
    range.style.width = (rightPercent - leftPercent) + "%";
    
    // Optional: Reset 'right' in case it was set by previous CSS
    range.style.right = "auto";
  };

  const updateBubbleStyles = () => {
    const minLimit = parseInt(rangeInput[0].min);
    const maxLimit = parseInt(rangeInput[0].max);
    const totalRange = maxLimit - minLimit;

    // Min Bubble positioning
    const minPerc = ((minRange - minLimit) / totalRange) * 100;
    minval.style.left = minPerc + "%";
    minval.style.transform = `translate(-${minPerc}%, -100%)`;

    // Max Bubble positioning
    const maxPerc = ((maxRange - minLimit) / totalRange) * 100;
    maxval.style.left = maxPerc + "%";
    maxval.style.transform = `translate(-${maxPerc}%, 100%)`;
  };

  const setOutputs = () => {
    minRange = parseInt(rangeInput[0].value);
    maxRange = parseInt(rangeInput[1].value);
    minval.innerHTML = formatCurrencyAmount(minRange, 'USD', false);
    maxval.innerHTML = formatCurrencyAmount(maxRange, 'USD', false);
  };

  // Initial Sync
  setOutputs();
  updateTrackFill();
  updateBubbleStyles();

  // 3. Event Listeners
  rangeInput.forEach((input) => {
    input.addEventListener("input", (e) => {
      setOutputs();

      // Enforce Gap Logic
      if (maxRange - minRange < minRangeValueGap) {
        if (e.target.classList.contains("min")) {
          rangeInput[0].value = maxRange - minRangeValueGap;
        } else {
          rangeInput[1].value = minRange + minRangeValueGap;
        }
        setOutputs();
      }

      updateTrackFill();
      updateBubbleStyles();
    });
  });
};