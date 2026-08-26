// Mobile nav toggle — used on every page that includes the shared nav.
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");

  if (!toggle || !links) return;

  toggle.addEventListener("click", () => {
    const isOpen = links.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  links.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      links.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
});

// Sticky nav shadow — only appears once there's scrolled content behind it.
document.addEventListener("DOMContentLoaded", () => {
  const nav = document.querySelector(".site-nav");
  if (!nav) return;

  const updateShadow = () => {
    nav.classList.toggle("is-scrolled", window.scrollY > 4);
  };

  updateShadow();
  window.addEventListener("scroll", updateShadow, { passive: true });
});
