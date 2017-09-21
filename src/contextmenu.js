contextmenuElement = window.document.body;

document.addEventListener("contextmenu", function (e) {
    contextmenuElement = e.target;
});