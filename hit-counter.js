/**
 * ============================================================================
 * LOCKED COMPONENT: PERMANENT MONOTONIC HIT COUNTER
 * DO NOT OVERWRITE, MODIFY, OR LOWER THE BASELINE FLOOR IN THIS FILE.
 * ============================================================================
 */
(function() {
  'use strict';
  
  const LOCKED_BASELINE_FLOOR = 1485;
  const VISITED_KEY = "has_visited_plant_hoa_dashboard_v3";
  const MAX_VISITS_KEY = "plant_hoa_max_visits_v2";

  function initCounter() {
    const hitCountEls = document.querySelectorAll(".hit-count-val, #hit-count");
    if (hitCountEls.length === 0) return;

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
      document.querySelectorAll(".hit-count-val, #hit-count").forEach(el => {
        el.textContent = safeVal.toLocaleString();
      });
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

    // Primary cloud endpoint using counterapi.dev
    const endpoint = hasVisited
      ? 'https://api.counterapi.dev/v1/plant_hoa_dashboard/visits'
      : 'https://api.counterapi.dev/v1/plant_hoa_dashboard/visits/up';

    fetch(endpoint)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && typeof data.count === 'number') {
          const apiCount = data.count;
          const calculatedCount = (LOCKED_BASELINE_FLOOR - 2) + apiCount;
          updateDisplay(calculatedCount);

          if (!hasVisited) {
            try { localStorage.setItem(VISITED_KEY, "true"); } catch (e) {}
            try {
              const expires = new Date();
              expires.setFullYear(expires.getFullYear() + 1);
              document.cookie = `${VISITED_KEY}=true; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
            } catch (e) {}
          }
        } else {
          updateDisplay(storedMax);
        }
      })
      .catch(() => {
        // Backup failover attempt to keyvalue API
        const backupUrl = 'https://keyvalue.immanuel.co/api/KeyVal/GetValue/2q7ohpt5/visits';
        fetch(backupUrl)
          .then(res => res.ok ? res.json() : null)
          .then(bData => {
            if (bData !== null) {
              const parsed = parseInt(String(bData).replace(/"/g, '').trim(), 10);
              if (!isNaN(parsed) && parsed > 0) {
                updateDisplay(parsed);
                return;
              }
            }
            updateDisplay(storedMax);
          })
          .catch(() => updateDisplay(storedMax));
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCounter);
  } else {
    initCounter();
  }
})();
