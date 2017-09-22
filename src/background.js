var chrome = window["chrome"];
var MBInspectorInitiator = (function () {
    function MBInspectorInitiator() {
    }
    MBInspectorInitiator.prototype.init = function (tab, callback) {
        if (tab.url.indexOf("https://chrome.google.com") == 0 || tab.url.indexOf("chrome://") == 0) {
            alert("CanvasFlip Inspector doesn't work on Google Chrome webstore!");
            return;
        }
        chrome.tabs.sendMessage(tab.id, { message: "ping" }, function (response) {
            if (response) {
                //already loaded
                if (typeof callback == "function") {
                    callback();
                }
            }
            else {
                // Load iniial scripts, css 
                chrome.tabs.executeScript(tab.id, { file: 'js/jquery/jquery-3.2.1.min.js' });
                chrome.tabs.executeScript(tab.id, { file: 'src/inspector.js' });
                chrome.tabs.insertCSS(tab.id, { file: 'src/background.css' });
                alert(2);
                window.setTimeout(function () {
                    if (typeof callback == "function") {
                        callback();
                    }
                }, 1000);
            }
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
var inspector = new MBInspectorInitiator;
var inspectorContextMenu = chrome.contextMenus.create({ "title": "MyBoard Inspect", contexts: ["all"], "onclick": inspector.inspectThisElement });
chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason == "install") {
        chrome.tabs.create({ url: "option.html" });
    }
});
chrome.browserAction.onClicked.addListener(function (tab) {
    inspector.toggle(tab);
});
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status == "complete") {
        if (tab.url.indexOf("https://chrome.google.com") == 0 || tab.url.indexOf("chrome://") == 0 || tab.url.indexOf("chrome-extension://") == 0) {
            return;
        }
        //attach context menu on update, keep this outside as plugin may not be loaded before clicking on context menu
        chrome.tabs.executeScript(tab.id, { file: 'resources/contextmenu.js' });
    }
});
