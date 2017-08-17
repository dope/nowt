var textarea = document.querySelector('#textarea');
var filename = document.querySelector('#input-name');
var save     = document.querySelector('.js-save');

function saveFile() {
  var blob = new Blob([textarea.value], {type: "text/plain;charset=utf-8"});
  saveAs(blob, filename.value + ".txt");
}

save.addEventListener('click', saveFile);



var area = textarea;

if (!area.value) {
  area.value = window.localStorage.getItem('value');
}

textarea.addEventListener('keyup', function() {
  window.localStorage.setItem('value', area.value);
}, false);
