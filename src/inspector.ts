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

let $ = window["jQuery"];
let chrome = window["chrome"];
let Handlebars = window["Handlebars"];

class MBInspector {
	// Inspector DIV
	inspector: any;
	// Inspector IFRAME
	inspectorFrame: any;
	// Element's selector that can be inspected.
	targetSelector: string = "div,li,tr";
	// Current inspected element
	inspectedElement: any;
	// Cover of inspected element
	inspectedCover: any;

	isInit() {
		return $("#mbInspector").size() > 0;
	}

	init() {
		this.inspector = $("<div id='mbInspector'><iframe id='mbInspectorFrame'><body></body></iframe></div>");
		this.inspectedCover = $("<div id='mbElementCover'></div>");
		$(document.body).append(this.inspector);
		$(document.body).append(this.inspectedCover);
		this.inspectorFrame = this.inspector.find("iframe");
		LoadResource("src/inspectorFrame.html", (html)=>{
			this.inspectorFrame.contents().find("body").html(html);
			$frame("script[type='text/x-handlebars']").each((i,script)=>{
				this[script.id] = Handlebars.compile($(script).html());
			});
			LoadResource("css/bootstrap.min.css", (css)=>{
				$("<style type='text/css'>" + css + "</style>").appendTo(this.inspectorFrame.contents().find("head"));
				this.enable();
			});
		});
 
	}

	isEnable() {
		return this.inspector.is(":visible");
	}

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

	disable() {
		this.unbindEvents();
		this.inspector.hide();
		this.inspectedCover.hide();
	}

	onClickTarget(event) {
		console.log(arguments);
		event.preventDefault();
		event.stopImmediatePropagation();
		let target = $(event.currentTarget);
		this.inspectElements(target);
	}

	onClickParent() {
		if(this.inspectedElement == undefined) {
			return;
		}

		if(this.inspectedElement.parentElement.tagName == "HTML")

		this.inspectElements(this.inspectedElement.parentElement);
	}

	onClickPathCrumb(e) {
		let paths = $(e.currentTarget).data("paths");
		this.inspectElements($(paths));
		return false;
	}
	
	onMouseOverTarget(e) {
		e.stopPropagation();
		$(e.currentTarget).addClass("mb-inspector-over");
	}

	onMouseOutTarget(e) {
		e.stopPropagation();
		$(e.currentTarget).removeClass("mb-inspector-over");
	}

	inspectElements(element) {
		let selector = element.getPath();
		this.inspectedElement = element;
		let paths = "";
		let pathNav = $("<div class='path-nav'></div>");
		$(selector.split(">")).each((i, path) =>{
			paths += (i > 0 ? "> ": "") + path;
			if(i > 0)
				$("<span></span>").text(">").appendTo(pathNav);
			$("<a href='#' class='path-crumbs'></a>").text(path).data("paths", paths).appendTo(pathNav);
		});
		$frame("#selector").html(pathNav);
		console.log(selector);
		let segments = this.findSegments(element);
		let segmentHtmls = [];
		$(segments).each((i, seg)=>{
			if(seg.type == "link") {
				segmentHtmls.push(this["mbTplLink"](seg));
			} else if(seg.type == "img") {
				segmentHtmls.push(this["mbTplImg"](seg));
			} else if(seg.type == "text") {
				segmentHtmls.push(this["mbTplText"](seg));
			}
		});
		$frame("#contents").html(segmentHtmls.join(""));
		this.inspectedCover.css("top", element.offset().top);
		this.inspectedCover.css("left", element.offset().left);
		this.inspectedCover.css("width", element[0].offsetWidth);
		this.inspectedCover.css("height", element[0].offsetHeight);
		this.inspectedCover.show();
	}

	findSegments(element) {
		let segments = null;
		if(element.is(":hasTextOnly")) {
			segments = element;
		} else {
			segments = element.find(":hasTextOnly,a[href!='#'],img").filter((i, e)=>{return $(e).css("display") !== 'none';});
		}

		segments = segments.map((i, e)=>{
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

			segment["text"] = $(e).text();
			segment["selector"] = $(e).getPath(element);

			return segment;
		});

		console.log(segments);
		return segments;
	}

	enable() {
		this.bindEvents();
		this.inspector.show();
	}

	bindEvents() {
		$("body").on("click", this.targetSelector, $.proxy(this.onClickTarget, this));
		$("body").on("mouseover", this.targetSelector, $.proxy(this.onMouseOverTarget, this));
		$("body").on("mouseout", this.targetSelector, $.proxy(this.onMouseOutTarget, this));
		$frame("body").on("click", ".path-crumbs", $.proxy(this.onClickPathCrumb, this));
	}

	unbindEvents() {
		$("body").off("click", this.targetSelector, this.onClickTarget);
		$("body").off("mouseover", this.targetSelector, this.onMouseOverTarget);
		$("body").off("mouseout", this.targetSelector, this.onMouseOutTarget);
		$frame("body").off("click", ".path-crumbs", this.onClickPathCrumb);
	}
}

function LoadResource(e, t) {
    var r = new XMLHttpRequest;
    r.open("GET", chrome.runtime.getURL(e), !0), r.onreadystatechange = function() {
        r.readyState == XMLHttpRequest.DONE && 200 == r.status && t(r.responseText)
    }, r.send();
}

let inspector = new MBInspector;
function $frame(selector) {
	return inspector.inspectorFrame.contents().find(selector);
}

function MBInspectorToggle() {
	inspector.toggle();
}

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
	  if (request.message == "ping")
	    sendResponse({message: "pong"});
	});