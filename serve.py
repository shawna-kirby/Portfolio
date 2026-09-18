"""Local preview server for this site. Development only — never deployed.

Two things it adds on top of `python3 -m http.server`:

1. No caching. Plain http.server sends no Cache-Control header, so browsers
   fall back to heuristic caching and keep showing a stale copy of the page
   long after the files on disk have changed.

2. Auto-reload. HTML responses get a small polling script appended, so the
   open page refreshes itself a moment after any file is saved. The script is
   injected on the way out and is never written to the .html files
   themselves — the source files stay clean and the deployed site is
   unaffected.

3. Protected pages. The Portfolio page and case studies are served from their
   editable copies in _private/, so edits show up without re-running lock.py.
   Add ?locked to a URL to see the password-protected version instead.

    python3 serve.py            # http://localhost:8766
    python3 serve.py 9000       # a different port
"""

import http.server
import json
import os
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
ROOT = os.path.dirname(os.path.abspath(__file__))
POLL_PATH = "/__reload"

RELOAD_SCRIPT = """
<script>
/* Injected by serve.py for local preview. Not part of the site. */
(function () {
  var known = null;
  function poll() {
    fetch("%s", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (known === null) {
          known = data.version;
        } else if (data.version !== known) {
          location.reload();
          return;
        }
        setTimeout(poll, 700);
      })
      .catch(function () { setTimeout(poll, 2000); });
  }
  poll();
})();
</script>
""" % POLL_PATH


def site_version():
    """Newest mtime across the site — changes whenever any file is saved."""
    newest = 0.0
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]
        for name in filenames:
            if name.startswith("."):
                continue
            try:
                newest = max(newest, os.path.getmtime(os.path.join(dirpath, name)))
            except OSError:
                pass
    return newest


class PreviewHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # The reload poll would otherwise flood the log every 700ms.
        if args and POLL_PATH in str(args[0]):
            return
        super().log_message(fmt, *args)

    def _send_bytes(self, body, content_type):
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.split("?")[0] == POLL_PATH:
            self._send_bytes(
                json.dumps({"version": site_version()}).encode("utf-8"),
                "application/json",
            )
            return

        path = self.translate_path(self.path)
        if os.path.isdir(path):
            index = os.path.join(path, "index.html")
            if os.path.isfile(index):
                path = index

        # Protected pages: preview the editable copy in _private/ rather than
        # the locked one. Add ?locked to the URL to see what visitors see.
        private = os.path.join(ROOT, "_private", os.path.relpath(path, ROOT))
        if "locked" not in self.path.partition("?")[2] and os.path.isfile(private):
            path = private

        if path.endswith(".html") and os.path.isfile(path):
            with open(path, "r", encoding="utf-8") as f:
                html = f.read()
            if "</body>" in html:
                html = html.replace("</body>", RELOAD_SCRIPT + "</body>", 1)
            else:
                html += RELOAD_SCRIPT
            self._send_bytes(html.encode("utf-8"), "text/html; charset=utf-8")
            return

        super().do_GET()


if __name__ == "__main__":
    os.chdir(ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), PreviewHandler) as httpd:
        print("Serving http://localhost:%d  (no-cache, auto-reload)" % PORT)
        httpd.serve_forever()
