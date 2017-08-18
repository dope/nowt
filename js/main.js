var textarea = document.querySelector('#textarea');
var filename = document.querySelector('#input-name');
var save     = document.querySelector('.js-save');
var area     = textarea;
var fileName;

function saveFile() {

  if (filename.value) {
    fileName = filename.value + ".txt";
  } else {
    fileName = Math.random().toString(36).substring(1) + "_file.txt";
  }

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
