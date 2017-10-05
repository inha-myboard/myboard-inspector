var MBInspectorInitiator = (function () {
    function MBInspectorInitiator() {
    }
    MBInspectorInitiator.prototype.init = function (tab, callback) {
        if (tab.url.indexOf("https://chrome.google.com") == 0 || tab.url.indexOf("chrome://") == 0) {
            alert("CanvasFlip Inspector doesn't work on Google Chrome webstore!");
            return;
        }
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { message: "ping" }, function (response) {
                if (response) {
                    if (typeof callback == "function") {
                        callback();
                    }
                }
                else {
                    chrome.tabs.executeScript(tabs[0].id, { file: 'js/jquery/jquery.min.js' });
                    chrome.tabs.executeScript(tabs[0].id, { file: 'js/handlebars.min.js' });
                    chrome.tabs.executeScript(tabs[0].id, { file: 'js/extends.js' });
                    chrome.tabs.executeScript(tabs[0].id, { file: 'src/inspector.js' });
                    chrome.tabs.insertCSS(tabs[0].id, { file: 'src/inspector.css' });
                    window.setTimeout(function () {
                        if (typeof callback == "function") {
                            callback();
                        }
                    }, 1000);
                }
            });
        });
    };
    MBInspectorInitiator.prototype.toggle = function (tab) {
        this.init(tab, function () {
            chrome.tabs.executeScript(tab.id, { code: 'MBInspectorToggle()' });
        });
    };
    MBInspectorInitiator.prototype.inspectThisElement = function (info, tab) {
        this.init(tab, function () {
            chrome.tabs.executeScript(tab.id, { code: 'MBInspectThisElement()' });
        });
    };
    return MBInspectorInitiator;
}());
var mbInspectorInitiator = new MBInspectorInitiator;
var inspectorContextMenu = chrome.contextMenus.create({ "title": "MyBoard Inspect", contexts: ["all"], "onclick": mbInspectorInitiator.inspectThisElement });
chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason == "install") {
        chrome.tabs.create({ url: "option.html" });
    }
});
chrome.browserAction.onClicked.addListener(function (tab) {
    mbInspectorInitiator.toggle(tab);
});
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status == "complete") {
        if (tab.url.indexOf("https://chrome.google.com") == 0 || tab.url.indexOf("chrome://") == 0 || tab.url.indexOf("chrome-extension://") == 0) {
            return;
        }
        chrome.tabs.executeScript(tab.id, { file: 'resources/contextmenu.js' });
    }
});
//# sourceMappingURL=background.js.map