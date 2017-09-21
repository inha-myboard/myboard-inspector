// chrome.extension.sendMessage({}, function(response) {
// var readyStateCheckInterval = setInterval(function() {
// if (document.readyState === "complete") {
// 	clearInterval(readyStateCheckInterval);
// 	// ----------------------------------------------------------
// 	// This part of the script triggers when page is done loading
// 	console.log("Hello. This message was sent from scripts/inject.js");
// 	// ----------------------------------------------------------
// }
// }, 10);
// });
var $ = window["jQuery"];
var chrome = window["chrome"];
var MBInspector = (function () {
    function MBInspector() {
    }
    MBInspector.prototype.init = function () {
        if ($("#mbInspector").size() == 0) {
            var inspectorDiv = $("<div id='mbInspector'><iframe id='mbInspectorFrame'></iframe></div>");
            this.inspectorFrame = new MBInspectorFrame(inspectorDiv.find("iframe"));
            this.inspectorFrame.init();
        }
    };
    MBInspector.prototype.frame = function (selector) {
        return this.inspectorFrame.find(selector);
    };
    return MBInspector;
}());
var MBInspectorFrame = (function () {
    function MBInspectorFrame(frame) {
        this.frame = frame;
    }
    MBInspectorFrame.prototype.init = function () {
        if ($("#mbInspectorFrame").size() == 0) {
            $(window.document).append(this.frame);
            LoadResource("inspector.html", function (html) {
                this.frame.find("body").html(html);
            });
        }
    };
    MBInspectorFrame.prototype.find = function (selector) {
        return this.frame.find(selector);
    };
    return MBInspectorFrame;
}());
function LoadResource(e, t) {
    var r = new XMLHttpRequest;
    r.open("GET", chrome.extension.getURL(e), !0), r.onreadystatechange = function () {
        r.readyState == XMLHttpRequest.DONE && 200 == r.status && t(r.responseText);
    }, r.send();
}
var inspector = new MBInspector;
inspector.frame("#");
