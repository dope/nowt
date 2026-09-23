/**
 * Nowt — a minimal, offline-first markdown note taker.
 *
 * Notes live in localStorage. No backend, no build step.
 * Dependencies (vendored locally so it works from file://):
 *   - marked     → markdown to HTML
 *   - DOMPurify  → sanitize the rendered HTML before injecting it
 */
(function () {
  'use strict';

  var NOTES_KEY = 'nowt-notes';   // JSON: [{ id, body, created, updated }]
  var ACTIVE_KEY = 'nowt-active'; // id of the open note
  var THEME_KEY = 'nowt-theme';
  var LEGACY_KEY = 'value';       // the original single-note key, migrated on load
  var TAB = '  ';                 // two spaces per indent level

  var textarea = document.getElementById('textarea');
  var preview = document.getElementById('preview');
  var sidebar = document.getElementById('sidebar');
  var notesList = document.getElementById('notes');
  var search = document.getElementById('search');
  var statusEl = document.getElementById('status');
  var scrim = document.getElementById('scrim');

  var notes = [];      // in-memory copy of the collection
  var activeId = null;

  /* --------------------------------------------------------------- helpers */

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // A note's display title: first non-empty line, stripped of markdown noise.
  function titleOf(note) {
    var line = (note.body || '').split('\n').find(function (l) { return l.trim(); }) || '';
    line = line.replace(/^\s*#{1,6}\s+/, '')        // heading marks
               .replace(/^\s*(?:[-*+]|\d+\.)\s+(?:\[[ xX]\]\s+)?/, '') // list marks
               .replace(/[*_`>~]/g, '')             // inline emphasis
               .trim();
    return line || 'Untitled';
  }

  function snippetOf(note) {
    var body = (note.body || '').split('\n').slice(1).join(' ').replace(/[#*_`>~-]/g, '').trim();
    return body.slice(0, 80);
  }

  function activeNote() {
    return notes.find(function (n) { return n.id === activeId; }) || null;
  }

  /* --------------------------------------------------------------- storage */

  function loadNotes() {
    var raw;
    try { raw = window.localStorage.getItem(NOTES_KEY); } catch (e) { raw = null; }

    if (raw) {
      try { notes = JSON.parse(raw) || []; } catch (e) { notes = []; }
    } else {
      // First run under the new model — migrate the original single note.
      var legacy = null;
      try { legacy = window.localStorage.getItem(LEGACY_KEY); } catch (e) {}
      var now = Date.now();
      notes = [{ id: uid(), body: legacy || '', created: now, updated: now }];
    }
    if (!notes.length) {
      var t = Date.now();
      notes = [{ id: uid(), body: '', created: t, updated: t }];
    }

    try { activeId = window.localStorage.getItem(ACTIVE_KEY); } catch (e) {}
    if (!activeNote()) activeId = notes[0].id;
  }

  // State cue so a failed save is never silent. 'saved' | 'saving' | 'error'.
  var statusTimer;
  function setStatus(state) {
    var labels = { saving: 'Saving…', saved: 'Saved', error: 'Save failed — storage full or blocked' };
    statusEl.textContent = labels[state] || '';
    statusEl.dataset.state = state;
    clearTimeout(statusTimer);
    if (state === 'saved') {
      statusTimer = setTimeout(function () { statusEl.dataset.state = 'idle'; }, 1500);
    }
  }

  function persist() {
    try {
      window.localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
      window.localStorage.setItem(ACTIVE_KEY, activeId);
      setStatus('saved');
    } catch (e) {
      // Quota exceeded, private-mode block, etc. Surface it loudly.
      setStatus('error');
    }
  }

  var saveTimer;
  function scheduleSave() {
    setStatus('saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 300);
  }

  /* ---------------------------------------------------------------- render */

  function render() {
    preview.innerHTML = DOMPurify.sanitize(marked.parse(textarea.value || ''));
  }

  function renderList() {
    var q = (search.value || '').toLowerCase().trim();
    var sorted = notes.slice().sort(function (a, b) { return b.updated - a.updated; });

    notesList.innerHTML = '';
    sorted.forEach(function (note) {
      var title = titleOf(note);
      if (q && (title + ' ' + note.body).toLowerCase().indexOf(q) === -1) return;

      var li = document.createElement('li');
      li.className = 'note' + (note.id === activeId ? ' note--active' : '');
      li.tabIndex = 0;
      li.dataset.id = note.id;

      var h = document.createElement('div');
      h.className = 'note__title';
      h.textContent = title;

      var s = document.createElement('div');
      s.className = 'note__snippet';
      s.textContent = snippetOf(note) || 'No additional text';

      var del = document.createElement('button');
      del.className = 'note__delete';
      del.type = 'button';
      del.setAttribute('aria-label', 'Delete note');
      del.textContent = '×';

      li.appendChild(h);
      li.appendChild(s);
      li.appendChild(del);
      notesList.appendChild(li);
    });
  }

  /* ------------------------------------------------------------ note ops */

  function selectNote(id) {
    activeId = id;
    var note = activeNote();
    textarea.value = note ? note.body : '';
    render();
    renderList();
    persist();
    textarea.focus();
  }

  function newNote() {
    var now = Date.now();
    var note = { id: uid(), body: '', created: now, updated: now };
    notes.push(note);
    search.value = '';
    selectNote(note.id);
  }

  function deleteNote(id) {
    notes = notes.filter(function (n) { return n.id !== id; });
    if (!notes.length) {
      var t = Date.now();
      notes = [{ id: uid(), body: '', created: t, updated: t }];
    }
    if (id === activeId) {
      selectNote(notes.slice().sort(function (a, b) { return b.updated - a.updated; })[0].id);
    } else {
      renderList();
      persist();
    }
  }

  /* ------------------------------------------------------------ editing */

  textarea.addEventListener('input', function () {
    var note = activeNote();
    if (note) {
      note.body = textarea.value;
      note.updated = Date.now();
    }
    render();
    scheduleSave();
    renderList();
  });

  /* --------------------------------------------------------- editor keys */

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
          e.preventDefault();
          replaceRange(ls, start, '', ls);
          return;
        }
        e.preventDefault();
        var marker = /^\d+\.$/.test(m[2])
          ? (parseInt(m[2], 10) + 1) + '.'
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
    var note = activeNote();
    var slug = titleOf(note || {}).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'note';
    var name = 'nowt_' + slug + '.md';
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
      // Dropped files become new notes rather than clobbering the current one.
      var now = Date.now();
      var note = { id: uid(), body: ev.target.result, created: now, updated: now };
      notes.push(note);
      selectNote(note.id);
    };
    reader.readAsText(file, 'UTF-8');
  });

  /* ------------------------------------------------------- sidebar events */

  function toggleSidebar(open) {
    var show = typeof open === 'boolean' ? open : !document.body.classList.contains('sidebar-open');
    document.body.classList.toggle('sidebar-open', show);
    if (show) search.focus();
  }

  document.querySelector('.js-notes').addEventListener('click', function () { toggleSidebar(); });
  scrim.addEventListener('click', function () { toggleSidebar(false); });
  document.querySelector('.js-new').addEventListener('click', newNote);
  search.addEventListener('input', renderList);

  notesList.addEventListener('click', function (e) {
    var li = e.target.closest('.note');
    if (!li) return;
    if (e.target.classList.contains('note__delete')) {
      deleteNote(li.dataset.id);
      return;
    }
    selectNote(li.dataset.id);
    if (window.matchMedia('(max-width: 40em)').matches) toggleSidebar(false);
  });

  notesList.addEventListener('keydown', function (e) {
    var li = e.target.closest('.note');
    if (li && e.key === 'Enter') selectNote(li.dataset.id);
  });

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveFile();
    }
    // Ctrl/Cmd+J → new note (Ctrl+N is reserved by the browser)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
      e.preventDefault();
      newNote();
    }
    if (e.key === 'Escape' && document.body.classList.contains('sidebar-open')) {
      toggleSidebar(false);
    }
  });

  document.querySelector('.js-save').addEventListener('click', saveFile);

  /* ----------------------------------------------------- cross-tab sync */

  // Another tab wrote to storage — reconcile without stomping on active typing.
  window.addEventListener('storage', function (e) {
    if (e.key !== NOTES_KEY) return;
    var incoming;
    try { incoming = JSON.parse(e.newValue) || []; } catch (err) { return; }
    notes = incoming;
    var note = activeNote();
    if (!note) { activeId = notes.length ? notes[0].id : null; note = activeNote(); }
    // Only refresh the editor if the user isn't mid-edit in this tab.
    if (note && document.activeElement !== textarea && note.body !== textarea.value) {
      textarea.value = note.body;
      render();
    }
    renderList();
  });

  /* ----------------------------------------------------------- ui toggles */

  function applyTheme(theme) {
    document.body.classList.toggle('theme--dark', theme === 'dark');
  }
  applyTheme(window.localStorage.getItem(THEME_KEY));

  document.querySelector('.js-theme').addEventListener('click', function () {
    var dark = !document.body.classList.contains('theme--dark');
    applyTheme(dark ? 'dark' : 'light');
    try { window.localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (e) {}
  });

  document.querySelector('.js-pane').addEventListener('click', function () {
    document.body.classList.toggle('show-preview');
  });

  /* ------------------------------------------------------- synced scroll */

  var scrollLock = null;
  function syncScroll(src, dst) {
    return function () {
      if (scrollLock && scrollLock !== src) return;
      scrollLock = src;
      var srcMax = src.scrollHeight - src.clientHeight;
      var ratio = srcMax > 0 ? src.scrollTop / srcMax : 0;
      dst.scrollTop = ratio * (dst.scrollHeight - dst.clientHeight);
      clearTimeout(src._scrollTimer);
      src._scrollTimer = setTimeout(function () { scrollLock = null; }, 100);
    };
  }
  textarea.addEventListener('scroll', syncScroll(textarea, preview), { passive: true });
  preview.addEventListener('scroll', syncScroll(preview, textarea), { passive: true });

  /* -------------------------------------------------------------- startup */

  loadNotes();
  textarea.value = activeNote() ? activeNote().body : '';
  render();
  renderList();
  persist(); // writes the migrated collection back in the new format
})();
