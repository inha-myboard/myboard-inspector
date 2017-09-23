let chrome = window["chrome"];

class MBInspectorInitiator {
    state: any[];
    constructor() {
    }

    init(tab, callback) {
        if (tab.url.indexOf("https://chrome.google.com") == 0 || tab.url.indexOf("chrome://") == 0) {
            alert("CanvasFlip Inspector doesn't work on Google Chrome webstore!");
            return;
        }

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {message: "ping"}, function (response) {
                if (response) {
                    if (typeof callback == "function") {
                        callback();
                    }
                } else {
                    // Load iniial scripts, css 
                    chrome.tabs.executeScript(tabs[0].id, {file: 'js/jquery/jquery.min.js'});
                    chrome.tabs.executeScript(tabs[0].id, {file: 'src/inspector.js'});
                    chrome.tabs.insertCSS(tabs[0].id, {file: 'src/inspector.css'});

                    window.setTimeout(function () {
                        if (typeof callback == "function") {
                            callback();
                        }
                    }, 1000);
                }
            });
        });
    }

    toggle(tab) {
        this.init(tab, function () {
            chrome.tabs.executeScript(tab.id, {code: 'MBInspectorToggle()'});
        });
    }

    inspectThisElement(info, tab) {
        this.init(tab, function () {
            chrome.tabs.executeScript(tab.id, {code: 'MBInspectThisElement()'});
        });
    }
}

let inspector = new MBInspectorInitiator;

var inspectorContextMenu = chrome.contextMenus.create({"title": "MyBoard Inspect", contexts: ["all"], "onclick": inspector.inspectThisElement});

chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason == "install") {
        chrome.tabs.create({url: "option.html"});
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
        chrome.tabs.executeScript(tab.id, {file: 'resources/contextmenu.js'});
    }
});
