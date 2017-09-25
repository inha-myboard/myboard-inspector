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
var Handlebars = window["Handlebars"];
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
            $frame("script[type='text/x-handlebars']").each(function (i, script) {
                _this[script.id] = Handlebars.compile($(script).html());
            });
            LoadResource("css/bootstrap.min.css", function (css) {
                $("<style type='text/css'>" + css + "</style>").appendTo(_this.inspectorFrame.contents().find("head"));
                _this.enable();
            });
        });
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
        this.unbindEvents();
        this.inspector.hide();
    };
    MBInspector.prototype.onClickTarget = function (event) {
        console.log(arguments);
        event.preventDefault();
        event.stopImmediatePropagation();
        var target = $(event.currentTarget);
        this.inspectElements(target);
    };
    MBInspector.prototype.onClickParent = function () {
        if (this.inspectedElement == undefined) {
            return;
        }
        if (this.inspectedElement.parentElement.tagName == "HTML")
            this.inspectElements(this.inspectedElement.parentElement);
    };
    MBInspector.prototype.inspectElements = function (element) {
        var _this = this;
        var selector = element.getPath();
        this.inspectedElement = element;
        $frame("#selector").text(selector);
        console.log(selector);
        var segments = this.findSegments(element);
        var segmentHtmls = [];
        $(segments).each(function (i, seg) {
            if (seg.type == "link") {
                segmentHtmls.push(_this["mbTplLink"](seg));
            }
            else if (seg.type == "img") {
                segmentHtmls.push(_this["mbTplImg"](seg));
            }
            else if (seg.type == "text") {
                segmentHtmls.push(_this["mbTplText"](seg));
            }
        });
        $frame("#contents").html(segmentHtmls.join(""));
        // if(element.tagName === "LI") {
        // } else if(element.tagName === "DIV") {
        // } else if(element.tagName === "TR") {
        // }
    };
    MBInspector.prototype.findSegments = function (element) {
        var segments = null;
        if (element.is(":hasTextOnly")) {
            segments = element;
        }
        else {
            segments = element.find(":hasTextOnly,a[href!='#'],img").filter(function (i, e) { return $(e).css("display") !== 'none'; });
        }
        segments = segments.map(function (i, e) {
            var segment = {};
            if (e.tagName === "A") {
                segment["type"] = "link";
                segment["href"] = e.href;
            }
            else if (e.tagName === "IMG") {
                // let linkAnchor = $(e).parents("a");
                // let href = "";
                // if(linkAnchor.size() > 0) {
                // 	href = linkAnchor[0].href;
                // }
                segment["type"] = "img";
                segment["src"] = e.src;
            }
            else {
                segment["type"] = "text";
            }
            segment["text"] = $(e).text();
            segment["selector"] = $(e).getPath();
            return segment;
        });
        console.log(segments);
        return segments;
        // segments는 text만을 가지고있거나, link거나, img 
    };
    MBInspector.prototype.enable = function () {
        this.bindEvents();
        this.inspector.show();
    };
    MBInspector.prototype.bindEvents = function () {
        $("body").on("click", this.targetSelector, $.proxy(this.onClickTarget, this));
    };
    MBInspector.prototype.unbindEvents = function () {
        $("body").off("click", this.targetSelector, this.onClickTarget);
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
    return inspector.inspectorFrame.contents().find(selector);
}
function MBInspectorToggle() {
    inspector.toggle();
}
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.message == "ping")
        sendResponse({ message: "pong" });
});
