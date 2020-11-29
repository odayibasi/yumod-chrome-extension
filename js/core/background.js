chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.op === 'persistWriterInfo') {
        var key = message.data.key + "";
        var val = message.data.val + "";
        let dataObj = {};
        dataObj[key] = val;
        chrome.storage.local.set(dataObj, function() {
            sendResponse({ err: null, data: dataObj });
        });
        return true;
    } else if (message.op === 'isWriterInfoPersisted') {
        chrome.storage.local.get(message.data.key, function(res) {
            if (res == undefined) res = {};
            sendResponse({ err: null, data: res });
        });
        return true;
    }
});
