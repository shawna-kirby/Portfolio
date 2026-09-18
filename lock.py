"""Locks the password-protected pages for publishing.

The Portfolio page and every case study are written and edited in `_private/`,
which is gitignored and never published. This script encrypts the content of
each of those pages (everything between the nav and the footer) and writes the
locked copy to the same path in the site, e.g.

    _private/work.html              ->  work.html
    _private/work/bulk-bill-pay.html ->  work/bulk-bill-pay.html

The locked page keeps its nav and footer, so it can still be linked to and
navigated to, but shows a password prompt in place of the content.
assets/js/unlock.js decrypts it in the browser.

    python3 lock.py

Run it after every edit to a protected page, before committing. It asks for
the password each time; use the same one unless you mean to change it.

Encryption: PBKDF2-SHA256 derives an AES-256-CBC key and an HMAC-SHA256 key
from the password (encrypt-then-MAC). AES comes from the system `openssl`,
since the Python standard library doesn't include it.
"""

import base64
import getpass
import hashlib
import hmac
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
PRIVATE = os.path.join(ROOT, "_private")
ITERATIONS = 310000

GATE = """<main class="lock-gate" data-protected data-checking>
    <div class="container-prose">
      <span class="eyebrow">Password protected</span>
      <h1>Enter the password to view my work</h1>
      <p>
        Case studies are shared by request.
        <a href="mailto:shawna@shawnakirby.com?subject=Portfolio%%20password">Request access</a>
      </p>
      <form class="lock-form">
        <label for="lock-password" class="eyebrow">Password</label>
        <div class="lock-row">
          <input id="lock-password" type="password" autocomplete="current-password" required />
          <button type="submit" class="btn btn-primary">Unlock</button>
        </div>
        <p class="lock-error" role="alert" hidden>That password didn&rsquo;t work. Try again.</p>
      </form>
      <noscript>
        <style>.lock-gate[data-checking] { visibility: visible; }</style>
        <p>JavaScript is needed to unlock this page.</p>
      </noscript>
    </div>
  </main>

  <script type="application/json" id="protected-payload">%(payload)s</script>
  <script src="%(prefix)sassets/js/unlock.js"></script>"""


def b64(data):
    return base64.b64encode(data).decode("ascii")


def ask_password():
    password = os.environ.get("PORTFOLIO_PASSWORD")
    if password:
        return password
    password = getpass.getpass("Password: ")
    if not password:
        sys.exit("No password entered — nothing was locked.")
    if getpass.getpass("Type it again: ") != password:
        sys.exit("Passwords didn't match — nothing was locked.")
    return password


def encrypt(plaintext, keys):
    iv = os.urandom(16)
    ciphertext = subprocess.run(
        ["openssl", "enc", "-aes-256-cbc", "-K", keys[:32].hex(), "-iv", iv.hex()],
        input=plaintext,
        capture_output=True,
        check=True,
    ).stdout
    mac = hmac.new(keys[32:], iv + ciphertext, hashlib.sha256).digest()
    return iv, ciphertext, mac


def private_pages():
    for dirpath, dirnames, filenames in os.walk(PRIVATE):
        dirnames[:] = sorted(d for d in dirnames if not d.startswith("."))
        for name in sorted(filenames):
            if name.endswith(".html"):
                yield os.path.relpath(os.path.join(dirpath, name), PRIVATE)


def lock_page(rel, salt, keys):
    with open(os.path.join(PRIVATE, rel), "r", encoding="utf-8") as f:
        html = f.read()

    nav_end = html.find("</nav>")
    footer_start = html.find("<footer")
    if nav_end == -1 or footer_start == -1 or footer_start < nav_end:
        sys.exit("%s: couldn't find the nav and footer — nothing was locked." % rel)
    start = nav_end + len("</nav>")

    iv, ciphertext, mac = encrypt(html[start:footer_start].strip().encode("utf-8"), keys)
    payload = json.dumps({
        "salt": b64(salt),
        "iterations": ITERATIONS,
        "iv": b64(iv),
        "ciphertext": b64(ciphertext),
        "mac": b64(mac),
    })
    gate = GATE % {"payload": payload, "prefix": "../" * rel.count(os.sep)}
    return html[:start] + "\n\n  " + gate + "\n\n  " + html[footer_start:]


def main():
    pages = list(private_pages())
    if not pages:
        sys.exit("No pages found in _private/ — nothing to lock.")

    password = ask_password()
    # One salt per run, shared by every page, so a visitor who unlocks one
    # page can open the rest without re-entering the password.
    salt = os.urandom(16)
    keys = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, ITERATIONS, dklen=64)

    locked = {rel: lock_page(rel, salt, keys) for rel in pages}
    for rel, html in locked.items():
        out = os.path.join(ROOT, rel)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, "w", encoding="utf-8") as f:
            f.write(html)
        print("  locked  %s" % rel)

    # Flag any case study that exists only as a public page, unencrypted.
    for name in sorted(os.listdir(os.path.join(ROOT, "work"))):
        rel = os.path.join("work", name)
        if name.endswith(".html") and rel not in locked:
            print("  WARNING  %s is not in _private/, so it is NOT protected" % rel)

    print("Done — %d pages locked." % len(locked))


if __name__ == "__main__":
    main()
