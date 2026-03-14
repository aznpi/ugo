const initializeRangeSlider = (containerEl, minEl, maxEl) => { 
  // Increase gap for tuition context (e.g., $500)
  let minRangeValueGap = 500; 
  
  const container = document.getElementById(containerEl),
        range = container.querySelector("#range_track"),
        minval = container.querySelector(".minvalue"),
        maxval = container.querySelector(".maxvalue"),
        rangeInput = container.querySelectorAll(".input-amount");

  if (!container || rangeInput.length < 2) return;

  // 1. Assign Dynamic Attributes
  // Left Handle (Min)
  rangeInput[0].min = minEl.min;
  rangeInput[0].max = maxEl.max;
  rangeInput[0].value = minEl.value;

  // Right Handle (Max)
  rangeInput[1].min = minEl.min;
  rangeInput[1].max = maxEl.max;
  rangeInput[1].value = maxEl.value;

  let minRange, maxRange, minPercentage, maxPercentage;

  // 2. Updated Fill Logic
  // We calculate percentage based on the range (max - min) rather than 0
  const updateTrackFill = () => {
    const minLimit = parseInt(rangeInput[0].min);
    const maxLimit = parseInt(rangeInput[0].max);
    
    const leftPercent = ((rangeInput[0].value - minLimit) / (maxLimit - minLimit)) * 100;
    const rightPercent = 100 - (((rangeInput[1].value - minLimit) / (maxLimit - minLimit)) * 100);
    
    range.style.left = leftPercent + "%";
    range.style.right = rightPercent + "%";
  };

  const updateBubbleStyles = () => {
    const minLimit = parseInt(rangeInput[0].min);
    const maxLimit = parseInt(rangeInput[0].max);

    // Min Bubble
    minPercentage = ((minRange - minLimit) / (maxLimit - minLimit)) * 100;
    minval.style.left = minPercentage + "%";
    minval.style.transform = `translate(-${minPercentage / 2}%, -100%)`;

    // Max Bubble
    maxPercentage = 100 - (((maxRange - minLimit) / (maxLimit - minLimit)) * 100);
    maxval.style.right = maxPercentage + "%";
    maxval.style.transform = `translate(${maxPercentage / 2}%, 100%)`;
  };

  const setMinValueOutput = () => {
    minRange = parseInt(rangeInput[0].value);
    minval.innerHTML = formatCurrencyAmount(minRange, 'USD');
  };

  const setMaxValueOutput = () => {
    maxRange = parseInt(rangeInput[1].value);
    maxval.innerHTML = formatCurrencyAmount(maxRange, 'USD');
  };

  // Initial Sync
  setMinValueOutput();
  setMaxValueOutput();
  updateTrackFill();
  updateBubbleStyles();

  // 3. Event Listeners
  rangeInput.forEach((input) => {
    input.addEventListener("input", (e) => {
      setMinValueOutput();
      setMaxValueOutput();

      // Enforce Gap Logic
      if (maxRange - minRange < minRangeValueGap) {
        if (e.target.classList.contains("min")) {
          rangeInput[0].value = maxRange - minRangeValueGap;
          setMinValueOutput();
        } else {
          rangeInput[1].value = minRange + minRangeValueGap;
          setMaxValueOutput();
        }
      }

      updateTrackFill();
      updateBubbleStyles();
    });
  });
};