// Lightbox for the "Off the clock" galleries on the About page.
// Each card with data-gallery="<id>" opens the slides listed in the matching
// <ol class="gallery-source" id="<id>">: one <li> per piece, holding an
// optional <img>, an <h4> title, a <p class="gallery-meta"> detail line and a
// description <p>.
(function () {
  const cards = document.querySelectorAll("[data-gallery]");
  if (!cards.length) return;

  const box = document.createElement("div");
  box.className = "lightbox";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.hidden = true;
  box.innerHTML = `
    <div class="lightbox-bar">
      <span class="eyebrow lightbox-collection"></span>
      <button type="button" class="lightbox-link lightbox-close">Close</button>
    </div>
    <figure class="lightbox-stage">
      <div class="lightbox-media"></div>
      <figcaption class="lightbox-caption">
        <span class="eyebrow lightbox-count"></span>
        <h3 class="lightbox-title"></h3>
        <p class="eyebrow lightbox-meta"></p>
        <p class="lightbox-desc"></p>
        <div class="lightbox-nav">
          <button type="button" class="lightbox-link lightbox-prev">Previous</button>
          <button type="button" class="lightbox-link lightbox-next">Next</button>
        </div>
      </figcaption>
    </figure>`;
  document.body.appendChild(box);

  const $ = (selector) => box.querySelector(selector);
  const collectionEl = $(".lightbox-collection");
  const media = $(".lightbox-media");
  const count = $(".lightbox-count");
  const title = $(".lightbox-title");
  const meta = $(".lightbox-meta");
  const desc = $(".lightbox-desc");
  const nav = $(".lightbox-nav");
  const closeBtn = $(".lightbox-close");

  let slides = [];
  let index = 0;
  let opener = null;

  const pad = (n) => String(n).padStart(2, "0");

  function readSlides(source) {
    return [...source.children].map((li) => {
      const img = li.querySelector("img");
      const paragraphs = [...li.querySelectorAll("p:not(.gallery-meta)")];
      return {
        src: img ? img.getAttribute("src") : null,
        alt: img ? img.getAttribute("alt") || "" : "",
        title: li.querySelector("h4")?.textContent || "",
        meta: li.querySelector(".gallery-meta")?.textContent || "",
        desc: paragraphs.map((p) => p.textContent).join(" "),
      };
    });
  }

  function preload(i) {
    const slide = slides[(i + slides.length) % slides.length];
    if (slide && slide.src) new Image().src = slide.src;
  }

  function show(i) {
    index = (i + slides.length) % slides.length;
    const slide = slides[index];

    media.replaceChildren();
    if (slide.src) {
      const img = new Image();
      img.alt = slide.alt;
      img.className = "is-loading";
      img.onload = () => img.classList.remove("is-loading");
      img.src = slide.src;
      media.appendChild(img);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "lightbox-placeholder";
      placeholder.textContent = "[Add image]";
      media.appendChild(placeholder);
    }

    count.textContent = `${pad(index + 1)} / ${pad(slides.length)}`;
    title.textContent = slide.title;
    meta.textContent = slide.meta;
    meta.hidden = !slide.meta;
    desc.textContent = slide.desc;
    preload(index + 1);
    preload(index - 1);
  }

  function open(id, trigger) {
    const source = document.getElementById(id);
    if (!source) return;
    slides = readSlides(source);
    if (!slides.length) return;

    opener = trigger;
    collectionEl.textContent = source.dataset.title || "";
    box.setAttribute("aria-label", `${source.dataset.title || "Gallery"} gallery`);
    nav.hidden = slides.length < 2;
    count.hidden = slides.length < 2;
    show(0);

    box.hidden = false;
    document.documentElement.classList.add("has-lightbox");
    requestAnimationFrame(() => box.classList.add("is-open"));
    closeBtn.focus();
  }

  function close() {
    box.classList.remove("is-open");
    document.documentElement.classList.remove("has-lightbox");
    box.hidden = true;
    if (opener) opener.focus();
  }

  cards.forEach((card) => {
    card.addEventListener("click", (event) => {
      event.preventDefault();
      open(card.dataset.gallery, card);
    });
  });

  closeBtn.addEventListener("click", close);
  $(".lightbox-prev").addEventListener("click", () => show(index - 1));
  $(".lightbox-next").addEventListener("click", () => show(index + 1));

  box.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
    else if (event.key === "ArrowLeft" && slides.length > 1) show(index - 1);
    else if (event.key === "ArrowRight" && slides.length > 1) show(index + 1);
    else if (event.key === "Tab") {
      // Keep keyboard focus inside the lightbox while it's open.
      const focusable = [...box.querySelectorAll("button")].filter((b) => b.offsetParent);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  // Swipe between pieces on touch screens.
  let touchX = null;
  media.addEventListener("touchstart", (event) => {
    touchX = event.touches[0].clientX;
  }, { passive: true });
  media.addEventListener("touchend", (event) => {
    if (touchX === null || slides.length < 2) return;
    const dx = event.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    touchX = null;
  });
})();
