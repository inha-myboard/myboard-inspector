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
	inspector: any;
	inspectorFrame: any;
	targetSelector: string = "div,li,tr";
	inspectedElement: any;

	isInit() {
		return $("#mbInspector").size() > 0;
	}

	init() {
		this.inspector = $("<div id='mbInspector'><iframe id='mbInspectorFrame'><body></body></iframe></div>");
		$(window.document.body).append(this.inspector);
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

	inspectElements(element) {
		let selector = element.getPath();
		this.inspectedElement = element;
		$frame("#selector").text(selector);
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
		// if(element.tagName === "LI") {

		// } else if(element.tagName === "DIV") {

		// } else if(element.tagName === "TR") {

		// }
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
			segment["selector"] = $(e).getPath();

			return segment;
		});

		console.log(segments);
		return segments;
		// segments는 text만을 가지고있거나, link거나, img 

	}

	enable() {
		this.bindEvents();
		this.inspector.show();
	}

	bindEvents() {
		$("body").on("click", this.targetSelector, $.proxy(this.onClickTarget, this));
	}

	unbindEvents() {
		$("body").off("click", this.targetSelector, this.onClickTarget);
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