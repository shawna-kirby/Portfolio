// Lightbox for case study screenshots. Click (or focus and press Enter on)
// any image in a .case-study-figures block to see that page's screenshots
// full size, one at a time. If an image has data-full, that larger export is
// what loads here; the page itself only ever loads the smaller src.
// Case study content is inserted after the password check (unlock.js), so
// clicks are caught at the document, and images are made keyboard-focusable
// again when unlock.js fires "content:revealed". Off on phones, where the
// image already fills the screen.
(function () {
  const SELECTOR = ".case-study-figures img";
  const phone = window.matchMedia("(max-width: 720px)");

  let box = null;
  let media, count, label, nav, closeBtn;
  let slides = [];
  let index = 0;
  let opener = null;

  const pad = (n) => String(n).padStart(2, "0");

  function build() {
    box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.hidden = true;
    box.innerHTML = `
      <div class="lightbox-bar">
        <span class="eyebrow lightbox-label"></span>
        <button type="button" class="lightbox-link lightbox-close">Close</button>
      </div>
      <figure class="lightbox-stage">
        <div class="lightbox-media"></div>
        <figcaption class="lightbox-caption">
          <span class="eyebrow lightbox-count"></span>
          <div class="lightbox-nav">
            <button type="button" class="lightbox-link lightbox-prev">Previous</button>
            <button type="button" class="lightbox-link lightbox-next">Next</button>
          </div>
        </figcaption>
      </figure>`;
    document.body.appendChild(box);

    const $ = (selector) => box.querySelector(selector);
    media = $(".lightbox-media");
    count = $(".lightbox-count");
    label = $(".lightbox-label");
    nav = $(".lightbox-nav");
    closeBtn = $(".lightbox-close");

    closeBtn.addEventListener("click", close);
    $(".lightbox-prev").addEventListener("click", () => show(index - 1));
    $(".lightbox-next").addEventListener("click", () => show(index + 1));
    box.addEventListener("keydown", onKey);

    // Swipe between screenshots on touch screens (tablets).
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
  }

  function preload(i) {
    const slide = slides[(i + slides.length) % slides.length];
    if (slide) new Image().src = slide.src;
  }

  function show(i) {
    index = (i + slides.length) % slides.length;
    const slide = slides[index];

    const img = new Image();
    img.alt = slide.alt;
    img.className = "is-loading";
    img.onload = () => img.classList.remove("is-loading");
    img.src = slide.src;
    media.replaceChildren(img);

    count.textContent = `${pad(index + 1)} / ${pad(slides.length)}`;
    preload(index + 1);
    preload(index - 1);
  }

  function open(trigger) {
    const images = [...document.querySelectorAll(SELECTOR)];
    slides = images.map((img) => ({
      src: img.dataset.full || img.getAttribute("src"),
      alt: img.getAttribute("alt") || "",
    }));
    if (!slides.length) return;
    if (!box) build();

    opener = trigger;
    const title = document.querySelector("h1")?.textContent.trim() || "";
    label.textContent = title;
    box.setAttribute("aria-label", title ? `${title} screenshots` : "Screenshots");
    nav.hidden = slides.length < 2;
    count.hidden = slides.length < 2;
    show(Math.max(0, images.indexOf(trigger)));

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

  function onKey(event) {
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
  }

  // Let keyboard users reach and open each screenshot.
  function enhance() {
    document.querySelectorAll(SELECTOR).forEach((img) => {
      if (img.hasAttribute("tabindex")) return;
      img.tabIndex = 0;
      img.setAttribute("role", "button");
      img.setAttribute("aria-label", `Enlarge image: ${img.getAttribute("alt") || ""}`);
    });
  }

  document.addEventListener("click", (event) => {
    const img = event.target.closest(SELECTOR);
    if (!img || phone.matches) return;
    open(img);
  });

  document.addEventListener("keydown", (event) => {
    const img = event.target.closest && event.target.closest(SELECTOR);
    if (!img || phone.matches || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    open(img);
  });

  enhance();
  document.addEventListener("content:revealed", enhance);
})();
