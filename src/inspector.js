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
        this.targetSelector = "div,li,tr";
    }
    MBInspector.prototype.isInit = function () {
        return $("#mbInspector").size() > 0;
    };
    MBInspector.prototype.init = function () {
        var _this = this;
        this.inspector = $("<div id='mbInspector'><iframe id='mbInspectorFrame'><body></body></iframe></div>");
        $(window.document.body).append(this.inspector);
        this.inspectorFrame = this.inspector.find("iframe");
        LoadResource("src/inspectorFrame.html", function (html) {
            _this.inspectorFrame.contents().find("body").html(html);
            _this.enable();
        });
        this.inspectorFrame.contents().on("click", "span", function (e) { alert(e); });
    };
    MBInspector.prototype.isEnable = function () {
        return this.inspector.is(":visible");
    };
    MBInspector.prototype.toggle = function () {
        if (!this.isInit()) {
            this.init();
            return;
        }
        if (this.isEnable()) {
            this.disable();
        }
        else {
            this.enable();
        }
    };
    MBInspector.prototype.disable = function () {
        $("body").off("click", this.targetSelector, this.onClickTarget);
        this.inspector.hide();
    };
    MBInspector.prototype.onClickTarget = function (event) {
        console.log(arguments);
        event.preventDefault();
        event.stopImmediatePropagation();
    };
    MBInspector.prototype.enable = function () {
        $("body").on("click", this.targetSelector, this.onClickTarget);
        this.inspector.show();
    };
    return MBInspector;
}());
function LoadResource(e, t) {
    var r = new XMLHttpRequest;
    r.open("GET", chrome.runtime.getURL(e), !0), r.onreadystatechange = function () {
        r.readyState == XMLHttpRequest.DONE && 200 == r.status && t(r.responseText);
    }, r.send();
}
var inspector = new MBInspector;
function $frame(selector) {
    return inspector.inspectorFrame.find(selector);
}
function MBInspectorToggle() {
    inspector.toggle();
}
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.message == "ping")
        sendResponse({ message: "pong" });
});
