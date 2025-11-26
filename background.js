chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "BROADCAST_STATUS") {
        // Relay the message to all tabs
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    type: "STATUS_UPDATE",
                    status: request.status
                }).catch(() => {
                    // Ignore errors for tabs that don't have the content script
                });
            });
        });
    }
});