/**
 * Nowt — a minimal, offline-first markdown note taker.
 *
 * One note, kept in localStorage. No backend, no build step.
 * Dependencies (vendored locally so it works from file://):
 *   - marked     → markdown to HTML
 *   - DOMPurify  → sanitize the rendered HTML before injecting it
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'value';      // kept from the original so existing notes survive
  var THEME_KEY = 'nowt-theme';
  var TAB = '  ';                 // two spaces per indent level

  var textarea = document.getElementById('textarea');
  var preview = document.getElementById('preview');

  /* ---------------------------------------------------------------- render */

  function render() {
    preview.innerHTML = DOMPurify.sanitize(marked.parse(textarea.value || ''));
  }

  /* --------------------------------------------------------------- storage */

  // Restore the saved note (only if the textarea isn't already populated).
  if (!textarea.value) {
    textarea.value = window.localStorage.getItem(STORAGE_KEY) || '';
  }

  var saveTimer;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      window.localStorage.setItem(STORAGE_KEY, textarea.value);
    }, 300);
  }

  textarea.addEventListener('input', function () {
    render();
    scheduleSave();
  });

  /* --------------------------------------------------------- editor keys */

  // Replace the current selection with `text` and place the caret at `caret`.
  function replaceRange(start, end, text, caret) {
    textarea.setRangeText(text, start, end, 'end');
    if (typeof caret === 'number') {
      textarea.selectionStart = textarea.selectionEnd = caret;
    }
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  var listRe = /^(\s*)([-*+]|\d+\.)(\s+\[[ xX]\])?(\s+)(.*)$/;

  textarea.addEventListener('keydown', function (e) {
    var value = textarea.value;
    var start = textarea.selectionStart;
    var end = textarea.selectionEnd;

    // Tab / Shift+Tab → indent or outdent (works across a multi-line selection)
    if (e.key === 'Tab') {
      e.preventDefault();
      var lineStart = value.lastIndexOf('\n', start - 1) + 1;
      var block = value.slice(lineStart, end);

      if (e.shiftKey) {
        var outdented = block.replace(/^(\t| {1,2})/gm, '');
        replaceRange(lineStart, end, outdented);
        textarea.selectionStart = Math.max(lineStart, start - TAB.length);
        textarea.selectionEnd = lineStart + outdented.length;
      } else if (start === end) {
        replaceRange(start, end, TAB, start + TAB.length);
      } else {
        var indented = block.replace(/^/gm, TAB);
        replaceRange(lineStart, end, indented);
        textarea.selectionStart = start + TAB.length;
        textarea.selectionEnd = lineStart + indented.length;
      }
      return;
    }

    // Enter on a list line → continue the bullet, or exit an empty one
    if (e.key === 'Enter' && !e.shiftKey && start === end) {
      var ls = value.lastIndexOf('\n', start - 1) + 1;
      var line = value.slice(ls, start);
      var m = line.match(listRe);
      if (m) {
        var content = m[5];
        if (content === '') {
          // empty bullet → remove the marker and break out of the list
          e.preventDefault();
          replaceRange(ls, start, '', ls);
          return;
        }
        e.preventDefault();
        var marker = /^\d+\.$/.test(m[2])
          ? (parseInt(m[2], 10) + 1) + '.'   // auto-increment ordered lists
          : m[2];
        var checkbox = m[3] ? ' [ ]' : '';
        var insert = '\n' + m[1] + marker + checkbox + m[4];
        replaceRange(start, start, insert, start + insert.length);
        return;
      }
    }
  });

  /* ------------------------------------------------------------- save file */

  function saveFile() {
    var name = 'nowt_' + new Date().toISOString().slice(0, 10) + '.md';
    var blob = new Blob([textarea.value], { type: 'text/markdown;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  document.querySelector('.js-save').addEventListener('click', saveFile);

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveFile();
    }
  });

  /* ----------------------------------------------------- drag & drop load */

  textarea.addEventListener('dragover', function (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  textarea.addEventListener('drop', function (e) {
    e.preventDefault();
    var file = e.dataTransfer.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      textarea.value = ev.target.result;
      render();
      scheduleSave();
    };
    reader.readAsText(file, 'UTF-8');
  });

  /* ----------------------------------------------------------- ui toggles */

  // Dark preview, remembered across sessions.
  function applyTheme(theme) {
    document.body.classList.toggle('theme--dark', theme === 'dark');
  }
  applyTheme(window.localStorage.getItem(THEME_KEY));

  document.querySelector('.js-theme').addEventListener('click', function () {
    var dark = !document.body.classList.contains('theme--dark');
    applyTheme(dark ? 'dark' : 'light');
    window.localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  });

  // Single-pane toggle (mainly for narrow screens).
  document.querySelector('.js-pane').addEventListener('click', function () {
    document.body.classList.toggle('show-preview');
  });

  /* -------------------------------------------------------------- startup */

  render();
})();
