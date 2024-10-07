let currentProxy = null;

chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create("updateProxyList", { periodInMinutes: 15 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "updateProxyList") {
        fetchProxyList();
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "setProxy") {
        currentProxy = request.proxy;
        updateProxy();
    } else if (request.action === "addCustomProxy") {
        addCustomProxy(request.proxy);
    } else if (request.action === "removeCustomProxy") {
        removeCustomProxy(request.proxyId);
    } else if (request.action === "manualUpdate") {
        fetchProxyList();
    }
});

function updateProxy() {
    if (currentProxy) {
        const config = {
            mode: "fixed_servers",
            rules: {
                singleProxy: {
                    scheme: currentProxy.type || "http",
                    host: currentProxy.host,
                    port: parseInt(currentProxy.port),
                },
            },
        };
        if (currentProxy.username && currentProxy.password) {
            config.rules.proxyAuthorization = `${currentProxy.username}:${currentProxy.password}`;
        }
        chrome.proxy.settings.set({ value: config, scope: "regular" }, () => {
            if (chrome.runtime.lastError) {
                console.error("Error setting proxy:", chrome.runtime.lastError);
            }
        });
    } else {
        chrome.proxy.settings.clear({ scope: "regular" }, () => {
            if (chrome.runtime.lastError) {
                console.error(
                    "Error clearing proxy settings:",
                    chrome.runtime.lastError
                );
            }
        });
    }
}

function fetchProxyList() {
    fetch("https://proxy.ll-u.ru")
        .then((response) => response.text())
        .then((data) => {
            const proxyList = data
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0)
                .map((line, index) => {
                    const [host, port] = line.split(":");
                    return {
                        id: `online-${index}`,
                        name: `Online Proxy ${index + 1}`,
                        type: "http",
                        host,
                        port,
                    };
                });

            chrome.storage.local.set({ proxyList: proxyList }, () => {
                chrome.runtime.sendMessage({ action: "proxyListUpdated" });
            });
        })
        .catch((error) => {
            console.error("Error fetching proxy list:", error);
            chrome.runtime.sendMessage({
                action: "proxyListUpdateFailed",
                error: error.message,
            });
        });
}

function addCustomProxy(proxy) {
    chrome.storage.local.get(["customProxies"], (result) => {
        let customProxies = result.customProxies || [];
        proxy.id = Date.now().toString();
        customProxies.push(proxy);
        chrome.storage.local.set({ customProxies: customProxies }, () => {
            chrome.runtime.sendMessage({ action: "customProxyAdded" });
        });
    });
}

function removeCustomProxy(proxyId) {
    chrome.storage.local.get(["customProxies"], (result) => {
        let customProxies = result.customProxies || [];
        customProxies = customProxies.filter((proxy) => proxy.id !== proxyId);
        chrome.storage.local.set({ customProxies: customProxies }, () => {
            chrome.runtime.sendMessage({ action: "customProxyRemoved" });
        });
    });
}
