(function () {
  const STORAGE_KEY = "tesla-7day-guide-progress-v1";
  const CONGRATS_SHOWN_KEY = "tesla-7day-guide-congrats-shown-v1";

  const checkboxes = Array.from(
    document.querySelectorAll('.learn-list input[type="checkbox"][data-id]')
  );
  const congrats = document.getElementById("congrats");
  const congratsClose = document.getElementById("congrats-close");
  const congratsReset = document.getElementById("congrats-reset");
  const dayLinks = Array.from(document.querySelectorAll(".day-link"));
  const dayCards = Array.from(document.querySelectorAll(".day-card"));
  const stickyShell = document.querySelector(".sticky-shell");

  function syncStickyHeight() {
    if (!stickyShell) return;
    const height = Math.ceil(stickyShell.getBoundingClientRect().height);
    document.documentElement.style.setProperty("--sticky-shell-h", height + "px");
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function applySavedState() {
    const state = loadState();
    checkboxes.forEach((box) => {
      box.checked = Boolean(state[box.dataset.id]);
    });
  }

  function collectState() {
    const state = {};
    checkboxes.forEach((box) => {
      state[box.dataset.id] = box.checked;
    });
    return state;
  }

  function updateProgress(options) {
    const opts = options || {};
    const total = checkboxes.length;
    const done = checkboxes.filter((box) => box.checked).length;
    const allDone = total > 0 && done === total;
    if (allDone && !opts.skipCongrats) {
      const alreadyShown = localStorage.getItem(CONGRATS_SHOWN_KEY) === "1";
      if (!alreadyShown || opts.forceCongrats) {
        showCongrats();
        localStorage.setItem(CONGRATS_SHOWN_KEY, "1");
      }
    }
  }

  function showCongrats() {
    if (!congrats) return;
    congrats.hidden = false;
  }

  function hideCongrats() {
    if (!congrats) return;
    congrats.hidden = true;
  }

  function resetAll() {
    checkboxes.forEach((box) => {
      box.checked = false;
    });
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CONGRATS_SHOWN_KEY);
    hideCongrats();
    updateProgress({ skipCongrats: true });
  }

  let pauseScrollSpyUntil = 0;

  function setActiveDay(dayId) {
    dayLinks.forEach((link) => {
      const target = link.getAttribute("href").replace("#", "");
      link.classList.toggle("is-active", target === dayId);
    });
  }

  function setActiveDayFromHash() {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    setActiveDay(hash);
  }

  function scrollToDay(dayId) {
    const target = document.getElementById(dayId);
    if (!target) return;

    syncStickyHeight();
    const stickyHeight = stickyShell
      ? stickyShell.getBoundingClientRect().height
      : 0;
    const top =
      window.scrollY + target.getBoundingClientRect().top - stickyHeight - 12;

    pauseScrollSpyUntil = Date.now() + 900;
    setActiveDay(dayId);
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  function observeActiveDay() {
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < pauseScrollSpyUntil) return;

        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        setActiveDay(visible.target.id);
      },
      {
        rootMargin: "-35% 0px -50% 0px",
        threshold: [0.15, 0.35, 0.55],
      }
    );

    dayCards.forEach((card) => observer.observe(card));
  }

  function completeLinkedItem(box) {
    box.checked = true;
    saveState(collectState());
    updateProgress({ forceCongrats: true });
  }

  checkboxes.forEach((box) => {
    const row = box.closest(".learn-row");
    const titleLink = row ? row.querySelector(".learn-title") : null;
    if (titleLink) {
      titleLink.addEventListener("click", () => {
        completeLinkedItem(box);
      });
    }

    box.addEventListener("change", () => {
      saveState(collectState());
      // 若用户取消勾选导致未完成，允许下次再次恭喜
      if (!box.checked) {
        localStorage.removeItem(CONGRATS_SHOWN_KEY);
        hideCongrats();
      }
      updateProgress({ forceCongrats: box.checked });
    });
  });

  if (congratsReset) {
    congratsReset.addEventListener("click", resetAll);
  }
  if (congratsClose) {
    congratsClose.addEventListener("click", hideCongrats);
  }

  dayLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const dayId = link.getAttribute("href").replace("#", "");
      if (!dayId) return;
      event.preventDefault();
      if (window.location.hash !== "#" + dayId) {
        history.pushState(null, "", "#" + dayId);
      }
      scrollToDay(dayId);
    });
  });

  window.addEventListener("hashchange", () => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    scrollToDay(hash);
  });
  window.addEventListener("resize", syncStickyHeight);

  syncStickyHeight();
  applySavedState();
  updateProgress({ skipCongrats: true });
  setActiveDayFromHash();
  observeActiveDay();

  if (window.location.hash) {
    const hash = window.location.hash.replace("#", "");
    requestAnimationFrame(() => scrollToDay(hash));
  }

  // 若刷新时已全部完成，仍显示恭喜（用户可关闭）
  const total = checkboxes.length;
  const done = checkboxes.filter((box) => box.checked).length;
  if (total > 0 && done === total) {
    showCongrats();
    localStorage.setItem(CONGRATS_SHOWN_KEY, "1");
  }
})();
