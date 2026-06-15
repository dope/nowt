# Nowt

A minimal, offline-first markdown note taker. One note, kept in your browser's
`localStorage`. No backend, no accounts, no build step.

## Use it

Open `index.html` in a browser. That's it — clone or download, then double-click.

```
git clone --depth=1 https://github.com/dope/nowt.git
```

Everything runs from `file://`; the markdown renderer ([marked]) and sanitizer
([DOMPurify]) are vendored in `js/vendor/`, so it works with no network.

## Features

- **Live split-pane preview** — write markdown on the left, see it rendered on the right.
- **Auto-save** — your note is saved to `localStorage` as you type.
- **Smart editing** — `Tab` / `Shift+Tab` indent and outdent (including across a
  selection); `Enter` continues bullet, numbered, and checkbox lists, and clears
  an empty bullet to break out of the list.
- **Export** — save the note as a `.md` file with the save button or `Ctrl/⌘+S`.
- **Drag & drop** — drop a text/markdown file onto the editor to load it.
- **Dark preview** and a **single-pane toggle** for small screens.

Web fonts (Fira Mono, PT Serif) load from Google Fonts as progressive
enhancement and fall back to native system fonts when offline.

[marked]: https://github.com/markedjs/marked
[DOMPurify]: https://github.com/cure53/DOMPurify
