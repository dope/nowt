var textarea = document.querySelector('#textarea');
var filename = document.querySelector('#input-name');
var save     = document.querySelector('.js-save');
var area     = textarea;
var fileName;
var preview = document.querySelector('.preview');

function saveFile() {
  fileName = Math.random().toString(36).substring(1) + "_file.txt";
  var blob = new Blob([textarea.value], {type: "text/plain;charset=utf-8"});
  saveAs(blob, fileName);
}

save.addEventListener('click', saveFile);


if (!area.value) {
  area.value = window.localStorage.getItem('value');
}

textarea.addEventListener('keyup', function() {
  window.localStorage.setItem('value', area.value);
}, false);

/**
====
Markdown Everything
====
**/
(function() {
  var KeyCodes, MarkdownEditor, defaultOptions,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  KeyCodes = {
    tab: 9,
    enter: 13,
    ctrl: 17,
    space: 32,
    b: 66,
    i: 73,
    u: 85,
    q: 81
  };

  MarkdownEditor = (function() {
    var beginCodeblockFormat, contentParser, emptyRowFormat, endCodeblockFormat, functionFormat, hrFormat, listFormat, makingTableFormat, numberFormat, requiredGeneratorMetaTagFormat, rowFormat, rowSepFormat, tableFunctions, tsv2tableGenerators;

    listFormat = /^(\s*(-|\*|\+|\d+?\.)\s+(\[(\s|x)\]\s+)?)(\S*)/;

    hrFormat = /^\s{0,3}\s*((-\s+-\s+-(\s+-)*)|(\*\s+\*\s+\*(\s+\*)*))\s*$/;

    rowFormat = /^\s{0,3}\|(.*?\|)+\s*$/;

    rowSepFormat = /^\s{0,3}\|(\s*(:-{2,}|-{2,}:|:-{1,}:|-{3,})\s*\|)+\s*$/;

    emptyRowFormat = /^\s{0,3}\|(\s*?\|)+\s*$/;

    beginCodeblockFormat = /^\s{0,3}((```+)|(~~~+))(\S*\s*)$/;

    endCodeblockFormat = /^\s{0,3}((```+)|(~~~+))$/;

    makingTableFormat = /^(:?)(\d+)x(\d+)(:?)$/;

    numberFormat = /^-?\d+[\d\.]*$/;

    functionFormat = /^=\s*(\S+)\s*$/;

    requiredGeneratorMetaTagFormat = /<meta[^>]+?generator[^>]+?>/i;

    contentParser = /\scontent=['"]?([^'"]+)['"]?/i;

    tsv2tableGenerators = /^Sheets$|^LibreOffice|^Microsoft Excel|^OpenOffice/;

    tableFunctions = ['sum', 'average', 'max', 'min', 'count'];

    MarkdownEditor.prototype.clearPastedStrings = function() {
      return this.pastedStrings = {};
    };

    function MarkdownEditor(el1, options1) {
      var i, k, ref;
      this.el = el1;
      this.options = options1;
      this.onPressTab = bind(this.onPressTab, this);
      this.selectionBegin = this.selectionEnd = 0;
      this.tabSpaces = '';
      for (i = k = 0, ref = this.options.tabSize; 0 <= ref ? k < ref : k > ref; i = 0 <= ref ? ++k : --k) {
        this.tabSpaces += ' ';
      }
      if (this.options.convertSheetToTable) {
        this.el.addEventListener('paste', (function(_this) {
          return function(e) {
            var base, item, items, l, len, ref1;
            if (!e.clipboardData || !e.clipboardData.items) {
              return;
            }
            _this.clearPastedStrings();
            items = {};
            ref1 = e.clipboardData.items;
            for (l = 0, len = ref1.length; l < len; l++) {
              item = ref1[l];
              if (item.kind === 'string' && /^text\/(plain|html)$/.test(item.type)) {
                items[item.type] = item;
              }
            }
            if (items['text/plain'] && items['text/html'] && items['text/plain'].getAsString && items['text/html'].getAsString) {
              e.preventDefault();
              if (typeof (base = _this.options).beforePastedObjectToTable === "function") {
                base.beforePastedObjectToTable(e);
              }
              _this.getPastedString(items['text/plain']);
              return _this.getPastedString(items['text/html']);
            }
          };
        })(this));
      }
      this.el.addEventListener('keydown', (function(_this) {
        return function(e) {
          var base, base1, currentLine, text;
          if (e.keyCode === KeyCodes.enter && !e.shiftKey) {
            if (_this.options.list) {
              _this.supportInputListFormat(e);
            }
            if (_this.options.table) {
              _this.supportInputTableFormat(e);
            }
            if (_this.options.codeblock) {
              _this.supportCodeblockFormat(e);
            }
          }
          if (e.keyCode === KeyCodes.space && e.shiftKey && !e.ctrlKey && !e.metaKey) {
            text = _this.getTextArray();
            currentLine = _this.getCurrentLine(text);
            if (_this.options.list) {
              _this.toggleCheck(e, text, currentLine);
            }
            if (_this.options.autoTable) {
              _this.makeTable(e, text, currentLine);
            }
            if (_this.options.csvToTable) {
              if (_this.csvToTable(_this.getSelectedText(), text)) {
                e.preventDefault();
                if (typeof (base = _this.options).onMadeTable === "function") {
                  base.onMadeTable(e);
                }
                return;
              }
            }
            if (_this.options.tsvToTable) {
              if (_this.tsvToTable(_this.getSelectedText(), text)) {
                e.preventDefault();
                if (typeof (base1 = _this.options).onMadeTable === "function") {
                  base1.onMadeTable(e);
                }
                return;
              }
            }
            if (_this.options.sortTable) {
              _this.sortTable(e, text, currentLine);
            }
            if (_this.options.tableFunction) {
              _this.tableFunction(e, text, currentLine);
            }
          }
          if (e.keyCode === KeyCodes.tab) {
            _this.onPressTab(e);
          }
          if (e.ctrlKey && !e.metaKey && !e.shiftKey && e.which !== KeyCodes.ctrl) {
            return _this.withCtrl(e);
          }
        };
      })(this));
    }

    MarkdownEditor.prototype.getTextArray = function() {
      return this.getText().split('');
    };

    MarkdownEditor.prototype.getText = function() {
      return this.el.value;
    };

    MarkdownEditor.prototype.supportInputListFormat = function(e) {
      var base, currentLine, extSpace, match, pos, text;
      text = this.getTextArray();
      currentLine = this.getCurrentLine(text);
      if (currentLine.match(hrFormat)) {
        return;
      }
      match = currentLine.match(listFormat);
      if (!match) {
        return;
      }
      pos = this.getSelectionStart();
      if (text[pos] && text[pos] !== "\n") {
        return;
      }
      if (match[5].length <= 0) {
        this.removeCurrentLine(text);
        return;
      }
      extSpace = e.ctrlKey ? this.tabSpaces : '';
      this.insert(text, "\n" + extSpace + match[1]);
      e.preventDefault();
      return typeof (base = this.options).onInsertedList === "function" ? base.onInsertedList(e) : void 0;
    };

    MarkdownEditor.prototype.toggleCheck = function(e, text, currentLine) {
      var line, matches, pos;
      matches = currentLine.match(listFormat);
      if (!matches) {
        return;
      }
      if (!matches[4]) {
        return;
      }
      line = '';
      if (matches[4] === 'x') {
        line = currentLine.replace('[x]', '[ ]');
      } else {
        line = currentLine.replace('[ ]', '[x]');
      }
      pos = this.getSelectionStart();
      this.replaceCurrentLine(text, pos, currentLine, line);
      return e.preventDefault();
    };

    MarkdownEditor.prototype.replaceCurrentLine = function(text, pos, oldLine, newLine) {
      var beginPos;
      beginPos = this.getPosBeginningOfLine(text, pos);
      return this.replace(text, newLine, beginPos, beginPos + oldLine.length);
    };

    MarkdownEditor.prototype.supportInputTableFormat = function(e) {
      var base, char, currentLine, i, k, l, len, m, match, pos, prevPos, ref, ref1, row, rows, selectionStart, sep, text;
      text = this.getTextArray();
      currentLine = this.replaceEscapedPipe(this.getCurrentLine(text));
      selectionStart = this.getSelectionStart();
      match = currentLine.match(rowFormat);
      if (!match) {
        return;
      }
      if (this.isTableHeader(text)) {
        return;
      }
      if (selectionStart === this.getPosBeginningOfLine(text, selectionStart)) {
        return;
      }
      if (currentLine.match(emptyRowFormat) && this.isTableBody(text)) {
        this.removeCurrentLine(text);
        return;
      }
      e.preventDefault();
      rows = -1;
      for (k = 0, len = currentLine.length; k < len; k++) {
        char = currentLine[k];
        if (char === '|') {
          rows++;
        }
      }
      prevPos = this.getPosEndOfLine(text);
      sep = '';
      if (!this.isTableBody(text)) {
        sep = "\n|";
        for (i = l = 0, ref = rows; 0 <= ref ? l < ref : l > ref; i = 0 <= ref ? ++l : --l) {
          sep += " " + this.options.tableSeparator + " |";
        }
      }
      row = "\n|";
      for (i = m = 0, ref1 = rows; 0 <= ref1 ? m < ref1 : m > ref1; i = 0 <= ref1 ? ++m : --m) {
        row += '  |';
      }
      this.insert(text, sep + row, prevPos);
      pos = prevPos + sep.length + row.length - rows * 3 + 1;
      this.setSelectionRange(pos, pos);
      return typeof (base = this.options).onInsertedTable === "function" ? base.onInsertedTable(e) : void 0;
    };

    MarkdownEditor.prototype.supportCodeblockFormat = function(e) {
      var base, currentLine, match, selectionStart, text;
      text = this.getTextArray();
      selectionStart = this.getSelectionStart();
      currentLine = this.getCurrentLine(text);
      match = currentLine.match(beginCodeblockFormat);
      if (text[selectionStart + 1] && text[selectionStart + 1] !== "\n") {
        return;
      }
      if (!match) {
        return;
      }
      if (!this.requireCodeblockEnd(text, selectionStart)) {
        return;
      }
      e.preventDefault();
      this.insert(text, "\n\n" + match[1]);
      this.setSelectionRange(selectionStart + 1, selectionStart + 1);
      return typeof (base = this.options).onInsertedCodeblock === "function" ? base.onInsertedCodeblock(e) : void 0;
    };

    MarkdownEditor.prototype.requireCodeblockEnd = function(text, selectionStart) {
      var innerCodeblock, line, pos;
      innerCodeblock = this.isInnerCodeblock(text, selectionStart);
      if (innerCodeblock) {
        return false;
      }
      pos = this.getPosBeginningOfLine(text, selectionStart);
      while (pos <= text.length) {
        line = this.getCurrentLine(text, pos);
        if (innerCodeblock && line.match(endCodeblockFormat)) {
          return false;
        } else if (!innerCodeblock && line.match(beginCodeblockFormat)) {
          innerCodeblock = true;
        }
        pos += line.length + 1;
      }
      return true;
    };

    MarkdownEditor.prototype.isInnerCodeblock = function(text, selectionStart) {
      var endPos, innerCodeblock, line, pos;
      if (selectionStart == null) {
        selectionStart = this.getSelectionStart();
      }
      innerCodeblock = false;
      pos = 0;
      endPos = this.getPosBeginningOfLine(text, selectionStart) - 1;
      while (pos < endPos) {
        line = this.getCurrentLine(text, pos);
        if (innerCodeblock && line.match(endCodeblockFormat)) {
          innerCodeblock = false;
        } else if (!innerCodeblock && line.match(beginCodeblockFormat)) {
          innerCodeblock = true;
        }
        pos += line.length + 1;
      }
      return innerCodeblock;
    };

    MarkdownEditor.prototype.makeTable = function(e, text, currentLine) {
      var alignLeft, alignRight, base, matches, pos, table;
      if (this.isSelectRange()) {
        return;
      }
      matches = currentLine.match(makingTableFormat);
      if (!matches) {
        return;
      }
      if (matches[2] <= 0 || matches[3] <= 0) {
        return;
      }
      e.preventDefault();
      alignLeft = !!matches[1].length;
      alignRight = !!matches[4].length;
      table = this.buildTable(matches[2], matches[3], {
        alignLeft: alignLeft,
        alignRight: alignRight
      });
      pos = this.getPosBeginningOfLine(text);
      this.replaceCurrentLine(text, pos, currentLine, table);
      this.setSelectionRange(pos + 2, pos + 2);
      return typeof (base = this.options).onMadeTable === "function" ? base.onMadeTable(e) : void 0;
    };

    MarkdownEditor.prototype.buildTable = function(rowsCount, colsCount, options) {
      var i, j, k, l, m, n, ref, ref1, ref2, ref3, separator, table;
      if (options == null) {
        options = {};
      }
      separator = "---";
      if (options.alignLeft) {
        separator = ":" + separator;
      }
      if (options.alignRight) {
        separator = separator + ":";
      }
      table = "|";
      for (i = k = 0, ref = rowsCount; 0 <= ref ? k < ref : k > ref; i = 0 <= ref ? ++k : --k) {
        table += '  |';
      }
      table += "\n|";
      for (i = l = 0, ref1 = rowsCount; 0 <= ref1 ? l < ref1 : l > ref1; i = 0 <= ref1 ? ++l : --l) {
        table += " " + separator + " |";
      }
      for (i = m = 0, ref2 = colsCount - 1; 0 <= ref2 ? m < ref2 : m > ref2; i = 0 <= ref2 ? ++m : --m) {
        table += "\n|";
        for (j = n = 0, ref3 = rowsCount; 0 <= ref3 ? n < ref3 : n > ref3; j = 0 <= ref3 ? ++n : --n) {
          table += "  |";
        }
      }
      return table;
    };

    MarkdownEditor.prototype.csvToTable = function(csv, text, allowFlat) {
      if (text == null) {
        text = this.getTextArray();
      }
      if (allowFlat == null) {
        allowFlat = false;
      }
      return this.separatedStringToTable(csv, ',', text, allowFlat);
    };

    MarkdownEditor.prototype.tsvToTable = function(tsv, text, allowFlat) {
      if (text == null) {
        text = this.getTextArray();
      }
      if (allowFlat == null) {
        allowFlat = false;
      }
      return this.separatedStringToTable(tsv, "\t", text, allowFlat);
    };

    MarkdownEditor.prototype.separatedStringToTable = function(str, separator, text, allowFlat) {
      var c, cells, escape, i, inQuote, k, len, table, x, xMax, y;
      str = str.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      inQuote = false;
      escape = false;
      cells = [['']];
      y = 0;
      x = 0;
      xMax = 0;
      for (i = k = 0, len = str.length; k < len; i = ++k) {
        c = str[i];
        if (inQuote) {
          if (escape) {
            escape = false;
            cells[y][x] += c;
          } else if (!escape && c === '"') {
            if (str[i + 1] === '"') {
              escape = true;
            } else {
              inQuote = false;
            }
          } else {
            cells[y][x] += c;
          }
        } else {
          if (c === '"') {
            inQuote = true;
          } else if (c === separator) {
            cells[y].push('');
            x += 1;
            if (xMax < x) {
              xMax = x;
            }
          } else if (c === "\n") {
            cells.push(['']);
            y += 1;
            x = 0;
          } else {
            cells[y][x] += c;
          }
        }
      }
      if (allowFlat && xMax <= 0 && y <= 0 || !allowFlat && xMax <= 0) {
        return false;
      }
      table = this.createTableFromArray(cells);
      this.replace(text, table, this.getSelectionStart(), this.getSelectionEnd());
      return true;
    };

    MarkdownEditor.prototype.createTableFromArray = function(csvLines) {
      var cell, i, j, k, l, len, len1, line, m, ref, table;
      table = '';
      for (i = k = 0, len = csvLines.length; k < len; i = ++k) {
        line = csvLines[i];
        if (line.length === 1 && line[0] === "") {
          continue;
        }
        table += "|";
        for (l = 0, len1 = line.length; l < len1; l++) {
          cell = line[l];
          table += " " + (this.trim(cell).replace(/\n/g, '<br>')) + " |";
        }
        table += "\n";
        if (i === 0) {
          table += "|";
          for (j = m = 0, ref = line.length; 0 <= ref ? m < ref : m > ref; j = 0 <= ref ? ++m : --m) {
            table += " " + this.options.tableSeparator + " |";
          }
          table += "\n";
        }
      }
      return table;
    };

    MarkdownEditor.prototype.getPastedString = function(item) {
      var type;
      type = item.type;
      return item.getAsString((function(_this) {
        return function(str) {
          return _this.onGetPastedString(type, str);
        };
      })(this));
    };

    MarkdownEditor.prototype.onGetPastedString = function(type, str) {
      var generator, generatorMatch, metaMatch;
      if (!str) {
        this.clearPastedStrings();
        return;
      }
      this.pastedStrings[type] = str;
      if (this.pastedStrings['text/plain'] && this.pastedStrings['text/html']) {
        metaMatch = this.pastedStrings['text/html'].match(requiredGeneratorMetaTagFormat);
        if (metaMatch) {
          generatorMatch = metaMatch[0].match(contentParser);
          if (generatorMatch) {
            generator = generatorMatch[1];
            if (!(tsv2tableGenerators.test(generator) && this.tsvToTable(this.pastedStrings['text/plain'], null, true))) {
              this.restorePlainText();
            }
          } else {
            this.restorePlainText();
          }
        } else {
          this.restorePlainText();
        }
        return this.clearPastedStrings();
      }
    };

    MarkdownEditor.prototype.restorePlainText = function() {
      return this.replace(this.getTextArray(), this.pastedStrings['text/plain'], this.getSelectionStart(), this.getSelectionEnd());
    };

    MarkdownEditor.prototype.tableFunction = function(e, text, currentLine) {
      var col, currentCellText, data, inCaseSensitiveFunction, inputFunction, k, len, match, result, row, tableFunction;
      if (this.isSelectRange()) {
        return;
      }
      col = this.getCurrentCol(text, currentLine) - 1;
      row = this.getCurrentRow(text);
      if (col < 0) {
        return;
      }
      if (row == null) {
        return;
      }
      e.preventDefault();
      data = this.getCurrentTableData(text);
      currentCellText = data.lines[row].values[col];
      if (typeof currentCellText !== 'string') {
        return;
      }
      match = currentCellText.match(functionFormat);
      if (!match) {
        return;
      }
      inputFunction = match[1];
      inCaseSensitiveFunction = new RegExp("^" + inputFunction + "$", 'i');
      for (k = 0, len = tableFunctions.length; k < len; k++) {
        tableFunction = tableFunctions[k];
        if (tableFunction.match(inCaseSensitiveFunction)) {
          result = this[tableFunction + "TableFunction"](data, col, row);
          if (result != null) {
            this.replaceCurrentCol(text, result);
          }
          return;
        }
      }
    };

    MarkdownEditor.prototype.countTableFunction = function(data, col, row) {
      return data.lines.length - 1;
    };

    MarkdownEditor.prototype.maxTableFunction = function(data, col, row) {
      var k, len, line, max, number, ref;
      max = -Infinity;
      ref = data.lines;
      for (k = 0, len = ref.length; k < len; k++) {
        line = ref[k];
        if (typeof line.values[col] === 'number' && max < line.values[col]) {
          max = line.values[col];
        } else {
          number = parseFloat(line.values[col]);
          if ((number != null) && !isNaN(number) && max < number) {
            max = number;
          }
        }
      }
      if (max === -Infinity) {
        return null;
      }
      return max;
    };

    MarkdownEditor.prototype.round = function(num) {
      var w;
      w = Math.pow(10, this.options.significantFigures);
      return Math.round(num * w) / w;
    };

    MarkdownEditor.prototype.minTableFunction = function(data, col, row) {
      var k, len, line, min, number, ref;
      min = Infinity;
      ref = data.lines;
      for (k = 0, len = ref.length; k < len; k++) {
        line = ref[k];
        if (typeof line.values[col] === 'number' && min > line.values[col]) {
          min = line.values[col];
        } else {
          number = parseFloat(line.values[col]);
          if ((number != null) && !isNaN(number) && min > number) {
            min = number;
          }
        }
      }
      if (min === Infinity) {
        return null;
      }
      return min;
    };

    MarkdownEditor.prototype.averageTableFunction = function(data, col, row) {
      return this.round(this.sumTableFunction(data, col, row) / this.countTableFunction(data, col, row));
    };

    MarkdownEditor.prototype.sumTableFunction = function(data, col, row) {
      var k, len, line, number, ref, sum;
      sum = 0.0;
      ref = data.lines;
      for (k = 0, len = ref.length; k < len; k++) {
        line = ref[k];
        if (typeof line.values[col] === 'number') {
          sum += line.values[col];
        } else {
          number = parseFloat(line.values[col]);
          if ((number != null) && !isNaN(number)) {
            sum += number;
          }
        }
      }
      return this.round(sum);
    };

    MarkdownEditor.prototype.replaceCurrentCol = function(text, str, pos) {
      var ep, sp;
      if (pos == null) {
        pos = this.getSelectionStart();
      }
      sp = pos;
      ep = pos;
      while (sp > 0 && text[sp - 1] !== '|') {
        sp--;
      }
      while (text[ep] && text[ep] !== '|') {
        ep++;
      }
      return this.replace(text, " " + str + " ", sp, ep, true);
    };

    MarkdownEditor.prototype.sortTable = function(e, text, currentLine) {
      var asc, base, body, col, data, i, k, l, len, line, prevPos, ref, ref1;
      if (this.isSelectRange() || !this.isTableHeader(text)) {
        return;
      }
      e.preventDefault();
      prevPos = this.getSelectionStart();
      col = this.getCurrentCol(text, currentLine) - 1;
      data = this.getCurrentTableData(text);
      asc = false;
      for (i = k = 1, ref = data.lines.length; 1 <= ref ? k < ref : k > ref; i = 1 <= ref ? ++k : --k) {
        if (0 < this.compare(data.lines[i - 1].values[col], data.lines[i].values[col])) {
          asc = true;
          break;
        }
      }
      data.lines.sort((function(_this) {
        return function(a, b) {
          return _this.compare(a.values[col], b.values[col], asc);
        };
      })(this));
      body = '';
      ref1 = data.lines;
      for (l = 0, len = ref1.length; l < len; l++) {
        line = ref1[l];
        body += line.text + "\n";
      }
      this.replace(text, body, data.bodyStart, data.bodyEnd);
      this.setSelectionRange(prevPos, prevPos);
      return typeof (base = this.options).onSortedTable === "function" ? base.onSortedTable(e) : void 0;
    };

    MarkdownEditor.prototype.compare = function(a, b, asc) {
      var x;
      if (asc == null) {
        asc = true;
      }
      x = asc ? 1 : -1;
      if (this.isEmpty(a)) {
        return -1 * x;
      }
      if (this.isEmpty(b)) {
        return 1 * x;
      }
      if (a === b) {
        return 0;
      }
      return (a < b ? -1 : 1) * x;
    };

    MarkdownEditor.prototype.getCurrentCol = function(text, currentLine) {
      var count, i, k, pos, ref, row;
      row = this.replaceEscapedPipe(currentLine);
      pos = this.getSelectionStart() - this.getPosBeginningOfLine(text, this.getSelectionStart());
      count = 0;
      for (i = k = 0, ref = Math.min(pos, row.length); 0 <= ref ? k < ref : k > ref; i = 0 <= ref ? ++k : --k) {
        if (row[i] === '|') {
          count++;
        }
      }
      return count;
    };

    MarkdownEditor.prototype.getCurrentRow = function(text, pos) {
      var line, row;
      if (pos == null) {
        pos = this.getSelectionStart();
      }
      pos = this.getPosEndOfLine(text, pos) - 1;
      row = 0;
      line = this.getCurrentLine(text, pos);
      while (this.replaceEscapedPipe(line).match(rowFormat)) {
        pos -= line.length + 1;
        line = this.getCurrentLine(text, pos);
        row++;
      }
      if (row < 3) {
        return null;
      }
      return row - 3;
    };

    MarkdownEditor.prototype.isEmpty = function(v) {
      return v === null || v === void 0 || v === '';
    };

    MarkdownEditor.prototype.getTableStart = function(text, pos) {
      var line;
      if (pos == null) {
        pos = this.getSelectionStart();
      }
      pos = this.getPosEndOfLine(text, pos) - 1;
      line = this.getCurrentLine(text, pos);
      while (this.replaceEscapedPipe(line).match(rowFormat)) {
        pos -= line.length + 1;
        line = this.getCurrentLine(text, pos);
      }
      return pos + 2;
    };

    MarkdownEditor.prototype.isTableLine = function(text) {
      return text.match(rowFormat);
    };

    MarkdownEditor.prototype.getCurrentTableData = function(text, pos) {
      var base, data, i, k, len, line, newLineLeft, v, values;
      if (pos == null) {
        pos = this.getSelectionStart();
      }
      pos = this.getTableStart(text, pos);
      newLineLeft = 2;
      while (newLineLeft > 0 && (text[pos] != null)) {
        if (text[pos] === "\n") {
          newLineLeft--;
        }
        pos++;
      }
      data = {
        bodyStart: pos,
        lines: []
      };
      while ((text[pos] != null) && this.isTableBody(text, pos)) {
        line = this.getCurrentLine(text, pos - 1);
        if (line.length <= 0) {
          break;
        }
        values = this.replaceEscapedPipe(line.slice(1, -1)).split('|');
        for (i = k = 0, len = values.length; k < len; i = ++k) {
          v = values[i];
          values[i] = this.trim(v);
          if (typeof (base = values[i]).match === "function" ? base.match(numberFormat) : void 0) {
            values[i] = +values[i];
          }
        }
        data.lines.push({
          text: line,
          values: values
        });
        pos += line.length + 1;
      }
      data.bodyEnd = pos;
      return data;
    };

    MarkdownEditor.prototype.trim = function(str) {
      return str.replace(/^\s+/, '').replace(/\s+$/, '');
    };

    MarkdownEditor.prototype.isSelectRange = function() {
      return this.getSelectionStart() !== this.getSelectionEnd();
    };

    MarkdownEditor.prototype.getSelectedText = function() {
      return this.getText().slice(this.getSelectionStart(), this.getSelectionEnd());
    };

    MarkdownEditor.prototype.setSelectionRange = function(selectionBegin, selectionEnd1) {
      this.selectionBegin = selectionBegin;
      this.selectionEnd = selectionEnd1;
      return this.el.setSelectionRange(this.selectionBegin, this.selectionEnd);
    };

    MarkdownEditor.prototype.replaceEscapedPipe = function(text) {
      return text.replace(/\\\|/g, '..');
    };

    MarkdownEditor.prototype.isTableHeader = function(text, pos) {
      var line;
      if (text == null) {
        text = this.getTextArray();
      }
      if (pos == null) {
        pos = this.getSelectionStart();
      }
      pos = this.getPosEndOfLine(text, pos);
      line = this.getCurrentLine(text, pos);
      return !!line.match(rowSepFormat);
    };

    MarkdownEditor.prototype.isTableBody = function(textArray, pos) {
      var line;
      if (textArray == null) {
        textArray = this.getTextArray();
      }
      if (pos == null) {
        pos = this.getSelectionStart() - 1;
      }
      line = this.replaceEscapedPipe(this.getCurrentLine(textArray, pos));
      while (line.match(rowFormat) && pos > 0) {
        if (line.match(rowSepFormat)) {
          return true;
        }
        pos = this.getPosBeginningOfLine(textArray, pos) - 2;
        line = this.replaceEscapedPipe(this.getCurrentLine(textArray, pos));
      }
      return false;
    };

    MarkdownEditor.prototype.getPrevLine = function(textArray, pos) {
      if (pos == null) {
        pos = this.getSelectionStart() - 1;
      }
      pos = this.getPosBeginningOfLine(textArray, pos);
      return this.getCurrentLine(textArray, pos - 2);
    };

    MarkdownEditor.prototype.getPosEndOfLine = function(textArray, pos) {
      if (pos == null) {
        pos = this.getSelectionStart();
      }
      while (textArray[pos] && textArray[pos] !== "\n") {
        pos++;
      }
      return pos;
    };

    MarkdownEditor.prototype.getPosBeginningOfLine = function(textArray, pos) {
      if (pos == null) {
        pos = this.getSelectionStart();
      }
      while (textArray[pos - 1] && textArray[pos - 1] !== "\n") {
        pos--;
      }
      return pos;
    };

    MarkdownEditor.prototype.getPosBeginningOfLines = function(text, startPos, endPos) {
      var beginningPositions, k, pos, ref, ref1;
      if (startPos == null) {
        startPos = this.getSelectionStart();
      }
      if (endPos == null) {
        endPos = this.getSelectionEnd();
      }
      beginningPositions = [this.getPosBeginningOfLine(text, startPos)];
      startPos = this.getPosEndOfLine(startPos) + 1;
      if (startPos < endPos) {
        for (pos = k = ref = startPos, ref1 = endPos; ref <= ref1 ? k <= ref1 : k >= ref1; pos = ref <= ref1 ? ++k : --k) {
          if (!text[pos]) {
            break;
          }
          if (pos > 0 && text[pos - 1] === "\n") {
            beginningPositions.push(pos);
          }
        }
      }
      return beginningPositions;
    };

    MarkdownEditor.prototype.getCurrentLine = function(text, initPos) {
      var afterChars, beforeChars, pos;
      if (text == null) {
        text = this.getText();
      }
      if (initPos == null) {
        initPos = this.getSelectionStart() - 1;
      }
      pos = initPos;
      beforeChars = '';
      while (text[pos] && text[pos] !== "\n") {
        beforeChars = "" + text[pos] + beforeChars;
        pos--;
      }
      pos = initPos + 1;
      afterChars = '';
      while (text[pos] && text[pos] !== "\n") {
        afterChars = "" + afterChars + text[pos];
        pos++;
      }
      return "" + beforeChars + afterChars;
    };

    MarkdownEditor.prototype.removeCurrentLine = function(textArray) {
      var beginPos, endPos;
      endPos = this.getPosEndOfLine(textArray);
      beginPos = this.getPosBeginningOfLine(textArray);
      return this.replace(textArray, '', beginPos, endPos);
    };

    MarkdownEditor.prototype.onPressTab = function(e) {
      e.preventDefault();
      if (this.options.table && this.moveCursorOnTableCell(e)) {
        return;
      }
      if (this.options.tabToSpace) {
        return this.tabToSpace(e);
      }
    };

    MarkdownEditor.prototype.withCtrl = function(e) {
      var preventDefault;
      if (!this.options.fontDecorate) {
        return;
      }
      preventDefault = (function() {
        switch (e.which) {
          case KeyCodes.b:
            return this.wrap('**');
          case KeyCodes.i:
            return this.wrap('_');
          case KeyCodes.u:
            return this.wrap('~~');
          case KeyCodes.q:
            return this.wrap('`');
        }
      }).call(this);
      if (preventDefault != null) {
        return e.preventDefault();
      }
    };

    MarkdownEditor.prototype.wrap = function(wrapper) {
      var beginningOfLines, selectedText, selectionEnd, selectionStart, text;
      selectionStart = this.getSelectionStart();
      selectionEnd = this.getSelectionEnd();
      if (selectionStart === selectionEnd) {
        return;
      }
      text = this.getTextArray();
      beginningOfLines = this.getPosBeginningOfLines(text, selectionStart, selectionEnd);
      if (beginningOfLines.length > 1) {
        return false;
      }
      selectedText = text.slice(selectionStart, selectionEnd).join('');
      this.replace(text, "" + wrapper + selectedText + wrapper, selectionStart, selectionEnd);
      this.setSelectionRange(selectionStart + wrapper.length, selectionEnd + wrapper.length);
      return true;
    };

    MarkdownEditor.prototype.moveCursorOnTableCell = function(e) {
      var currentLine, text;
      text = this.replaceEscapedPipe(this.getText());
      currentLine = this.getCurrentLine(text);
      if (!currentLine.match(rowFormat)) {
        return false;
      }
      if (e.shiftKey) {
        this.moveToPrevCell(text);
      } else {
        this.moveToNextCell(text);
      }
      return true;
    };

    MarkdownEditor.prototype.tabToSpace = function(e) {
      var beginningOfLines, currentLine, currentPos, text;
      text = this.getTextArray();
      currentPos = this.getSelectionStart();
      beginningOfLines = this.getPosBeginningOfLines(text, currentPos);
      if (beginningOfLines.length <= 1) {
        currentLine = this.getCurrentLine(text, beginningOfLines[0]);
        if (this.options.list && currentLine.match(listFormat) && !currentLine.match(hrFormat)) {
          return this.insertSpacesToBeginningOfLines(text, currentPos, beginningOfLines, e.shiftKey);
        } else if (!e.shiftKey) {
          return this.insert(text, this.tabSpaces);
        }
      } else {
        return this.insertSpacesToBeginningOfLines(text, currentPos, beginningOfLines, e.shiftKey);
      }
    };

    MarkdownEditor.prototype.insertSpacesToBeginningOfLines = function(text, currentPos, beginningOfLines, isBack) {
      var beginPos, currentLine, dPos, i, k, l, len, listPositions, m, pos, ref, ref1;
      listPositions = [];
      dPos = 0;
      for (k = 0, len = beginningOfLines.length; k < len; k++) {
        pos = beginningOfLines[k];
        pos += dPos;
        currentLine = this.getCurrentLine(text, pos);
        listPositions.push(pos);
        if (isBack) {
          if (currentLine.indexOf(this.tabSpaces) === 0) {
            text.splice(pos, this.options.tabSize);
            dPos -= this.options.tabSize;
          }
        } else {
          for (i = l = 0, ref = this.options.tabSize; 0 <= ref ? l < ref : l > ref; i = 0 <= ref ? ++l : --l) {
            text.splice(pos, 0, ' ');
          }
          dPos += this.options.tabSize;
        }
      }
      this.el.value = text.join('');
      if (listPositions.length > 1) {
        return this.setSelectionRange(listPositions[0], this.getPosEndOfLine(text, listPositions[listPositions.length - 1]));
      } else {
        if (dPos < 0) {
          beginPos = this.getPosBeginningOfLine(text, currentPos + dPos);
          for (i = m = -1, ref1 = -this.options.tabSize; -1 <= ref1 ? m <= ref1 : m >= ref1; i = -1 <= ref1 ? ++m : --m) {
            if ((!text[currentPos + i] || text[currentPos + i] === "\n") && listPositions[0] > beginPos) {
              currentPos = listPositions[0] - dPos;
              break;
            }
          }
        }
        return this.setSelectionRange(currentPos + dPos, currentPos + dPos);
      }
    };

    MarkdownEditor.prototype.moveToPrevCell = function(text, pos) {
      var ep, epAdded, overSep, prevLine, sp, ssp;
      if (pos == null) {
        pos = this.getSelectionStart() - 1;
      }
      overSep = false;
      prevLine = false;
      ep = pos;
      while (text[ep]) {
        if (overSep && ep < 0 || !overSep && ep <= 0) {
          return false;
        }
        if (prevLine && text[ep] !== ' ' && text[ep] !== '|') {
          return false;
        }
        if (!overSep) {
          if (text[ep] === '|') {
            overSep = true;
            prevLine = false;
          }
        } else if (text[ep] !== ' ') {
          if (text[ep] === "\n") {
            overSep = false;
            prevLine = true;
          } else {
            if (text[ep] === '|') {
              ep++;
            }
            if (text[ep] === ' ') {
              ep++;
            }
            break;
          }
        }
        ep--;
      }
      if (ep < 0) {
        return false;
      }
      ssp = sp = ep;
      epAdded = false;
      while (text[sp] && text[sp] !== '|') {
        if (text[sp] !== ' ') {
          ssp = sp;
          if (!epAdded) {
            ep++;
            epAdded = true;
          }
        }
        sp--;
      }
      this.setSelectionRange(ssp, ep);
      return true;
    };

    MarkdownEditor.prototype.moveToNextCell = function(text, pos) {
      var eep, ep, overSep, overSepSpace, sp;
      if (pos == null) {
        pos = this.getSelectionStart();
      }
      overSep = false;
      overSepSpace = false;
      eep = null;
      sp = pos;
      while (text[sp]) {
        if (sp > 0 && text[sp - 1] === "\n" && text[sp] !== '|') {
          sp--;
          eep = sp;
          break;
        }
        if (!overSep) {
          if (text[sp] === '|') {
            overSep = true;
          }
        } else if (text[sp] !== ' ') {
          if (text[sp] === "\n") {
            overSep = false;
          } else {
            break;
          }
        } else {
          if (overSepSpace) {
            break;
          }
          overSepSpace = true;
        }
        sp++;
      }
      if (!text[sp]) {
        sp--;
        eep = sp;
      }
      if (!eep) {
        eep = ep = sp;
        while (text[ep] && text[ep] !== '|') {
          if (text[ep] !== ' ') {
            eep = ep + 1;
          }
          ep++;
        }
      }
      this.setSelectionRange(sp, eep);
      return true;
    };

    MarkdownEditor.prototype.insert = function(textArray, insertText, pos) {
      if (pos == null) {
        pos = this.getSelectionStart();
      }
      return this.replace(textArray, insertText, pos, pos);
    };

    MarkdownEditor.prototype.replace = function(textArray, text, beginPos, endPos, select) {
      var error1, result;
      if (select == null) {
        select = false;
      }
      this.setSelectionRange(beginPos, endPos);
      try {
        result = typeof document.execCommand === "function" ? document.execCommand('insertText', false, text) : void 0;
      } catch (error1) {
        result = false;
      }
      if (!result) {
        this.replaceValue(textArray, text, beginPos, endPos);
      }
      if (select) {
        return this.setSelectionRange(beginPos, beginPos + text.length);
      }
    };

    MarkdownEditor.prototype.replaceValue = function(textArray, insertText, beginPos, endPos) {
      var error, error1, error2, pos;
      textArray.splice(beginPos, endPos - beginPos, insertText);
      try {
        document.execCommand('ms-beginUndoUnit');
      } catch (error1) {
        error = error1;
      }
      this.el.value = textArray.join('');
      try {
        document.execCommand('ms-endUndoUnit');
      } catch (error2) {
        error = error2;
      }
      pos = beginPos + insertText.length;
      return this.setSelectionRange(pos, pos);
    };

    MarkdownEditor.prototype.getSelectionStart = function() {
      return this.el.selectionStart;
    };

    MarkdownEditor.prototype.getSelectionEnd = function() {
      return this.el.selectionEnd;
    };

    MarkdownEditor.prototype.destroy = function() {
      this.el.removeEventListener('keydown');
      this.el.dataset.markdownEditor = null;
      return this.el = null;
    };

    MarkdownEditor.prototype.startUpload = function(name) {
      var insertText, pos, text;
      text = this.getTextArray();
      pos = this.getSelectionStart();
      insertText = this.buildUploadingText(name);
      if (pos > 0 && text[pos - 1] !== "\n") {
        insertText = "\n" + insertText;
      }
      if (pos < text.length - 1 && text[pos] !== "\n") {
        insertText = insertText + "\n";
      }
      return this.replaceValue(text, insertText, pos, pos);
    };

    MarkdownEditor.prototype.cancelUpload = function(name) {
      return this.el.value = this.getText().replace(this.buildUploadingText(name), '');
    };

    MarkdownEditor.prototype.buildUploadingText = function(name) {
      return this.options.uploadingFormat(name);
    };

    MarkdownEditor.prototype.finishUpload = function(name, options) {
      var finishedUploadText, pos, selectionEnd, selectionStart, text, uploadingText, uploadingTextPos;
      if (options == null) {
        options = {};
      }
      text = this.getText();
      finishedUploadText = options.text || '';
      if (finishedUploadText.length <= 0 && options.url || options.alt) {
        finishedUploadText = "![" + (options.alt || '') + "](" + (options.url || '') + ")";
        if (options.href != null) {
          finishedUploadText = "[" + finishedUploadText + "](" + options.href + ")";
        }
      }
      uploadingText = this.buildUploadingText(name);
      uploadingTextPos = text.indexOf(uploadingText);
      if (uploadingTextPos >= 0) {
        selectionStart = this.getSelectionStart();
        selectionEnd = this.getSelectionEnd();
        return this.replaceValue(this.getTextArray(), finishedUploadText, uploadingTextPos, uploadingTextPos + uploadingText.length);
      } else {
        pos = this.getSelectionStart();
        return this.replaceValue(this.getTextArray(), finishedUploadText, pos, pos);
      }
    };

    return MarkdownEditor;

  })();

  defaultOptions = {
    tabSize: 4,
    onInsertedList: null,
    onInsertedTable: null,
    onInsertedCodeblock: null,
    onSortedTable: null,
    onMadeTable: null,
    convertSheetToTable: true,
    tabToSpace: true,
    list: true,
    table: true,
    fontDecorate: true,
    codeblock: true,
    autoTable: true,
    tableSeparator: '---',
    csvToTable: true,
    tsvToTable: true,
    sortTable: true,
    tableFunction: true,
    significantFigures: 4,
    beforePastedObjectToTable: null,
    uploadingFormat: function(name) {
      return "![Uploading... " + name + "]()";
    }
  };

  window.markdownEditor = function(el, options) {
    var defaultOptionName, value;
    if (options == null) {
      options = {};
    }
    for (defaultOptionName in defaultOptions) {
      value = defaultOptions[defaultOptionName];
      if (options[defaultOptionName] == null) {
        options[defaultOptionName] = value;
      }
    }
    return new MarkdownEditor(el, options);
  };

}).call(this);

options = {}
markdownEditor(textarea, options)

preview.innerHTML = marked(textarea.value);

if (textarea.addEventListener) {
  textarea.addEventListener('input', function() {
    preview.innerHTML = marked(textarea.value);
  }, false);
} else if (textarea.attachEvent) {
  textarea.attachEvent('onpropertychange', function() {
    preview.innerHTML = marked(textarea.value);
  });
}

// Drag and
function handleFileSelect(evt) {
  evt.stopPropagation();
  evt.preventDefault();

  var files = evt.dataTransfer.files; // FileList object.
  var reader = new FileReader();
  reader.onload = function(event) {
    textarea.value = event.target.result;
  }
  reader.readAsText(files[0],"UTF-8");
}

function handleDragOver(evt) {
  evt.stopPropagation();
  evt.preventDefault();
  evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

textarea.addEventListener('dragover', handleDragOver, false);
textarea.addEventListener('drop', handleFileSelect, false);
