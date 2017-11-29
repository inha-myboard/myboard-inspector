var InspectType;
(function (InspectType) {
    InspectType["STATIC"] = "static";
    InspectType["AJAX"] = "ajax";
})(InspectType || (InspectType = {}));
;
var MBInspector = (function () {
    function MBInspector() {
        this.targetSelector = "div,li,tr,a";
        this.inspectType = InspectType.STATIC;
        this.stepNumber = 1;
    }
    MBInspector.prototype.isInit = function () {
        return $("#mbInspector").size() > 0;
    };
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
    MBInspector.prototype.onClickPathCrumb = function (e) {
        e.preventDefault();
        e.stopPropagation();
        var paths = $(e.currentTarget).data("paths");
        if (!$(paths).is(":visible")) {
            alert("This is invisible now. Please select visible element.");
            return false;
        }
        this.inspectElements($(paths));
        return false;
    };
    MBInspector.prototype.onMouseOverTarget = function (e) {
        if (e.currentTarget.id == "mbInspector")
            return;
        e.stopPropagation();
        e.preventDefault();
        $(e.currentTarget).addClass("mb-inspector-over");
        return true;
    };
    MBInspector.prototype.onMouseOutTarget = function (e) {
        if (e.currentTarget.id == "mbInspector")
            return;
        e.stopPropagation();
        $(e.currentTarget).removeClass("mb-inspector-over");
    };
    MBInspector.prototype.onClickNext = function (e) {
        e.preventDefault();
        e.stopPropagation();
        if ($(e.currentTarget).is(".copy")) {
            $(this.currentWizardElement).find(".api-json").select();
            this.inspectorFrame.contents()[0].execCommand('copy');
            $frame(".wizard-desc").text("Copied !");
        }
        else {
            this.goStep(this.inspectType, this.stepNumber + 1);
        }
        return false;
    };
    MBInspector.prototype.onClickPrev = function (e) {
        e.preventDefault();
        e.stopPropagation();
        this.goStep(this.inspectType, this.stepNumber - 1);
        return false;
    };
    MBInspector.prototype.onStaticStep1 = function (element) {
        $frame(".wizard-desc").text($frame(".segment-check:checked").size() + " Selected");
    };
    MBInspector.prototype.onStaticStep2 = function (element) {
        var _this = this;
        if (!this.selectedSegments || this.selectedSegments.length == 0) {
            alert("Select segments you want!");
            return false;
        }
        $frame(".wizard-desc").text("");
        var segmentsJson = this.getSegmentsJson(this.inspectedElement, $(this.selectedSegments.join(",")).toArray());
        var segmentHtmls = [];
        $(segmentsJson).each(function (i, seg) {
            segmentHtmls.push(_this["mbTplSegmentConfig"](seg));
        });
        $frame("#segmentsConfigList").html(segmentHtmls);
        return true;
    };
    MBInspector.prototype.onStaticStep3 = function (element) {
        var _this = this;
        var fail = false;
        $frame(".segment-name").each(function (i, e) {
            var segmentName = $(e).val();
            if (segmentName.match(/^\d/)) {
                alert("Don't start with number.");
                fail = true;
                return false;
            }
            else if (!segmentName) {
                alert("Name must not be empty.");
                fail = true;
                return false;
            }
        });
        if (fail)
            return false;
        var includeSibling = $frame("#selectSiblingCheck").is(":checked");
        var bodySelector = this.inspectedSelector;
        if (includeSibling) {
            bodySelector = bodySelector.substring(0, bodySelector.lastIndexOf(":nth"));
        }
        var items = $(bodySelector);
        var segmentsTestJson = $(items).toArray().map(function (item, i) {
            return $frame(".segment-config").map(function (j, e) {
                var li = $(e);
                var selector = li.data("selector");
                var segment = selector == "" ? $(item) : $(item).find(" > " + selector);
                var id = li.data("id");
                var type = li.data("type");
                var segmentName = $frame("#" + id + "name").val();
                if (segment.size() == 0) {
                    return false;
                }
                var text = $(segment).visibleText(true, "\n").trim();
                var testSegment = {
                    "id": id,
                    "selector": selector,
                    "type": type,
                    "name": segmentName
                };
                if (type == "img") {
                    return $.extend(testSegment, {
                        "src": segment[0].src
                    });
                }
                else if (type == "link") {
                    return $.extend(testSegment, {
                        "href": segment[0].href,
                        "text": text
                    });
                }
                else if (type == "text") {
                    return $.extend(testSegment, {
                        "text": text
                    });
                }
            }).toArray();
        }).filter(function (item) {
            var valid = false;
            $(item).each(function (i, segment) {
                if (segment) {
                    valid = true;
                    return true;
                }
            });
            return valid;
        });
        var segmentHtmls = [];
        $(segmentsTestJson).each(function (i, seg) {
            segmentHtmls.push(_this["mbTplSegmentTest"]({
                "index": i + 1,
                "segments": seg
            }));
        });
        $frame(".wizard-desc").text(segmentsTestJson.length + " Item Found.");
        $frame("#segmentsTestList").html(segmentHtmls);
    };
    MBInspector.prototype.onStaticStep4 = function (element) {
        var bodySelector = this.inspectedSelector;
        var includeSibling = $frame("#selectSiblingCheck").is(":checked");
        if (includeSibling) {
            bodySelector = bodySelector.substring(0, bodySelector.lastIndexOf(":nth"));
        }
        var segmentsConfig = $frame(".segment-config").map(function (i, e) {
            var li = $(e);
            var id = li.data("id");
            var selector = li.data("selector");
            var segmentName = $frame("#" + id + "name").val();
            return {
                "selector": selector,
                "name": segmentName
            };
        }).toArray();
        var apiJson = {
            "type": "static",
            "body_selector": bodySelector,
            "segments": segmentsConfig
        };
        $frame(".wizard-desc").text("");
        $(element).find(".api-json").val(JSON.stringify(apiJson));
    };
    MBInspector.prototype.onAjaxStep1 = function (element) {
        $frame(".wizard-desc").text("");
    };
    MBInspector.prototype.onAjaxStep2 = function (element) {
        var apiUrl = $frame("#apiUrlText").val();
        var dataType = $frame("[name=dataType]").val();
        var jsonRoot = $frame("#jsonRootText").val();
        if (!(apiUrl.startsWith("http://") || apiUrl.startsWith("https://"))) {
            alert("API URL muse be start with 'http://' or 'https://'");
            return false;
        }
        this.apiAjaxConfig = {
            "url": apiUrl,
            "type": "ajax",
            "data_type": dataType,
            "json_root": jsonRoot
        };
        $frame(".wizard-desc").text("");
        $(element).find(".api-json").val(JSON.stringify(this.apiAjaxConfig));
    };
    MBInspector.prototype.goStep = function (inspectType, stepNumber) {
        this.currentWizardElement = $frame("#" + inspectType + "Step" + stepNumber);
        var event = this["on" + inspectType.replace(/(^.?)/g, function (match, chr) { return chr.toUpperCase(); }) + "Step" + stepNumber];
        if (event) {
            var result = event.apply(this, this.currentWizardElement);
            if (result == false)
                return;
        }
        this.inspectType = inspectType;
        this.stepNumber = stepNumber;
        $frame("#nextButton").removeClass("copy");
        if (stepNumber == 1) {
            $frame("#prevButton").addClass("disabled");
            $frame("#nextButton").removeClass("disabled");
        }
        else if ($frame("#" + inspectType + "Step" + (stepNumber + 1)).size() == 0) {
            $frame("#prevButton").removeClass("disabled");
            $frame("#nextButton").addClass("copy");
        }
        else {
            $frame("#prevButton").removeClass("disabled");
        }
        $frame(".wizard-wrapper > div").hide();
        var wizard = $frame("." + inspectType + "-wizard");
        wizard.show();
        wizard.find("> div").hide();
        $frame("#" + inspectType + "Step" + stepNumber).show();
    };
    MBInspector.prototype.inspectElements = function (element) {
        var _this = this;
        if (!element) {
            $frame("#bodySelector").html("");
            $frame("#segmentsSelectList").html("");
            this.inspectedElement = null;
            this.selectedSegments = null;
            this.inspectedSelector = null;
            return;
        }
        var selector = element.getPath();
        this.inspectedElement = element;
        this.selectedSegments = null;
        this.inspectedSelector = selector;
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
        $frame("#bodySelector").html(pathNav);
        var segments = this.findSegments(element);
        var segmentHtmls = [];
        $(segments).each(function (i, seg) {
            segmentHtmls.push(_this["mbTplSegment"](seg));
        });
        $frame("#segmentsSelectList").html(segmentHtmls.join(""));
        if (hasSibling) {
            $frame("#selectSiblingCheck").attr("checked", "checked");
            $frame("#selectSiblingCheck").attr("disabled", null);
        }
        else {
            $frame("#selectSiblingCheck").attr("checked", null);
            $frame("#selectSiblingCheck").attr("disabled", "disabled");
        }
        this.inspectedCover.css("top", element.offset().top);
        this.inspectedCover.css("left", element.offset().left);
        this.inspectedCover.css("width", element[0].offsetWidth);
        this.inspectedCover.css("height", element[0].offsetHeight);
        this.inspectedCover.show();
        this.goStep(InspectType.STATIC, 1);
    };
    MBInspector.prototype.findSegments = function (element) {
        var segments = [];
        if (element.is(":hasTextOnly")) {
            segments.push($(element)[0]);
        }
        else {
            segments.push($(element)[0]);
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
                segment["type"] = "img";
                segment["src"] = e.src;
            }
            else {
                segment["type"] = "text";
            }
            segment["id"] = "segment" + i;
            segment["text"] = $(e).visibleText(true, "\n").trim();
            segment["selector"] = $(e).getPath(element);
            return segment;
        });
    };
    MBInspector.prototype.enable = function () {
        this.inspector.show();
        this.inspectElements(null);
        this.goStep(this.inspectType, 1);
        this.bindEvents();
    };
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
                _this.goStep(InspectType.AJAX, 1);
            }
            else {
                _this.goStep(InspectType.STATIC, 1);
            }
        });
        $frame("body").on("click", "#nextButton", $.proxy(this.onClickNext, this));
        $frame("body").on("click", "#prevButton", $.proxy(this.onClickPrev, this));
        $frame("body").on("click", "#closeButton", $.proxy(function (e) { MBInspectorToggle(); return false; }, this));
    };
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
function LoadResource(e, t) {
    var r = new XMLHttpRequest;
    r.open("GET", chrome.runtime.getURL(e), !0), r.onreadystatechange = function () {
        r.readyState == XMLHttpRequest.DONE && 200 == r.status && t(r.responseText);
    }, r.send();
}
var mbInspector = new MBInspector;
function $frame(selector) {
    return mbInspector.inspectorFrame.contents().find(selector);
}
function MBInspectorToggle() {
    mbInspector.toggle();
}
function MBInspectThisElement() {
    console.log(arguments);
}
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.message == "ping")
        sendResponse({ message: "pong" });
});
//# sourceMappingURL=inspector.js.map