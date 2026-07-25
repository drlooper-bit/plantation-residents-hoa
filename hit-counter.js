/**
 * ============================================================================
 * LOCKED COMPONENT: PERMANENT MONOTONIC HIT COUNTER
 * DO NOT OVERWRITE, MODIFY, OR LOWER THE BASELINE FLOOR IN THIS FILE.
 * ============================================================================
 */
(function() {
  'use strict';
  
  const LOCKED_BASELINE_FLOOR = 869;
  const VISITED_KEY = "has_visited_plant_hoa_dashboard_v2";
  const MAX_VISITS_KEY = "plant_hoa_max_visits_v1";
  const APP_KEY = "2q7ohpt5";

  function initCounter() {
    const hitCountEl = document.getElementById("hit-count");
    if (!hitCountEl) return;

    // Determine highest local high-water mark
    let storedMax = LOCKED_BASELINE_FLOOR;
    try {
      const localVal = parseInt(localStorage.getItem(MAX_VISITS_KEY), 10);
      if (!isNaN(localVal) && localVal > storedMax) {
        storedMax = localVal;
      }
    } catch (e) {}

    // Safe UI updater: NEVER drops below LOCKED_BASELINE_FLOOR or storedMax
    function updateDisplay(val) {
      const safeVal = Math.max(val, storedMax, LOCKED_BASELINE_FLOOR);
      storedMax = safeVal;
      hitCountEl.textContent = safeVal.toLocaleString();
      try {
        localStorage.setItem(MAX_VISITS_KEY, String(safeVal));
      } catch (e) {}
    }

    // Set immediate display
    updateDisplay(storedMax);

    // Check visit status
    let hasVisited = false;
    try {
      if (localStorage.getItem(VISITED_KEY)) hasVisited = true;
    } catch (e) {}

    if (!hasVisited) {
      try {
        if (document.cookie.split(';').some(item => item.trim().startsWith(VISITED_KEY + '='))) {
          hasVisited = true;
        }
      } catch (e) {}
    }

    const getUrl = `https://keyvalue.immanuel.co/api/KeyVal/GetValue/${APP_KEY}/visits`;

    fetch(getUrl)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        let apiCount = LOCKED_BASELINE_FLOOR;
        if (data !== null) {
          const cleaned = String(data).replace(/"/g, '').trim();
          const parsed = parseInt(cleaned, 10);
          if (!isNaN(parsed) && parsed > 0) {
            apiCount = parsed;
          }
        }

        const currentDisplay = Math.max(apiCount, storedMax, LOCKED_BASELINE_FLOOR);

        if (!hasVisited) {
          const newCount = currentDisplay + 1;
          updateDisplay(newCount);

          try { localStorage.setItem(VISITED_KEY, "true"); } catch (e) {}
          try {
            const expires = new Date();
            expires.setFullYear(expires.getFullYear() + 1);
            document.cookie = `${VISITED_KEY}=true; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
          } catch (e) {}

          const setUrl = `https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${APP_KEY}/visits/${newCount}`;
          fetch(setUrl, { method: 'POST' }).catch(() => {});
        } else {
          updateDisplay(currentDisplay);
        }
      })
      .catch(() => {
        updateDisplay(storedMax);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCounter);
  } else {
    initCounter();
  }
})();
