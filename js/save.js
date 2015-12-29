function saveTextAsFile() {
    var textToWrite = document.getElementById('inputTextToSave').value;
    var textFileAsBlob = new Blob([textToWrite], {type:'text/plain'});
    var fileNameToSaveAs = document.getElementById('titleToSave').value;

    // create a link for our script to 'click'
    var downloadLink = document.createElement('a');
    downloadLink.download = fileNameToSaveAs;
    downloadLink.innerHTML = 'My Hidden Link';

    window.URL = window.URL || window.webkitURL;

    downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
    downloadLink.onclick = destroyClickedElement;
    downloadLink.style.display = 'none';

    document.body.appendChild(downloadLink);

    // click the new link
    downloadLink.click();
}

function destroyClickedElement(event) {
    document.body.removeChild(event.target);
}

$('.js-save').on('click', function() {
    saveTextAsFile();
});