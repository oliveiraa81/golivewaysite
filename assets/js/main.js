/* =====================================================================
 *  CONFIGURAÇÃO
 * ===================================================================== */
var CONFIG = {
  UPDATES_URL: "https://linkedin.com/company/goliveway"
};
/* ===================================================================== */

(function () {
  "use strict";

  var STORAGE_KEY = "site-lang";
  var isSet = function (v, ph) { return v && v !== ph; };

  /* ---------- Ligações ---------- */
  function applyLinks() {
    var map = {
      updates: isSet(CONFIG.UPDATES_URL, "UPDATES_URL") ? CONFIG.UPDATES_URL : null
    };
    document.querySelectorAll("[data-link]").forEach(function (a) {
      var url = map[a.getAttribute("data-link")];
      if (url) {
        a.href = url;
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
        a.classList.remove("is-placeholder");
        a.removeAttribute("title");
      } else {
        a.href = "#contacto";
        a.removeAttribute("target");
        a.classList.add("is-placeholder");
        a.title = "Placeholder por preencher em assets/js/main.js (CONFIG)";
      }
    });
  }

  /* ---------- Idioma ---------- */
  var ptCache = {};
  var ptAltCache = {};
  var ptAriaCache = {};
  var ptTitleCache = {};

  function snapshotPT() {
    document.querySelectorAll("[data-i18n]").forEach(function (el, i) {
      ptCache[i] = el.innerHTML;
    });
    document.querySelectorAll("[data-i18n-alt]").forEach(function (el, i) {
      ptAltCache[i] = el.getAttribute("alt");
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el, i) {
      ptAriaCache[i] = el.getAttribute("aria-label");
    });
    document.querySelectorAll("[data-i18n-title]").forEach(function (el, i) {
      ptTitleCache[i] = el.getAttribute("title");
    });
  }

  function setMeta(lang) {
    var m = (window.I18N_META || {})[lang];
    if (!m) return;
    document.title = m.title;
    var d = document.querySelector('meta[name="description"]');
    if (d) d.setAttribute("content", m.description);
  }

  function setLang(lang) {
    var en = window.I18N_EN || {};
    var useEn = lang === "en";
    document.querySelectorAll("[data-i18n]").forEach(function (el, i) {
      var k = el.getAttribute("data-i18n");
      el.innerHTML = useEn && en[k] != null ? en[k] : ptCache[i];
    });
    document.querySelectorAll("[data-i18n-alt]").forEach(function (el, i) {
      var k = el.getAttribute("data-i18n-alt");
      el.setAttribute("alt", useEn && en[k] != null ? en[k] : ptAltCache[i]);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el, i) {
      var k = el.getAttribute("data-i18n-aria");
      el.setAttribute("aria-label", useEn && en[k] != null ? en[k] : ptAriaCache[i]);
    });
    document.querySelectorAll("[data-i18n-title]").forEach(function (el, i) {
      var k = el.getAttribute("data-i18n-title");
      el.setAttribute("title", useEn && en[k] != null ? en[k] : ptTitleCache[i]);
    });
    document.documentElement.lang = useEn ? "en" : "pt-PT";
    document.querySelectorAll(".lang-toggle [data-lang]").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-lang") === lang ? "true" : "false");
    });
    setMeta(useEn ? "en" : "pt");
    try { localStorage.setItem(STORAGE_KEY, useEn ? "en" : "pt"); } catch (e) {}
  }

  function currentLang() {
    return document.documentElement.lang === "en" ? "en" : "pt";
  }

  function t(key) {
    var en = window.I18N_EN || {};
    var pt = window.I18N_PT || {};
    if (currentLang() === "en" && en[key] != null) return en[key];
    if (pt[key] != null) return pt[key];
    var el = document.querySelector('[data-i18n="' + key + '"]');
    return el ? el.textContent : key;
  }

  function initialLang() {
    var q = /[?&]lang=(pt|en)\b/.exec(location.search);
    if (q) return q[1];
    try {
      var s = localStorage.getItem(STORAGE_KEY);
      if (s === "pt" || s === "en") return s;
    } catch (e) {}
    return "pt";
  }

  /* ---------- Tema claro / escuro ---------- */
  var THEME_KEY = "site-theme";
  function currentTheme() { return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"; }
  function syncThemeButtons() {
    var tTheme = currentTheme();
    document.querySelectorAll("[data-theme-set]").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-theme-set") === tTheme ? "true" : "false");
    });
  }
  function setTheme(theme, persist) {
    document.documentElement.setAttribute("data-theme", theme);
    if (persist) { try { localStorage.setItem(THEME_KEY, theme); } catch (e) {} }
    syncThemeButtons();
  }
  function initTheme() {
    syncThemeButtons();
    document.querySelectorAll("[data-theme-set]").forEach(function (b) {
      b.addEventListener("click", function () { setTheme(b.getAttribute("data-theme-set"), true); });
    });
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: dark)");
      var onChange = function (e) {
        var stored = null;
        try { stored = localStorage.getItem(THEME_KEY); } catch (err) {}
        if (stored !== "light" && stored !== "dark") setTheme(e.matches ? "dark" : "light", false);
      };
      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  }

  /* ---------- Menu móvel ---------- */
  function initMenu() {
    var btn = document.querySelector(".menu-btn");
    var nav = document.getElementById("nav-links");
    if (!btn || !nav) return;
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Cabeçalho ---------- */
  function initHeader() {
    var h = document.querySelector(".site-header");
    var onScroll = function () { h.classList.toggle("scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Modal de contacto ---------- */
  function initContactModal() {
    var modal = document.getElementById("contact-modal");
    var form = document.getElementById("contact-form");
    var status = document.getElementById("contact-form-status");
    if (!modal || !form) return;

    var openers = document.querySelectorAll("[data-open-contact]");
    var closers = document.querySelectorAll("[data-close-contact]");
    var submitBtn = form.querySelector('[type="submit"]');

    function showStatus(kind, message) {
      status.hidden = false;
      status.className = "form-status " + (kind === "ok" ? "is-ok" : "is-err");
      status.textContent = message;
    }

    function clearStatus() {
      status.hidden = true;
      status.textContent = "";
      status.className = "form-status";
    }

    function openModal() {
      clearStatus();
      if (typeof modal.showModal === "function") modal.showModal();
      else modal.setAttribute("open", "");
      var first = form.querySelector("input:not(.hp), textarea");
      if (first) setTimeout(function () { first.focus(); }, 30);
    }

    function closeModal() {
      if (typeof modal.close === "function") modal.close();
      else modal.removeAttribute("open");
    }

    openers.forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        openModal();
      });
    });
    closers.forEach(function (el) {
      el.addEventListener("click", closeModal);
    });
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal();
    });
    modal.addEventListener("cancel", function (e) {
      e.preventDefault();
      closeModal();
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearStatus();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var honey = form.querySelector('input[name="_gotcha"]');
      if (honey && honey.value) return;

      var name = form.name.value.trim();
      var phone = form.phone.value.trim();
      var email = form.email.value.trim();
      var description = form.description.value.trim();

      if (!name || !email || !description) {
        showStatus("err", t("form.error"));
        return;
      }

      submitBtn.disabled = true;
      var prevLabel = submitBtn.textContent;
      submitBtn.textContent = t("form.sending");

      var payload = {
        name: name,
        email: email,
        phone: phone,
        description: description,
        lang: currentLang(),
        _gotcha: honey ? honey.value : ""
      };

      fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok || !data || !data.ok) throw new Error((data && data.error) || "fail");
            return data;
          });
        })
        .then(function () {
          form.reset();
          showStatus("ok", t("form.success"));
        })
        .catch(function () {
          showStatus("err", t("form.error"));
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = prevLabel;
        });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    snapshotPT();
    applyLinks();
    setLang(initialLang());
    document.querySelectorAll(".lang-toggle [data-lang]").forEach(function (b) {
      b.addEventListener("click", function () { setLang(b.getAttribute("data-lang")); });
    });
    initTheme();
    initMenu();
    initHeader();
    initContactModal();
  });
})();
