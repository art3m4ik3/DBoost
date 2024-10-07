document.addEventListener("DOMContentLoaded", () => {
    const select = document.getElementById("proxySelect");
    const applyButton = document.getElementById("applyProxy");
    const addCustomProxyButton = document.getElementById("addCustomProxy");
    const customProxyList = document.getElementById("customProxyList");
    const updateProxyListButton = document.getElementById("updateProxyList");
    const updateStatus = document.getElementById("updateStatus");

    function updateProxyList() {
        chrome.storage.local.get(["proxyList", "customProxies"], (result) => {
            const proxyList = result.proxyList || [];
            const customProxies = result.customProxies || [];
            const allProxies = [...proxyList, ...customProxies];

            select.innerHTML = '<option value="">Выбрать прокси</option>';
            allProxies.forEach((proxy, index) => {
                const option = document.createElement("option");
                option.value = index;
                option.textContent = `${proxy.name} (${proxy.type})`;
                select.appendChild(option);
            });

            updateCustomProxyList(customProxies);
        });
    }

    function updateCustomProxyList(customProxies) {
        customProxyList.innerHTML = "<h2>Пользовательские прокси</h2>";
        customProxies.forEach((proxy) => {
            const proxyElement = document.createElement("div");
            proxyElement.textContent = `${proxy.name} (${proxy.type})`;
            const removeButton = document.createElement("button");
            removeButton.textContent = "Удалить";
            removeButton.onclick = () => removeCustomProxy(proxy.id);
            proxyElement.appendChild(removeButton);
            customProxyList.appendChild(proxyElement);
        });
    }

    function removeCustomProxy(proxyId) {
        chrome.runtime.sendMessage({
            action: "removeCustomProxy",
            proxyId: proxyId,
        });
    }

    updateProxyList();

    chrome.runtime.onMessage.addListener((request) => {
        if (
            request.action === "proxyListUpdated" ||
            request.action === "customProxyAdded" ||
            request.action === "customProxyRemoved"
        ) {
            updateProxyList();
            updateStatus.textContent = "Список прокси успешно обновлен.";
        } else if (request.action === "proxyListUpdateFailed") {
            updateStatus.textContent = `Ошибка при обновлении: ${request.error}`;
        }
        setTimeout(() => (updateStatus.textContent = ""), 3000);
    });

    applyButton.addEventListener("click", () => {
        const selectedIndex = select.value;
        if (selectedIndex) {
            chrome.storage.local.get(
                ["proxyList", "customProxies"],
                (result) => {
                    const allProxies = [
                        ...(result.proxyList || []),
                        ...(result.customProxies || []),
                    ];
                    const selectedProxy = allProxies[selectedIndex];
                    chrome.runtime.sendMessage({
                        action: "setProxy",
                        proxy: selectedProxy,
                    });
                }
            );
        }
    });

    addCustomProxyButton.addEventListener("click", () => {
        const name = document.getElementById("customName").value;
        const host = document.getElementById("customHost").value;
        const port = document.getElementById("customPort").value;
        const type = document.getElementById("customType").value;
        const username = document.getElementById("customUsername").value;
        const password = document.getElementById("customPassword").value;

        if (name && host && port && type) {
            const customProxy = { name, host, port, type, username, password };
            chrome.runtime.sendMessage({
                action: "addCustomProxy",
                proxy: customProxy,
            });
        }
    });

    updateProxyListButton.addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "manualUpdate" });
        updateStatus.textContent = "Обновление списка прокси...";
    });
});
