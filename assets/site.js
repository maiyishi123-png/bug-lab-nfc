(function () {
  const profile = window.BAKU_PROFILE;
  const dictionaries = { zh: window.BAKU_I18N_ZH, en: window.BAKU_I18N_EN };
  const storageKey = "baku.locale";
  const page = document.body.dataset.page || "home";
  let locale = getInitialLocale();
  let lastFocus = null;
  let toastTimer = null;
  let galleryScrollTimer = null;
  let fitTextTimer = null;

  const platformMeta = {
    wechat: { short: "WX", color: "#23c55e" },
    whatsapp: { short: "WA", color: "#25d366" },
    email: { short: "E", color: "#d8ff35" },
    xiaohongshu: { short: "RED", color: "#ff2442" },
    douyin: { short: "DY", color: "#111111", ink: "#ffffff" },
    instagram: { short: "IG", color: "#e4405f" },
    tiktok: { short: "TK", color: "#00f2ea" },
    makerworld: { short: "MW", color: "#00a3ff" },
  };

  const gallerySets = {
    collab: { label: "REAL WORK", total: 4 },
    kamabo: {
      label: "KAMABO LAB",
      images: [
        "/assets/images/kamabo-01.png",
        "/assets/images/kamabo-02.jpg",
        "/assets/images/kamabo-03.jpg",
        "/assets/images/kamabo-04.jpg",
        "/assets/images/kamabo-05.jpg",
        "/assets/images/kamabo-06.jpg",
        "/assets/images/kamabo-07.jpg",
        "/assets/images/kamabo-08.jpg",
        "/assets/images/kamabo-09.jpg",
      ],
    },
    buglab: {
      label: "BUG LAB",
      images: [
        "/assets/images/buglab-01.jpeg",
        "/assets/images/buglab-02.jpg",
        "/assets/images/buglab-03.jpg",
        "/assets/images/buglab-04.jpg",
        "/assets/images/buglab-05.jpg",
        "/assets/images/buglab-06.jpg",
        "/assets/images/buglab-07.jpg",
        "/assets/images/buglab-08.jpg",
        "/assets/images/buglab-09.jpg",
      ],
    },
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
    window.addEventListener("scroll", showGalleryControlsWhileScrolling, { passive: true });
    window.addEventListener("resize", scheduleFitText);
    setLocale(locale, false);
  }

  function getInitialLocale() {
    const saved = localStorage.getItem(storageKey);
    if (saved === "zh" || saved === "en") return saved;
    const languages = navigator.languages?.length ? navigator.languages : [navigator.language || "zh"];
    return languages.some((language) => language.toLowerCase().startsWith("zh")) ? "zh" : "en";
  }

  function setLocale(nextLocale, persist) {
    locale = nextLocale === "en" ? "en" : "zh";
    if (persist) localStorage.setItem(storageKey, locale);
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-lang]").forEach((button) => {
      const active = button.dataset.lang === locale;
      button.textContent = locale === "en" && button.dataset.lang === "zh" ? "ZH" : button.dataset.lang === "zh" ? "中" : "EN";
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    renderStaticText();
    if (page === "home") renderHome();
    if (page === "collab") renderCollabDetail();
    updateWechatSheet();
    updateSeo();
    scheduleFitText();
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
    scheduleFitText();
  }

  function renderHome() {
    renderContactActions();
    renderGallery(document.querySelector('[data-gallery="collab"]'), "collab");
    renderWork();
    document.querySelectorAll("[data-open-wechat]").forEach((button) => {
      button.addEventListener("click", openWechat);
    });
  }

  function updateSeo() {
    const title = page === "collab" ? `${t("collab.detailTitle")} - BAKU` : t("seo.title");
    const description = page === "collab" ? t("collab.detailIntro") : t("seo.description");
    document.title = title;
    setMeta("description", description);
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
  }

  function setMeta(name, content, property = false) {
    const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
    document.querySelector(selector)?.setAttribute("content", content);
  }

  function renderContactActions() {
    const container = document.querySelector("[data-contact-list]");
    if (!container) return;
    container.innerHTML = ["wechat", "whatsapp", "email"].map(contactAction).join("");
    container.querySelectorAll("[data-open-wechat]").forEach((button) => button.addEventListener("click", openWechat));
    container.querySelectorAll("[data-copy-contact]").forEach((button) => button.addEventListener("click", copyContactValue));
    scheduleFitText();
  }

  function contactAction(type) {
    const item = t(`find.items.${type}`);
    const href = getContactHref(type);
    const isWechat = type === "wechat";
    const contactValue = getContactValue(type);
    const disabled = !href && !isWechat && !contactValue;
    const tag = href ? "a" : "button";
    const attrs = href
      ? `href="${escapeAttr(href)}" ${type === "email" ? "" : 'target="_blank" rel="noopener"'}`
      : `${isWechat ? "data-open-wechat" : contactValue ? `data-copy-contact="${type}"` : 'disabled aria-disabled="true"'}`;
    return `<${tag} class="platform-action ${disabled ? "is-disabled" : ""}" ${attrs}>
      <span class="platform-color" style="--platform-color:${platformMeta[type].color};--platform-ink:${platformMeta[type].ink || "#10110f"}">${platformMeta[type].short}</span>
      <span class="platform-text"><small>${item.meta}</small><strong>${item.title}</strong><em data-contact-note>${getContactNote(type, disabled, item.note)}</em></span>
      <b aria-hidden="true">→</b>
    </${tag}>`;
  }

  function getContactHref(type) {
    if (type === "whatsapp") return profile.contact.whatsappUrl;
    return "";
  }

  function getContactValue(type) {
    if (type === "whatsapp") return profile.contact.whatsappId || "";
    if (type === "email") return profile.contact.email || "";
    return "";
  }

  function getContactNote(type, disabled, fallback) {
    if (disabled) return t("find.unavailable");
    if (type === "whatsapp") return locale === "zh" ? "点击复制WhatsApp ID" : "Click to copy WhatsApp ID";
    if (type === "email") return locale === "zh" ? "点击复制email" : "Click to copy email";
    return fallback;
  }

  function renderGallery(root, key) {
    if (!root) return;
    const data = gallerySets[key];
    const total = data.images?.length || data.total;
    const slides = Array.from({ length: total }, (_, index) => index + 1);
    root.innerHTML = `
      <div class="gallery-toolbar">
        <span>${data.label}</span>
        <output data-gallery-count>01 / ${pad(total)}</output>
      </div>
      <div class="gallery-track" tabindex="0" data-gallery-track>
        ${slides.map((no, index) => gallerySlide(data, no, index)).join("")}
      </div>
      <div class="gallery-controls">
        <button type="button" data-gallery-prev aria-label="Previous">←</button>
        <button type="button" data-gallery-next aria-label="Next">→</button>
      </div>`;
    wireGallery(root, total);
  }

  function gallerySlide(data, no, index) {
    const image = data.images?.[index];
    if (!image) {
      return `<article class="gallery-slide"><span>${data.label} / ${pad(no)}</span><strong>IMAGE PLACEHOLDER</strong></article>`;
    }
    return `<article class="gallery-slide gallery-image-slide">
      <figure class="gallery-image-frame">
        <img src="${escapeAttr(image)}" alt="${escapeAttr(data.label)} work ${pad(no)}" loading="lazy" />
      </figure>
    </article>`;
  }

  function wireGallery(root, total) {
    const track = root.querySelector("[data-gallery-track]");
    const count = root.querySelector("[data-gallery-count]");
    const update = () => {
      const width = Math.max(1, track.clientWidth);
      const current = Math.min(total, Math.max(1, Math.round(track.scrollLeft / width) + 1));
      if (count) count.textContent = `${pad(current)} / ${pad(total)}`;
      const currentSlide = track.children[current - 1];
      const currentHeight = currentSlide?.querySelector(".gallery-image-frame")?.getBoundingClientRect().height || currentSlide?.getBoundingClientRect().height || 0;
      if (currentHeight) track.style.height = `${currentHeight}px`;
      root.querySelector("[data-gallery-prev]")?.classList.toggle("is-hidden", current <= 1);
      root.querySelector("[data-gallery-next]")?.classList.toggle("is-hidden", current >= total);
    };
    const move = (direction) => track.scrollBy({ left: direction * track.clientWidth, behavior: "smooth" });
    root.querySelector("[data-gallery-prev]")?.addEventListener("click", () => move(-1));
    root.querySelector("[data-gallery-next]")?.addEventListener("click", () => move(1));
    track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
    track.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
    });
    track.querySelectorAll("img").forEach((image) => {
      image.addEventListener("load", update, { once: true });
    });
    update();
  }

  function showGalleryControlsWhileScrolling() {
    const galleries = document.querySelectorAll(".project-gallery");
    galleries.forEach((gallery) => gallery.classList.add("is-scrolling-page"));
    clearTimeout(galleryScrollTimer);
    galleryScrollTimer = setTimeout(() => {
      galleries.forEach((gallery) => gallery.classList.remove("is-scrolling-page"));
    }, 900);
  }

  function renderWork() {
    const container = document.querySelector("[data-work-list]");
    if (!container) return;
    container.innerHTML = ["kamabo", "buglab"].map(workProject).join("");
    container.querySelectorAll("[data-gallery]").forEach((root) => renderGallery(root, root.dataset.gallery));
    scheduleFitText();
  }

  function workProject(key) {
    const project = t(`work.projects.${key}`);
    const account = profile.accounts[key];
    const order = key === "kamabo"
      ? ["xiaohongshu", "douyin", "instagram", "tiktok"]
      : ["xiaohongshu", "douyin", "instagram", "tiktok"];
    return `<article class="project-row">
      <div class="project-info">
        <h3>${project.title}</h3>
        <p>${project.description}</p>
      </div>
      <div data-gallery="${key}" class="gallery-block large-frame project-gallery" aria-label="${stripTags(project.title)} gallery"></div>
      <div class="social-stack">${order.map((platform) => socialAction(account.socials[platform], platform)).join("")}</div>
    </article>`;
  }

  function socialAction(url, platform) {
    const label = platformLabel(platform);
    const disabled = !url;
    if (disabled) {
      return `<button class="platform-action social-action is-disabled" type="button" disabled aria-disabled="true">
        <span class="platform-color" style="--platform-color:${platformMeta[platform].color};--platform-ink:${platformMeta[platform].ink || "#10110f"}">${platformMeta[platform].short}</span>
        <span class="platform-text"><small>${label}</small><strong>${label}</strong><em>${t("work.open")}</em></span>
      </button>`;
    }
    return `<a class="platform-action social-action" href="${escapeAttr(url)}" target="_blank" rel="noopener">
      <span class="platform-color" style="--platform-color:${platformMeta[platform].color};--platform-ink:${platformMeta[platform].ink || "#10110f"}">${platformMeta[platform].short}</span>
      <span class="platform-text"><small>${label}</small><strong>${label}</strong><em>${t("work.open")}</em></span>
      <b aria-hidden="true">→</b>
    </a>`;
  }

  function platformLabel(platform) {
    if (locale === "zh") {
      return {
        xiaohongshu: "小红书",
        douyin: "抖音",
      }[platform] || platform.toUpperCase();
    }
    return {
      xiaohongshu: "REDNOTE",
      douyin: "DOUYIN",
      instagram: "INSTAGRAM",
      tiktok: "TIKTOK",
      makerworld: "MAKERWORLD",
    }[platform] || platform.toUpperCase();
  }

  function renderCollabDetail() {
    const root = document.querySelector("[data-collab-detail]");
    if (!root) return;
    const steps = t("collab.steps");
    root.innerHTML = `
      <section class="collab-detail-hero large-frame">
        <p class="outline-label">00 / ${t("collab.heroMeta")}</p>
        <h1>${t("collab.detailTitle")}</h1>
        <p class="collab-secondary">${t("collab.heroSecondary")}</p>
        <p class="detail-intro">${t("collab.detailIntro")}</p>
      </section>
      <section class="process-section" aria-labelledby="process-title">
        <p class="outline-label">01 / PROCESS FIELD NOTES</p>
        <h2 id="process-title">${t("collab.processTitle")}</h2>
        <p class="process-title-en">${t("collab.processTitleEn")}</p>
        <div class="process-journal">
          ${steps.map(stepTemplate).join("")}
        </div>
      </section>
      <section class="detail-end large-frame">
        <p class="outline-label">02 / CONTACT</p>
        <h2>${locale === "zh" ? "有想法想聊聊？" : "GOT AN IDEA?<br />LET'S TALK."}</h2>
        <a class="full-action closing-action" href="/#find-baku">
          <span class="cta-copy">${t("collab.action")}</span>
          <b aria-hidden="true">→</b>
        </a>
      </section>`;
    root.querySelectorAll("[data-open-wechat]").forEach((button) => button.addEventListener("click", openWechat));
    scheduleFitText();
  }

  function scheduleFitText() {
    clearTimeout(fitTextTimer);
    fitTextTimer = setTimeout(fitSingleLineText, 0);
  }

  function fitSingleLineText() {
    const selectors = [
      "#hero-title",
      ".hero-role span",
      ".hero-statement span",
      ".collab-copy .eyebrow",
      ".collab-copy h2",
      ".collab-detail-hero h1",
      ".collab-secondary",
      ".outline-label",
      ".platform-text strong",
      ".platform-text em",
      ".full-action .cta-copy > span",
      ".full-action strong",
      ".process-copy h3",
      ".process-no",
      ".closing-section h2",
    ];
    document.querySelectorAll(selectors.join(",")).forEach((node) => {
      if (!node.offsetParent) return;
      node.style.fontSize = "";
      const parentWidth = node.parentElement?.clientWidth || node.clientWidth;
      const available = Math.max(1, parentWidth);
      if (node.scrollWidth <= available) return;
      const currentSize = parseFloat(getComputedStyle(node).fontSize);
      const nextSize = Math.max(11, currentSize * (available / node.scrollWidth) * 0.97);
      node.style.fontSize = `${nextSize}px`;
    });
  }

  function stepTemplate(step) {
    return `<article class="process-step">
      <div class="process-no">${step.no}</div>
      <div class="process-copy">
        <p class="step-en">${step.en}</p>
        <h3>${step.title}</h3>
        <p class="step-statement">${step.statement}</p>
        <p class="step-body">${step.body}</p>
      </div>
    </article>`;
  }

  function updateWechatSheet() {
    const qr = document.querySelector("[data-wechat-qr]");
    const id = document.querySelector("[data-wechat-id]");
    if (qr) qr.src = profile.contact.wechatQr;
    if (id) id.textContent = profile.contact.wechatId;
    const copy = document.querySelector("[data-copy-wechat]");
    if (copy) copy.textContent = locale === "zh" ? "复制微信号" : "COPY ID";
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
    const feedback = document.querySelector("[data-copy-feedback]");
    if (feedback) feedback.textContent = "";
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
    if (navigator.clipboard) await navigator.clipboard.writeText(profile.contact.wechatId);
    document.querySelector("[data-copy-feedback]").textContent = t("find.copied");
  }

  async function copyContactValue(event) {
    const type = event.currentTarget.dataset.copyContact;
    const value = getContactValue(type);
    if (!value) return;
    await copyText(value);
    showCopyToast(type);
  }

  async function copyText(value) {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }

  function showCopyToast(type) {
    let toast = document.querySelector("[data-copy-toast]");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "copy-toast";
      toast.setAttribute("data-copy-toast", "");
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }
    const label = type === "email" ? "EMAIL" : "WhatsApp ID";
    toast.textContent = locale === "zh" ? `已复制${label}` : `${label} copied`;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 1800);
  }

  function escapeAttr(value) {
    return String(value).replace(/"/g, "&quot;");
  }

  function stripTags(value) {
    return String(value).replace(/<[^>]*>/g, "");
  }

  function pad(number) {
    return String(number).padStart(2, "0");
  }
})();
