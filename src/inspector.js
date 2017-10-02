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
    // Is Initialized
    MBInspector.prototype.isInit = function () {
        return $("#mbInspector").size() > 0;
    };
    // Initialize inspector
    MBInspector.prototype.init = function () {
        var _this = this;
        this.inspector = $("<div id='mbInspector' style='left: 15px'><iframe id='mbInspectorFrame'><body></body></iframe></div>");
        this.inspectedCover = $("<div id='mbElementCover'></div>");
        $(document.body).append(this.inspector);
        $(document.body).append(this.inspectedCover);
        this.inspectorFrame = this.inspector.find("iframe");
        var frameHead = this.inspectorFrame.contents().find("head");
        var frameBody = this.inspectorFrame.contents().find("body");
        LoadResource("src/inspectorFrame.html", function (html) {
            frameBody.html(html);
            $frame("script[type='text/x-handlebars']").each(function (i, script) {
                _this[script.id] = Handlebars.compile($(script).html());
            });
            _this.enable();
        });
    };
    // Is enabled (showing) ?
    MBInspector.prototype.isEnable = function () {
        return this.inspector.is(":visible");
    };
    // Toggle inspector
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
    // Hide inspector & unbind events
    MBInspector.prototype.disable = function () {
        this.unbindEvents();
        this.inspector.hide();
        this.inspectedCover.hide();
    };
    // When elements is clicked
    MBInspector.prototype.onClickTarget = function (event) {
        console.log(arguments);
        event.preventDefault();
        event.stopImmediatePropagation();
        var target = $(event.currentTarget);
        this.inspectElements(target);
    };
    // When one of selectors in path is clicked
    MBInspector.prototype.onClickPathCrumb = function (e) {
        e.preventDefault();
        e.stopPropagation();
        var paths = $(e.currentTarget).data("paths");
        this.inspectElements($(paths));
        return false;
    };
    // When element is focused in pointer
    MBInspector.prototype.onMouseOverTarget = function (e) {
        if (e.currentTarget.id == "mbInspector")
            return;
        e.stopPropagation();
        $(e.currentTarget).addClass("mb-inspector-over");
    };
    // When element lost focus of pointer
    MBInspector.prototype.onMouseOutTarget = function (e) {
        if (e.currentTarget.id == "mbInspector")
            return;
        e.stopPropagation();
        $(e.currentTarget).removeClass("mb-inspector-over");
    };
    MBInspector.prototype.onClickNext = function (e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    };
    MBInspector.prototype.onClickPrev = function (e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    };
    // Inspect specific element that can be selected by 'targetSelector'
    MBInspector.prototype.inspectElements = function (element) {
        var _this = this;
        // get selector
        var selector = element.getPath();
        console.log(selector);
        this.inspectedElement = element;
        // Make paths crumb 
        var paths = "";
        var pathNav = $("<div class='path-nav'></div>");
        var selectors = selector.split(">");
        var hasSibling = selectors.slice(-1)[0].indexOf(":nth-child") > -1;
        $(selectors).each(function (i, path) {
            paths += (i > 0 ? "> " : "") + path;
            if (i > 0)
                $("<span></span>").text(">").appendTo(pathNav);
            $("<a href='#' class='path-crumbs'></a>").text(path).data("paths", paths).appendTo(pathNav);
        });
        $frame("#selector").html(pathNav);
        // Find elements that can be segments.
        var segments = this.findSegments(element);
        // Make segments list
        var segmentHtmls = [];
        $(segments).each(function (i, seg) {
            segmentHtmls.push(_this["mbTplSegment"](seg));
        });
        $frame("#contents").html(segmentHtmls.join(""));
        if (hasSibling) {
            $frame("#selectSiblingCheck").attr("checked", "checked");
            $frame("#selectSiblingCheck").attr("disabled", null);
        }
        else {
            $frame("#selectSiblingCheck").attr("checked", null);
            $frame("#selectSiblingCheck").attr("disabled", "disabled");
        }
        // Highlight inspected element.
        this.inspectedCover.css("top", element.offset().top);
        this.inspectedCover.css("left", element.offset().left);
        this.inspectedCover.css("width", element[0].offsetWidth);
        this.inspectedCover.css("height", element[0].offsetHeight);
        this.inspectedCover.show();
    };
    // Find segments in element. result is json.
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
            segment["id"] = "segment" + i;
            segment["text"] = $(e).text();
            segment["selector"] = $(e).getPath(element);
            return segment;
        });
        console.log(segments);
        return segments;
    };
    // Enable inspector and show
    MBInspector.prototype.enable = function () {
        this.inspector.show();
        this.bindEvents();
    };
    // Bind events to elements can be target
    MBInspector.prototype.bindEvents = function () {
        $("body").on("click", this.targetSelector, $.proxy(this.onClickTarget, this));
        $("body").on("mouseover", this.targetSelector, $.proxy(this.onMouseOverTarget, this));
        $("body").on("mouseout", this.targetSelector, $.proxy(this.onMouseOutTarget, this));
        $frame("body").on("click", ".path-crumbs", $.proxy(this.onClickPathCrumb, this));
        var r = this.inspector;
        var n = 0;
        $frame("body").on("mousedown", "#mbInspectorHeader", function (o) {
            var i = window.innerWidth - 15, s = r.outerWidth(), a = o.pageX;
            $frame("body").on("mousemove", function (e) {
                var t = e.pageX - a, n = r.offset().left + t;
                n + s > i && (n = i - s), n < 15 && (n = 15), r.css("left", n);
            }).on("mouseup", function (n) {
                $frame("body").off("mousemove").off("mouseup");
            }), o.preventDefault(), o.stopPropagation();
        });
        $frame("body").on("change", ".segment-check", function (e) {
            $frame(".wizard-desc").text($frame(".segment-check:checked").size() + " Selected");
        });
        $frame("body").on("change", "#inspectTypeCheck", function (e) {
            if ($(this).is(":checked")) {
                $frame(".ajax-wizard").show();
                $frame(".static-wizard").hide();
                $frame(".wizard-desc").hide();
            }
            else {
                $frame(".ajax-wizard").hide();
                $frame(".static-wizard").show();
                $frame(".wizard-desc").show();
            }
        });
        $frame("body").on("click", "#nextButton", $.proxy(this.onClickNext, this));
        $frame("body").on("click", "#prevButton", $.proxy(this.onClickPrev, this));
        $frame("body").on("click", "#closeButton", $.proxy(function (e) { MBInspectorToggle(); return false; }, this));
    };
    // Unbind all events
    MBInspector.prototype.unbindEvents = function () {
        $("body").off("click", this.targetSelector, this.onClickTarget);
        $("body").off("mouseover", this.targetSelector, this.onMouseOverTarget);
        $("body").off("mouseout", this.targetSelector, this.onMouseOutTarget);
        $frame("body").off("click", ".path-crumbs", this.onClickPathCrumb);
        $frame("body").off("mousedown", "#mbInspectorHeader");
        $frame("body").off("click", "#nextButton");
        $frame("body").off("click", "#prevButton");
        $frame("body").off("click", "#closeButton");
    };
    return MBInspector;
}());
// Ajax to extension's resource
function LoadResource(e, t) {
    var r = new XMLHttpRequest;
    r.open("GET", chrome.runtime.getURL(e), !0), r.onreadystatechange = function () {
        r.readyState == XMLHttpRequest.DONE && 200 == r.status && t(r.responseText);
    }, r.send();
}
// Construct inspector instance
var inspector = new MBInspector;
function $frame(selector) {
    return inspector.inspectorFrame.contents().find(selector);
}
// Wrapped function to toggle inspector
function MBInspectorToggle() {
    inspector.toggle();
}
// Send message that inspector script is loaded to background
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.message == "ping")
        sendResponse({ message: "pong" });
});
