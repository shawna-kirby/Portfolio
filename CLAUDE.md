# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal portfolio site for Shawna Kirby, a UX design IC and leader. Static HTML/CSS/JS — no build step, no dependencies, no package manager. Every page is opened and edited directly.

## Running locally

There's no dev server dependency required — any static file server works:

```
python3 -m http.server 8765
```

Then visit `http://localhost:8765/index.html`.

## Structure

- `index.html` — home page
- `work.html` — case studies index (grid of project cards)
- `work/case-study-template.html` — the template for individual case studies. Duplicate it per project (e.g. `work/project-name.html`) and link it from both `work.html` and the home page's "Featured work" cards.
- `about.html` — bio / leadership philosophy page
- `assets/css/style.css` — all shared styles (single stylesheet, no preprocessor)
- `assets/js/main.js` — the mobile nav toggle; shared across all pages
- `ShawnaKirby_Resume_2026.pdf` — linked directly from nav/footer on every page

## Password-protected pages

`work.html` and every `work/*.html` case study are password protected. The repo is public, so their real content must never be committed in readable form:

- **Edit only the copies in `_private/`** (`_private/work.html`, `_private/work/*.html`). `_private/` is gitignored. New case studies are created there too (duplicate `_private/work/case-study-template.html`).
- **Run `python3 lock.py`** after editing, before committing. It asks for the password, encrypts everything between each page's `</nav>` and `<footer>`, and writes the locked page to the public path (`work.html`, `work/*.html`). Never hand-edit those public copies — they're overwritten on every lock.
- `assets/js/unlock.js` shows the password prompt and decrypts in the browser; the unlocked key is kept in `sessionStorage` so one password entry opens every protected page for that tab session.
- `serve.py` previews the `_private/` copies by default; add `?locked` to a URL to see the public, locked version. It shows a "Not published yet" banner while any `_private/` page is newer than its locked copy.
- A local git pre-commit hook (`.git/hooks/pre-commit`, runs `python3 lock.py --check`) blocks commits while any protected page is un-locked.
- After editing anything in `_private/`, re-lock (`PORTFOLIO_PASSWORD=… python3 lock.py`, same password as before) and offer to commit and push — the site owner relies on this and won't remember on their own.
- **Cache busting:** `lock.py` also stamps every page's `assets/css` and `assets/js` links with a content fingerprint (`style.css?v=280b577e`), so after changing any stylesheet or script, run `lock.py` too. The pre-commit check fails if any page's fingerprint is out of date.
- Nav/footer changes still need to be made in the `_private/` copies (and then re-locked) rather than the public ones.

Every page includes its own copy of the nav and footer markup (no templating layer), so changes to nav links or footer content need to be repeated across `index.html`, `work.html`, `about.html`, and each `work/*.html` page.

## Design system

Defined as CSS custom properties at the top of `assets/css/style.css`:
- Warm neutral palette (cream background, ink text, terracotta accent)
- Display font: Fraunces (serif, headings) — Body font: Inter (sans, loaded via Google Fonts `<link>` tags in each page's `<head>`)
- Spacing scale: every margin, padding and gap uses a `--space-*` token (4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128 · 160px) — never a raw px value, including inline `style=""` in the HTML. The only exception is the hamburger icon's line geometry.
- Layout rhythm tokens name the big gaps and point at scale steps: `--page-top`, `--section-space-lg`, `--section-space`, `--section-space-sm`, `--nav-height`. Below 720px they step down the same scale (e.g. 160→64, 96→48) so phones never show a screen of empty space. Use these, not raw `--space-*`, for page tops and gaps between sections.
- Responsive breakpoints at 900px and 720px; mobile nav becomes a slide-in panel toggled by `.nav-toggle` below 720px

## Content placeholders

Bracketed text like `[Project Name]` or `[One or two sentences on...]` marks real content that still needs to be written — these aren't code TODOs, they're copy the site owner needs to fill in.
