(function () {
  const profile = window.BAKU_PROFILE;
  const dictionaries = { zh: window.BAKU_I18N_ZH, en: window.BAKU_I18N_EN };
  const storageKey = "baku.locale";
  const page = document.body.dataset.page || "home";
  let locale = getInitialLocale();
  let lastFocus = null;

  const platformMeta = {
    wechat: { icon: icon("wechat"), brand: "WX" },
    whatsapp: { icon: icon("whatsapp"), brand: "WA" },
    email: { icon: icon("email"), brand: "@" },
    xiaohongshu: { icon: icon("xhs"), brand: "RED" },
    douyin: { icon: icon("douyin"), brand: "DY" },
    instagram: { icon: icon("instagram"), brand: "IG" },
    tiktok: { icon: icon("tiktok"), brand: "TK" },
    makerworld: { icon: icon("makerworld"), brand: "MW" },
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    document.querySelectorAll("[data-lang]").forEach((button) => {
      button.addEventListener("click", () => setLocale(button.dataset.lang, true));
    });

    document.querySelector("[data-close-sheet]")?.addEventListener("click", closeWechat);
    document.querySelector("[data-sheet-layer]")?.addEventListener("click", (event) => {
      if (event.target === event.currentTarget) closeWechat();
    });
    document.querySelector("[data-copy-wechat]")?.addEventListener("click", copyWechatId);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeWechat();
      if (event.key === "Tab") trapSheetFocus(event);
    });

    setLocale(locale, false);
  }

  function getInitialLocale() {
    const saved = localStorage.getItem(storageKey);
    if (saved === "zh" || saved === "en") return saved;
    const languages = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"];
    return languages.some((language) => language.toLowerCase().startsWith("zh")) ? "zh" : "en";
  }

  function setLocale(nextLocale, persist) {
    locale = nextLocale === "zh" ? "zh" : "en";
    if (persist) localStorage.setItem(storageKey, locale);
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-lang]").forEach((button) => {
      button.classList.toggle("active", button.dataset.lang === locale);
      button.setAttribute("aria-pressed", button.dataset.lang === locale ? "true" : "false");
    });
    renderStaticText();
    renderPage();
    updateWechatSheet();
    updateSeo();
  }

  function t(path) {
    return path.split(".").reduce((value, key) => value?.[key], dictionaries[locale]);
  }

  function renderStaticText() {
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      node.textContent = t(node.dataset.i18n) || "";
    });
    document.querySelectorAll("[data-i18n-html]").forEach((node) => {
      node.innerHTML = t(node.dataset.i18nHtml) || "";
    });
  }

  function renderPage() {
    if (page === "home") {
      renderConnect();
      renderCollabTeaser();
      renderWork();
      renderClosingLinks();
    }
    if (page === "collab") {
      renderCollabDetail();
    }
  }

  function updateSeo() {
    document.title = page === "collab" ? `${t("collab.detailTitle")} - BAKU` : t("seo.title");
    const description = page === "collab" ? t("collab.detailIntro") : t("seo.description");
    setMeta("description", description);
    setMeta("og:title", page === "collab" ? t("collab.detailTitle") : t("seo.title"), true);
    setMeta("og:description", description, true);
  }

  function setMeta(name, content, property = false) {
    const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
    document.querySelector(selector)?.setAttribute("content", content);
  }

  function renderConnect() {
    const container = document.querySelector("[data-connect-list]");
    if (!container) return;
    const order = locale === "zh" ? ["wechat", "whatsapp", "email"] : ["whatsapp", "wechat", "email"];
    container.innerHTML = order.map((type) => contactButton(type)).join("");
    container.querySelectorAll("[data-open-wechat]").forEach((button) => button.addEventListener("click", openWechat));
  }

  function contactButton(type) {
    const item = t(`connect.items.${type}`);
    const href = getContactHref(type);
    const isWechat = type === "wechat";
    const disabled = !href && !isWechat;
    const tag = href ? "a" : "button";
    const attrs = href
      ? `href="${escapeAttr(href)}" target="${type === "email" ? "_self" : "_blank"}" rel="noopener" data-track="contact:${type}"`
      : `${isWechat ? "data-open-wechat" : "disabled aria-disabled=\"true\""}`;
    return `<${tag} class="connect-card ${disabled ? "disabled" : ""}" ${attrs}>
      <span class="platform-icon" aria-hidden="true">${platformMeta[type].icon}</span>
      <span><small>${item.note || ""}</small><strong>${item.title}</strong></span>
      <b aria-hidden="true">→</b>
    </${tag}>`;
  }

  function getContactHref(type) {
    if (type === "whatsapp") return profile.contact.whatsappUrl;
    if (type === "email" && profile.contact.email) return `mailto:${profile.contact.email}`;
    return "";
  }

  function renderCollabTeaser() {
    const teaser = document.querySelector("[data-collab-teaser]");
    if (!teaser) return;
    if (!profile.collab.active) {
      teaser.innerHTML = `<div class="meta-row">${t("collab.closed")}</div>`;
    }
  }

  function renderWork() {
    const container = document.querySelector("[data-work-list]");
    if (!container) return;
    const accounts = [
      { key: "kamabo", order: locale === "zh" ? ["xiaohongshu", "douyin", "instagram", "tiktok"] : ["instagram", "tiktok", "xiaohongshu", "douyin"] },
      { key: "buglab", order: locale === "zh" ? ["xiaohongshu", "douyin", "makerworld", "instagram", "tiktok"] : ["instagram", "tiktok", "makerworld", "xiaohongshu", "douyin"] },
    ];
    container.innerHTML = accounts.map((account) => workCard(account.key, account.order)).join("");
  }

  function renderClosingLinks() {
    const container = document.querySelector("[data-closing-links]");
    if (!container) return;
    const order = locale === "zh" ? ["wechat", "whatsapp", "email"] : ["whatsapp", "wechat", "email"];
    container.innerHTML = order.map((type) => {
      const label = type === "wechat" ? "WECHAT" : type === "whatsapp" ? "WHATSAPP" : "EMAIL";
      const href = getContactHref(type);
      if (type === "wechat") return `<button class="quiet-action" type="button" data-open-wechat>${label} →</button>`;
      if (!href) return `<button class="quiet-action disabled" type="button" disabled aria-disabled="true">${label} →</button>`;
      return `<a class="quiet-action" href="${escapeAttr(href)}" ${type === "email" ? "" : "target=\"_blank\" rel=\"noopener\""}>${label} →</a>`;
    }).join("");
    container.querySelectorAll("[data-open-wechat]").forEach((button) => button.addEventListener("click", openWechat));
  }

  function workCard(key, order) {
    const account = profile.accounts[key];
    const localeData = t(`work.${key}`);
    return `<article class="work-card">
      <div class="work-visual" aria-hidden="true">
        <span>${localeData.title}</span>
        <strong>${account.visualCode.replace(" ", "<br />")}</strong>
      </div>
      <div>
        <p>${localeData.title}</p>
        <h3>${localeData.name}</h3>
        <p>${localeData.keywords}</p>
      </div>
      <div class="social-grid" aria-label="${account.title} socials">
        ${order.map((platform) => socialLink(account.socials[platform], platform)).join("")}
      </div>
    </article>`;
  }

  function socialLink(url, platform) {
    const disabled = !url;
    const label = platformLabel(platform);
    if (disabled) {
      return `<button class="social-link disabled" type="button" disabled aria-disabled="true">
        <span class="platform-icon" aria-hidden="true">${platformMeta[platform].icon}</span>
        <span><small>${t("connect.unavailable")}</small><strong>${label}</strong></span>
      </button>`;
    }
    return `<a class="social-link" href="${escapeAttr(url)}" target="_blank" rel="noopener" data-track="social:${platform}">
      <span class="platform-icon" aria-hidden="true">${platformMeta[platform].icon}</span>
      <span><small>OPEN</small><strong>${label}</strong></span>
    </a>`;
  }

  function platformLabel(platform) {
    return {
      xiaohongshu: "Xiaohongshu",
      douyin: "Douyin",
      instagram: "Instagram",
      tiktok: "TikTok",
      makerworld: "MakerWorld",
    }[platform] || platform;
  }

  function renderCollabDetail() {
    const root = document.querySelector("[data-collab-detail]");
    if (!root) return;
    root.innerHTML = `
      <section class="collab-hero" aria-labelledby="collab-page-title">
        <p class="index-label">NOW / LIMITED / ${profile.collab.year}</p>
        <div>
          <p class="section-kicker">${t("collab.heroKicker")}</p>
          <h1 id="collab-page-title">BAKU ×<br />DESIGNERS</h1>
          <p class="detail-lede">${t("collab.heroCopy")}</p>
        </div>
      </section>
      <section class="detail-section" aria-labelledby="together-title">
        <div class="section-head"><p class="index-label">01 / TOGETHER</p><h2 id="together-title">${t("collab.togetherTitle")}</h2></div>
        <div class="together-graphic">
          <article class="person-block"><p class="detail-eyebrow">${t("collab.bringTitle")}</p><h3>YOU</h3>${detailList("collab.bringItems")}</article>
          <div class="multiply" aria-hidden="true">×</div>
          <article class="person-block"><p class="detail-eyebrow">${t("collab.bakuTitle")}</p><h3>BAKU</h3>${detailList("collab.bakuItems")}</article>
        </div>
        <div class="meta-row">${t("collab.togetherBottom")}</div>
      </section>
      <section class="detail-section" aria-labelledby="process-title">
        <div class="section-head"><p class="index-label">02 / PROCESS</p><h2 id="process-title">${t("collab.processHeadline")}</h2></div>
        <div class="process-path">${processItems().map((item) => `<div class="process-step">${item}</div>`).join("")}</div>
      </section>
      <section class="detail-section" aria-labelledby="why-title">
        <div class="section-head"><p class="index-label">03 / WHY</p><h2 id="why-title">WHY</h2></div>
        <div class="why-panel">
          <h3>${t("collab.whyHeadline")}</h3>
          ${detailList("collab.whyItems")}
          <p>${t("collab.whyCopy")}</p>
        </div>
      </section>
      <section class="detail-section" aria-labelledby="model-title">
        <div class="section-head"><p class="index-label">04 / MODEL</p><h2 id="model-title">${t("collab.modelTitle")}</h2></div>
        <div class="model-panel">
          <ul class="detail-list">${modelItems().map((item) => `<li>${item}</li>`).join("")}</ul>
          <p>${t("collab.modelCopy")}</p>
        </div>
      </section>
      <section class="detail-section principle-block" aria-labelledby="principle-title">
        <div class="section-head"><p class="index-label">05 / PRINCIPLE</p><h2 id="principle-title">${t("collab.principleTitle")}</h2></div>
        <div>
          <p class="principle-title">${t("collab.principleBig")}</p>
          <p class="principle-copy">${t("collab.principle")}</p>
        </div>
      </section>
      <section class="detail-end">
        <p class="index-label">06 / START</p>
        <p class="detail-ending">${t("collab.startTitle")}</p>
        <p class="detail-lede">${t("collab.startCopy")}</p>
        <button class="primary-action" type="button" data-collab-contact>${t("collab.action")}</button>
      </section>`;
    root.querySelector("[data-collab-contact]")?.addEventListener("click", () => {
      const href = locale === "en" ? profile.contact.whatsappUrl : "";
      if (href) window.open(href, "_blank", "noopener");
      else openWechat();
    });
  }

  function detailList(itemsPath) {
    return `<ul class="detail-list">${t(itemsPath).map((item) => `<li>${item}</li>`).join("")}</ul>`;
  }

  function processItems() {
    return t("collab.process").split(" → ");
  }

  function modelItems() {
    return t("collab.model").split(" / ");
  }

  function updateWechatSheet() {
    const qr = document.querySelector("[data-wechat-qr]");
    const id = document.querySelector("[data-wechat-id]");
    if (qr) qr.src = profile.contact.wechatQr;
    if (id) id.textContent = profile.contact.wechatId;
    const copy = document.querySelector("[data-copy-wechat]");
    if (copy) copy.textContent = "COPY ID";
  }

  function openWechat() {
    lastFocus = document.activeElement;
    const layer = document.querySelector("[data-sheet-layer]");
    const sheet = document.querySelector(".sheet");
    layer?.classList.add("open");
    layer?.setAttribute("aria-hidden", "false");
    document.body.classList.add("sheet-open");
    sheet?.focus();
  }

  function closeWechat() {
    const layer = document.querySelector("[data-sheet-layer]");
    if (!layer?.classList.contains("open")) return;
    layer.classList.remove("open");
    layer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("sheet-open");
    document.querySelector("[data-copy-feedback]").textContent = "";
    lastFocus?.focus?.();
  }

  function trapSheetFocus(event) {
    const layer = document.querySelector("[data-sheet-layer]");
    if (!layer?.classList.contains("open")) return;
    const focusables = [...layer.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")]
      .filter((node) => !node.disabled && node.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function copyWechatId() {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(profile.contact.wechatId);
    }
    document.querySelector("[data-copy-feedback]").textContent = t("connect.copied");
  }

  function escapeAttr(value) {
    return String(value).replace(/"/g, "&quot;");
  }

  function icon(type) {
    const common = 'viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"';
    const icons = {
      wechat: `<svg ${common}><path d="M20 15c-8 0-14 5-14 11 0 4 3 8 7 10l-1 5 6-3h2c8 0 14-5 14-12S28 15 20 15Z" fill="currentColor"/><path d="M31 20c6 1 11 5 11 10 0 4-3 7-7 9l1 4-5-2h-2c-6 0-11-4-11-9" stroke="currentColor" stroke-width="4"/><circle cx="15" cy="25" r="2" fill="#111211"/><circle cx="25" cy="25" r="2" fill="#111211"/></svg>`,
      whatsapp: `<svg ${common}><path d="M24 6a17 17 0 0 0-15 25L7 42l11-3a17 17 0 1 0 6-33Z" stroke="currentColor" stroke-width="5"/><path d="M17 17c1-2 3-2 4 0l1 3-2 2c2 4 4 6 8 8l2-2 3 1c2 1 2 3 0 4-3 2-8 0-13-5s-7-10-3-11Z" fill="currentColor"/></svg>`,
      email: `<svg ${common}><rect x="7" y="12" width="34" height="25" rx="2" stroke="currentColor" stroke-width="5"/><path d="m9 15 15 13 15-13" stroke="currentColor" stroke-width="5"/></svg>`,
      xhs: `<svg ${common}><rect x="7" y="7" width="34" height="34" rx="4" fill="currentColor"/><path d="M16 17h16M16 25h16M16 33h11" stroke="#fff" stroke-width="4"/></svg>`,
      douyin: `<svg ${common}><path d="M29 8v20a10 10 0 1 1-8-10" stroke="currentColor" stroke-width="6"/><path d="M29 10c2 6 6 9 11 9" stroke="currentColor" stroke-width="6"/></svg>`,
      instagram: `<svg ${common}><rect x="9" y="9" width="30" height="30" rx="8" stroke="currentColor" stroke-width="5"/><circle cx="24" cy="24" r="7" stroke="currentColor" stroke-width="5"/><circle cx="33" cy="15" r="2.5" fill="currentColor"/></svg>`,
      tiktok: `<svg ${common}><path d="M29 8v20a10 10 0 1 1-8-10" stroke="currentColor" stroke-width="6"/><path d="M29 9c2 7 6 11 12 11" stroke="currentColor" stroke-width="6"/></svg>`,
      makerworld: `<svg ${common}><path d="M8 35V13l16-7 16 7v22l-16 7-16-7Z" stroke="currentColor" stroke-width="5"/><path d="M24 7v34M9 14l15 8 15-8" stroke="currentColor" stroke-width="4"/></svg>`,
    };
    return icons[type];
  }
})();
