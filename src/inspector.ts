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

declare var $: any;
declare var chrome: any;
declare var Handlebars: any;
declare var document: Document;

enum InspectType {
	STATIC = "static",
	AJAX = "ajax"
};

class MBInspector {
	// Inspector DIV
	inspector: any;
	// Inspector IFRAME
	inspectorFrame: any;
	// Cover of inspected element
	inspectedCover: any;
	// Element's selector that can be inspected.
	targetSelector: string = "div,li,tr,a";

	// inspectType
	inspectType: InspectType = InspectType.STATIC;
	// step number
	stepNumber: number = 1;
	// currentWizardElement
	currentWizardElement: any;

	// Current inspected element
	inspectedElement: any;
	// Current inspected element
	inspectedSelector: any;
	// Selected segments from inspected element
	selectedSegments: any;

	// Ajax Config
	apiAjaxConfig: any;


	// Is Initialized
	isInit() {
		return $("#mbInspector").size() > 0;
	}

	// Initialize inspector
	init() {
		this.inspector = $("<div id='mbInspector' style='left: 15px'><iframe id='mbInspectorFrame'><body></body></iframe></div>");
		this.inspectedCover = $("<div id='mbElementCover'></div>");
		$(document.body).append(this.inspector);
		$(document.body).append(this.inspectedCover);
		this.inspectorFrame = this.inspector.find("iframe");
		let frameHead = this.inspectorFrame.contents().find("head");
		let frameBody = this.inspectorFrame.contents().find("body");

		LoadResource("src/inspectorFrame.html", (html)=>{
			frameBody.html(html);
			$frame("script[type='text/x-handlebars']").each((i,script)=>{
				this[script.id] = Handlebars.compile($(script).html());
			});
			this.enable();
		});
	}

	// Is enabled (showing) ?
	isEnable() {
		return this.inspector.is(":visible");
	}

	// Toggle inspector
	toggle() {
		if(!this.isInit()) {
			this.init();
			return;
		}
		if(this.isEnable()) {
			this.disable();
		} else {
			this.enable();
		}
	}

	// Hide inspector & unbind events
	disable() {
		this.unbindEvents();
		this.inspector.hide();
		this.inspectedCover.hide();
	}

	// When elements is clicked
	onClickTarget(event) {
		console.log(arguments);
		event.preventDefault();
		event.stopImmediatePropagation();
		let target = $(event.currentTarget);
		this.inspectElements(target);
	}

	// When one of selectors in path is clicked
	onClickPathCrumb(e) {
		e.preventDefault();
		e.stopPropagation();
		let paths = $(e.currentTarget).data("paths");
		this.inspectElements($(paths));
		return false;
	}
	
	// When element is focused in pointer
	onMouseOverTarget(e) {
		if(e.currentTarget.id == "mbInspector") return;
		e.stopPropagation();
		e.preventDefault();
		$(e.currentTarget).addClass("mb-inspector-over");
		return true;
	}

	// When element lost focus of pointer
	onMouseOutTarget(e) {
		if(e.currentTarget.id == "mbInspector") return;
		e.stopPropagation();
		$(e.currentTarget).removeClass("mb-inspector-over");
	}

	onClickNext(e) {
		e.preventDefault();
		e.stopPropagation();
		if($(e.currentTarget).is(".copy")) {
			$(this.currentWizardElement).find(".api-json").select();
			this.inspectorFrame.contents()[0].execCommand('copy');
    		$frame(".wizard-desc").text("Copied !");
		} else {
			this.goStep(this.inspectType, this.stepNumber + 1);
		}
		return false;
	}

	onClickPrev(e) {
		e.preventDefault();
		e.stopPropagation();
		this.goStep(this.inspectType, this.stepNumber - 1);
		return false;
	}

	onStaticStep1(element) {
		$frame(".wizard-desc").text($frame(".segment-check:checked").size() + " Selected");
	}

	onStaticStep2(element) {
		if(!this.selectedSegments || this.selectedSegments.length == 0) {
			alert("Select segments you want!");
			return false;
		}

		$frame(".wizard-desc").text("");
		let segmentsJson = this.getSegmentsJson(this.inspectedElement, $(this.selectedSegments.join(",")).toArray());

		let segmentHtmls = [];
		$(segmentsJson).each((i, seg)=>{
			segmentHtmls.push(this["mbTplSegmentConfig"](seg));
		});

		$frame("#segmentsConfigList").html(segmentHtmls);
		return true;
	}

	onStaticStep3(element) {
		let fail = false;
		$frame(".segment-name").each((i, e)=>{
			let segmentName = $(e).val();
			if(segmentName.match(/^\d/)) {
				alert("Don't start with number.");
				fail = true;
				return false;
			} else if(!segmentName) {
				alert("Name must not be empty.");
				fail = true;
				return false;
			}
		});
		if(fail)
			return false;
		let includeSibling = $frame("#selectSiblingCheck").is(":checked");
		let bodySelector = this.inspectedSelector;
		if(includeSibling) {
			bodySelector = bodySelector.substring(0, bodySelector.lastIndexOf(":nth"));
		}

		let items = $(bodySelector);
		let segmentsTestJson = $(items).toArray().map((item, i)=> {
			return $frame(".segment-config").map((j, e)=>{
				let li = $(e);
				let selector = li.data("selector");
				let segment = selector == "" ? $(item) : $(item).find(" > " + selector);
				let id = li.data("id");
				let type = li.data("type");
				let segmentName = $frame("#" + id + "name").val();

				// Invalid segment
				if(segment.size() == 0) {
					return false;
				}

				let text =  $(segment).visibleText(true, "\n").trim();
				let testSegment = {
					"id": id,
					"selector": selector,
					"type": type,
					"name": segmentName
				};

				if(type == "img") {
					return $.extend(testSegment, {
						"src": segment[0].src
					});
				} else if(type == "link") {
					return $.extend(testSegment, {
						"href": segment[0].href,
						"text": text
					});
				} else if(type == "text") {
					return $.extend(testSegment, {
						"text": text
					});
				}
			}).toArray();
		}).filter((item)=>{
			let pass = false;
			$(item).each((i, segment)=>{
				if(!segment) {
					pass = true;
					return false;
				}
			});
			return !pass;
		});

		let segmentHtmls = [];
		$(segmentsTestJson).each((i, seg)=>{
			segmentHtmls.push(this["mbTplSegmentTest"]({
				"index": i + 1,
				"segments": seg
			}));
		});

		$frame(".wizard-desc").text(segmentsTestJson.length + " Item Found.");
		$frame("#segmentsTestList").html(segmentHtmls);
	}

	onStaticStep4(element) {
		let bodySelector = this.inspectedSelector;
		let includeSibling = $frame("#selectSiblingCheck").is(":checked");
		if(includeSibling) {
			bodySelector = bodySelector.substring(0, bodySelector.lastIndexOf(":nth"));
		}

		let segmentsConfig = $frame(".segment-config").map((i, e)=>{
			let li = $(e);
			let id = li.data("id");
			let selector = li.data("selector");
			let segmentName = $frame("#" + id + "name").val();

			return {
				"selector": selector,
				"name": segmentName
			};
		}).toArray();

		let apiJson = {
			"type": "static",
			"body_selector": bodySelector,
			"segments" : segmentsConfig
		};
		$frame(".wizard-desc").text("");
		$(element).find(".api-json").val(JSON.stringify(apiJson));
	}

	onAjaxStep1(element) {
		$frame(".wizard-desc").text("");
	}

	onAjaxStep2(element) {
		let apiUrl = $frame("#apiUrlText").val();
		let dataType = $frame("[name=dataType]").val();
		let jsonRoot = $frame("#jsonRootText").val();

		if(!(apiUrl.startsWith("http://") || apiUrl.startsWith("https://"))) {
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
	}

	goStep(inspectType: InspectType, stepNumber: number) {
		this.currentWizardElement = $frame("#" + inspectType + "Step" + stepNumber);
		let event = this["on" + inspectType.replace(/(^.?)/g, function(match, chr){return chr.toUpperCase();}) + "Step" + stepNumber];
		if(event) {
			let result = event.apply(this, this.currentWizardElement);
			if(result == false)
				return;
		}
	
		this.inspectType = inspectType;
		this.stepNumber = stepNumber;

		$frame("#nextButton").removeClass("copy");

		if(stepNumber == 1) {
			$frame("#prevButton").addClass("disabled");
			$frame("#nextButton").removeClass("disabled");
		} else if($frame("#" + inspectType + "Step" + (stepNumber+1)).size() == 0) {
			$frame("#prevButton").removeClass("disabled");
			$frame("#nextButton").addClass("copy");
		} else {
			$frame("#prevButton").removeClass("disabled");
		}

		$frame(".wizard-wrapper > div").hide();
		let wizard = $frame("." + inspectType + "-wizard");
		wizard.show();
		wizard.find("> div").hide();
		$frame("#" + inspectType + "Step" + stepNumber).show();
	}

	// Inspect specific element that can be selected by 'targetSelector'
	inspectElements(element) {
		if(!element) {
			$frame("#bodySelector").html("");
			$frame("#segmentsSelectList").html("");
			this.inspectedElement = null;
			this.selectedSegments = null;
			this.inspectedSelector = null;
			return;
		}
		// get selector
		let selector = element.getPath();
		this.inspectedElement = element;
		this.selectedSegments = null;
		this.inspectedSelector = selector;

		// Make paths crumb 
		let paths = "";
		let pathNav = $("<div class='path-nav'></div>");
		let selectors = selector.split(">");
		let hasSibling = selectors.slice(-1)[0].indexOf(":nth-child") > -1;
		$(selectors).each((i, path) =>{
			paths += (i > 0 ? "> ": "") + path;
			if(i > 0)
				$("<span></span>").text(">").appendTo(pathNav);
			$("<a href='#' class='path-crumbs'></a>").text(path).data("paths", paths).appendTo(pathNav);
		});
		$frame("#bodySelector").html(pathNav);

		// Find elements that can be segments.
		let segments = this.findSegments(element);

		// Make segments list
		let segmentHtmls = [];
		$(segments).each((i, seg)=>{
			segmentHtmls.push(this["mbTplSegment"](seg));
		});
		$frame("#segmentsSelectList").html(segmentHtmls.join(""));

		if(hasSibling) {
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

		this.goStep(InspectType.STATIC, 1);
	}

	// Find segments in element. result is json.
	findSegments(element) {
		let segments:Array<any> = [];
		if(element.is(":hasTextOnly")) {
			segments.push($(element)[0]);
		} else {
			segments.push($(element)[0]);
			segments = segments.concat(element.find(":hasText:not(a),a[href!='#'],img").filter((i, e)=>{
				return $(e).is(":visible");
			}).toArray());
		}

		return this.getSegmentsJson(element, segments);
	}

	getSegmentsJson(element, segments) {
		return segments.map((e:any, i:number)=>{
			let segment = {};
			if(e.tagName === "A") {
				segment["type"] = "link";
				segment["href"] = e.href;
			} else if(e.tagName === "IMG") {
				// let linkAnchor = $(e).parents("a");
				// let href = "";
				// if(linkAnchor.size() > 0) {
				// 	href = linkAnchor[0].href;
				// }
				segment["type"] = "img";
				segment["src"] = e.src;
			} else {
				segment["type"] = "text"
			}

			segment["id"] = "segment" + i;
			segment["text"] = $(e).visibleText(true, "\n").trim();
			segment["selector"] = $(e).getPath(element);

			return segment;
		});
	}

	// Enable inspector and show
	enable() {
		this.inspector.show();
		this.inspectElements(null);
		this.goStep(this.inspectType, 1);
		this.bindEvents();
	}

	// Bind events to elements can be target
	bindEvents() {
		$("body").on("click", this.targetSelector, $.proxy(this.onClickTarget, this));
		$("body").on("mouseover", this.targetSelector, $.proxy(this.onMouseOverTarget, this));
		$("body").on("mouseout", this.targetSelector, $.proxy(this.onMouseOutTarget, this));
		$frame("body").on("click", ".path-crumbs", $.proxy(this.onClickPathCrumb, this));
		let r = this.inspector;
		let n = 0;
		$frame("body").on("mousedown", "#mbInspectorHeader", function(o) {
            var i = window.innerWidth - 15,
                s = r.outerWidth(),
                a = o.pageX;
            $frame("body").on("mousemove", function(e) {
                var t = e.pageX - a,
                    n = r.offset().left + t;
                n + s > i && (n = i - s), n < 15 && (n = 15), r.css("left", n)
            }).on("mouseup", function(n) {
                $frame("body").off("mousemove").off("mouseup");
            }), o.preventDefault(), o.stopPropagation();
		});
		$frame("body").on("change", ".segment-check", (e)=>{
			$frame(".wizard-desc").text($frame(".segment-check:checked").size() + " Selected");
			this.selectedSegments = [];
			$frame(".segment-check:checked").each((i, e)=>{
				let selector = $(e).parents("li").data("selector");
				if(selector.length == 0)
					this.selectedSegments.push(this.inspectedSelector);
				else
					this.selectedSegments.push(this.inspectedSelector + " > " + selector);
			});
		});
		$frame("body").on("change", "#inspectTypeCheck", (e)=>{
			if($(e.currentTarget).is(":checked")) {
				this.goStep(InspectType.AJAX, 1);
			} else {
				this.goStep(InspectType.STATIC, 1);
			}
		});
		$frame("body").on("click", "#nextButton", $.proxy(this.onClickNext, this));
		$frame("body").on("click", "#prevButton", $.proxy(this.onClickPrev, this));
		$frame("body").on("click", "#closeButton", $.proxy((e)=>{MBInspectorToggle();return false;}, this));
	}

	// Unbind all events
	unbindEvents() {
		$("body").off("click", this.targetSelector, this.onClickTarget);
		$("body").off("mouseover", this.targetSelector, this.onMouseOverTarget);
		$("body").off("mouseout", this.targetSelector, this.onMouseOutTarget);
		$frame("body").off("click", ".path-crumbs", this.onClickPathCrumb);
		$frame("body").off("mousedown", "#mbInspectorHeader");
		$frame("body").off("click", "#nextButton");
		$frame("body").off("click", "#prevButton");
		$frame("body").off("click", "#closeButton");
	}
}

// Ajax to extension's resource
function LoadResource(e, t) {
    var r = new XMLHttpRequest;
    r.open("GET", chrome.runtime.getURL(e), !0), r.onreadystatechange = function() {
        r.readyState == XMLHttpRequest.DONE && 200 == r.status && t(r.responseText)
    }, r.send();
}

// Construct inspector instance
let mbInspector = new MBInspector;
function $frame(selector) {
	return mbInspector.inspectorFrame.contents().find(selector);
}

// Wrapped function to toggle inspector
function MBInspectorToggle() {
	mbInspector.toggle();
}

// Send message that inspector script is loaded to background
chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
	  if (request.message == "ping")
	    sendResponse({message: "pong"});
	});