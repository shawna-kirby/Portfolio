// Password gate for the Portfolio page and case studies.
// lock.py encrypts each page's content; this decrypts it in the browser.
// Once unlocked, the derived key is kept for the browser tab's session so
// the other protected pages open without asking again.
(function () {
  const payloadEl = document.getElementById("protected-payload");
  const gate = document.querySelector("[data-protected]");
  if (!payloadEl || !gate) return;

  const payload = JSON.parse(payloadEl.textContent);
  const storageKey = "portfolio-unlock:" + payload.salt;
  const form = gate.querySelector(".lock-form");
  const input = gate.querySelector("#lock-password");
  const error = gate.querySelector(".lock-error");
  const button = form.querySelector("button");
  const label = button.querySelector(".btn-label");
  const idleLabel = label.textContent;
  // Keep the loading state up long enough to read as a transition, not a flicker.
  const MIN_LOADING_MS = 600;

  const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const toB64 = (bytes) => btoa(String.fromCharCode(...bytes));

  async function deriveKeys(password) {
    const base = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: fromB64(payload.salt), iterations: payload.iterations },
      base,
      512
    );
    return new Uint8Array(bits);
  }

  // Returns the page content, or null if the keys are wrong.
  async function decrypt(keys) {
    const aesKey = await crypto.subtle.importKey("raw", keys.slice(0, 32), "AES-CBC", false, ["decrypt"]);
    const macKey = await crypto.subtle.importKey(
      "raw", keys.slice(32), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const iv = fromB64(payload.iv);
    const ciphertext = fromB64(payload.ciphertext);
    const signed = new Uint8Array(iv.length + ciphertext.length);
    signed.set(iv);
    signed.set(ciphertext, iv.length);

    const valid = await crypto.subtle.verify("HMAC", macKey, fromB64(payload.mac), signed);
    if (!valid) return null;
    const plain = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, aesKey, ciphertext);
    return new TextDecoder().decode(plain);
  }

  function reveal(html) {
    gate.insertAdjacentHTML("beforebegin", html);
    gate.remove();
    if (location.hash) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) target.scrollIntoView();
    }
  }

  function showGate() {
    gate.removeAttribute("data-checking");
  }

  // Already unlocked earlier in this session?
  (async () => {
    let saved = null;
    try {
      saved = sessionStorage.getItem(storageKey);
    } catch (e) {}
    if (saved) {
      try {
        const html = await decrypt(fromB64(saved));
        if (html !== null) return reveal(html);
      } catch (e) {}
    }
    showGate();
  })();

  // The submit button stays disabled while the field is blank.
  const syncButton = () => {
    button.disabled = !input.value;
  };
  input.addEventListener("input", syncButton);
  syncButton();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!input.value) return;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    label.textContent = "Loading case studies…";
    error.hidden = true;
    const minDelay = new Promise((resolve) => setTimeout(resolve, MIN_LOADING_MS));

    try {
      const keys = await deriveKeys(input.value);
      const html = await decrypt(keys);
      await minDelay;
      if (html === null) {
        error.hidden = false;
        input.select();
        return;
      }
      try {
        sessionStorage.setItem(storageKey, toB64(keys));
      } catch (e) {}
      reveal(html);
    } finally {
      button.removeAttribute("aria-busy");
      label.textContent = idleLabel;
      syncButton();
    }
  });
})();
