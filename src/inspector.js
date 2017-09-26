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
        // Element's selector that can be inspected.
        this.targetSelector = "div,li,tr";
    }
    MBInspector.prototype.isInit = function () {
        return $("#mbInspector").size() > 0;
    };
    MBInspector.prototype.init = function () {
        var _this = this;
        this.inspector = $("<div id='mbInspector'><iframe id='mbInspectorFrame'><body></body></iframe></div>");
        this.inspectedCover = $("<div id='mbElementCover'></div>");
        $(document.body).append(this.inspector);
        $(document.body).append(this.inspectedCover);
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
        this.inspectedCover.hide();
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
    MBInspector.prototype.onClickPathCrumb = function (e) {
        var paths = $(e.currentTarget).data("paths");
        this.inspectElements($(paths));
        return false;
    };
    MBInspector.prototype.onMouseOverTarget = function (e) {
        e.stopPropagation();
        $(e.currentTarget).addClass("mb-inspector-over");
    };
    MBInspector.prototype.onMouseOutTarget = function (e) {
        e.stopPropagation();
        $(e.currentTarget).removeClass("mb-inspector-over");
    };
    MBInspector.prototype.inspectElements = function (element) {
        var _this = this;
        var selector = element.getPath();
        this.inspectedElement = element;
        var paths = "";
        var pathNav = $("<div class='path-nav'></div>");
        $(selector.split(">")).each(function (i, path) {
            paths += (i > 0 ? "> " : "") + path;
            if (i > 0)
                $("<span></span>").text(">").appendTo(pathNav);
            $("<a href='#' class='path-crumbs'></a>").text(path).data("paths", paths).appendTo(pathNav);
        });
        $frame("#selector").html(pathNav);
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
        this.inspectedCover.css("top", element.offset().top);
        this.inspectedCover.css("left", element.offset().left);
        this.inspectedCover.css("width", element[0].offsetWidth);
        this.inspectedCover.css("height", element[0].offsetHeight);
        this.inspectedCover.show();
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
            segment["selector"] = $(e).getPath(element);
            return segment;
        });
        console.log(segments);
        return segments;
    };
    MBInspector.prototype.enable = function () {
        this.bindEvents();
        this.inspector.show();
    };
    MBInspector.prototype.bindEvents = function () {
        $("body").on("click", this.targetSelector, $.proxy(this.onClickTarget, this));
        $("body").on("mouseover", this.targetSelector, $.proxy(this.onMouseOverTarget, this));
        $("body").on("mouseout", this.targetSelector, $.proxy(this.onMouseOutTarget, this));
        $frame("body").on("click", ".path-crumbs", $.proxy(this.onClickPathCrumb, this));
    };
    MBInspector.prototype.unbindEvents = function () {
        $("body").off("click", this.targetSelector, this.onClickTarget);
        $("body").off("mouseover", this.targetSelector, this.onMouseOverTarget);
        $("body").off("mouseout", this.targetSelector, this.onMouseOutTarget);
        $frame("body").off("click", ".path-crumbs", this.onClickPathCrumb);
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
