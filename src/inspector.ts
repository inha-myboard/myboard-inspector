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
	inspectorFrame: MBInspectorFrame;
	
	init() {
		if($("#mbInspector").size() == 0) {
			let inspectorDiv = $("<div id='mbInspector'><iframe id='mbInspectorFrame'></iframe></div>");
			this.inspectorFrame = new MBInspectorFrame(inspectorDiv.find("iframe"));
			this.inspectorFrame.init();
		}
	}

	frame(selector) {
		return this.inspectorFrame.find(selector);
	}
}

class MBInspectorFrame {
	frame: any;

	constructor(frame) {
		this.frame = frame;
	}

	init() {
		if($("#mbInspectorFrame").size() == 0) {
			$(window.document).append(this.frame);
			LoadResource("inspector.html", function(html){
				this.frame.find("body").html(html);
			});
		}
	}

	find(selector) {
		return this.frame.find(selector);
	}
}

function LoadResource(e, t) {
    var r = new XMLHttpRequest;
    r.open("GET", chrome.extension.getURL(e), !0), r.onreadystatechange = function() {
        r.readyState == XMLHttpRequest.DONE && 200 == r.status && t(r.responseText)
    }, r.send();
}


let inspector = new MBInspector;

inspector.frame("#")