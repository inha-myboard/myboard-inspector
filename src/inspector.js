// chrome.extension.sendMessage({}, function(response) {
// var readyStateCheckInterval = setInterval(function() {
// if (document.readyState === "complete") {
// 	clearInterval(readyStateCheckInterval);
var MBInspector = (function () {
    function MBInspector() {
        // Element's selector that can be inspected.
        this.targetSelector = "div,li,tr,a";
        // inspectType
        this.inspectType = "static";
        // step number
        this.stepNumber = 1;
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
        this.goStep(this.inspectType, this.stepNumber + 1);
        return false;
    };
    MBInspector.prototype.onClickPrev = function (e) {
        e.preventDefault();
        e.stopPropagation();
        this.goStep(this.inspectType, this.stepNumber - 1);
        return false;
    };
    MBInspector.prototype.onStaticStep2 = function (element) {
        if (!this.selectedSegments || this.selectedSegments.length == 0) {
            alert("한개이상 선택해주세요.");
            return false;
        }
        var segmentsJson = this.getSegmentsJson(this.inspectedElement, $(this.selectedSegments.join(",")).toArray());
        $(element).text(JSON.stringify(segmentsJson));
        return true;
    };
    MBInspector.prototype.goStep = function (inspectType, stepNumber) {
        var event = this["on" + inspectType.replace(/(^.?)/g, function (match, chr) { return chr.toUpperCase(); }) + "Step" + stepNumber];
        if (event) {
            var result = event.apply(this, $frame("#" + inspectType + "Step" + stepNumber));
            if (result == false)
                return;
        }
        this.inspectType = inspectType;
        this.stepNumber = stepNumber;
        if (stepNumber == 1) {
            $frame("#prevButton").addClass("disabled");
            $frame("#nextButton").removeClass("disabled");
        }
        else if ($frame("#" + inspectType + "Step" + (stepNumber + 1)).size() == 0) {
            $frame("#prevButton").removeClass("disabled");
            $frame("#nextButton").addClass("disabled");
        }
        else {
            $frame("#prevButton").removeClass("disabled");
            $frame("#nextButton").removeClass("disabled");
        }
        $frame(".wizard-wrapper > div").hide();
        var wizard = $frame("." + inspectType + "-wizard");
        wizard.show();
        wizard.find("> div").hide();
        $frame("#" + inspectType + "Step" + stepNumber).show();
    };
    // Inspect specific element that can be selected by 'targetSelector'
    MBInspector.prototype.inspectElements = function (element) {
        var _this = this;
        if (!element) {
            $frame("#selector").html("");
            $frame("#contents").html("");
            this.inspectedElement = null;
            this.selectedSegments = null;
            this.inspectedSelector = null;
            return;
        }
        // get selector
        var selector = element.getPath();
        this.inspectedElement = element;
        this.selectedSegments = null;
        this.inspectedSelector = selector;
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
        var segments = [];
        if (element.is(":hasTextOnly")) {
            segments = element;
        }
        else {
            segments.push(element);
            segments = segments.concat(element.find(":hasText:not(a),a[href!='#'],img").filter(function (i, e) {
                return $(e).is(":visible");
            }).toArray());
        }
        return this.getSegmentsJson(element, segments);
    };
    MBInspector.prototype.getSegmentsJson = function (element, segments) {
        return segments.map(function (e, i) {
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
            segment["text"] = $(e).visibleText(true, "\n");
            segment["selector"] = $(e).getPath(element);
            return segment;
        });
    };
    // Enable inspector and show
    MBInspector.prototype.enable = function () {
        this.inspector.show();
        this.inspectElements(null);
        this.goStep(this.inspectType, 1);
        this.bindEvents();
    };
    // Bind events to elements can be target
    MBInspector.prototype.bindEvents = function () {
        var _this = this;
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
            _this.selectedSegments = [];
            $frame(".segment-check:checked").each(function (i, e) {
                var selector = $(e).parents("li").data("selector");
                if (selector.length == 0)
                    _this.selectedSegments.push(_this.inspectedSelector);
                else
                    _this.selectedSegments.push(_this.inspectedSelector + " > " + selector);
            });
        });
        $frame("body").on("change", "#inspectTypeCheck", function (e) {
            if ($(e.currentTarget).is(":checked")) {
                _this.goStep("ajax", 1);
            }
            else {
                _this.goStep("static", 1);
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
var mbInspector = new MBInspector;
function $frame(selector) {
    return mbInspector.inspectorFrame.contents().find(selector);
}
// Wrapped function to toggle inspector
function MBInspectorToggle() {
    mbInspector.toggle();
}
// Send message that inspector script is loaded to background
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.message == "ping")
        sendResponse({ message: "pong" });
});
