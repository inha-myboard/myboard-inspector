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

class MBInspector {
	inspector: any;
	inspectorFrame: any;
	targetSelector: string = "div,li,tr";

	isInit() {
		return $("#mbInspector").size() > 0;
	}

	init() {
		this.inspector = $("<div id='mbInspector'><iframe id='mbInspectorFrame'><body></body></iframe></div>");
		$(window.document.body).append(this.inspector);
		this.inspectorFrame = this.inspector.find("iframe");
		LoadResource("src/inspectorFrame.html", (html)=>{
			this.inspectorFrame.contents().find("body").html(html);
			this.enable();
		});

		// this.inspectorFrame.contents().on("click", "span", (e)=>{alert(e);}); 
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
		$("body").off("click", this.targetSelector, this.onClickTarget);
		this.inspector.hide();
	}

	onClickTarget(event) {
		console.log(arguments);
		event.preventDefault();
		event.stopImmediatePropagation();
	}

	enable() {
		$("body").on("click", this.targetSelector, this.onClickTarget);
		this.inspector.show();
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
	return inspector.inspectorFrame.find(selector);
}

function MBInspectorToggle() {
	inspector.toggle();
}

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
	  if (request.message == "ping")
	    sendResponse({message: "pong"});
	});