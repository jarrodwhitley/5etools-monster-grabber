(() => {
    const DEFAULT_SETTINGS = {
        autoCloseSourceModal: true,
    };

    const autoCloseSourceModalEl = document.querySelector('#auto-close-source-modal');
    const statusEl = document.querySelector('#status');
    const saveBtn = document.querySelector('#save');

    function setStatus(message) {
        if (!statusEl) return;
        statusEl.textContent = message;
        if (message) {
            setTimeout(() => {
                if (statusEl.textContent === message) {
                    statusEl.textContent = '';
                }
            }, 2000);
        }
    }

    function readUiSettings() {
        return {
            autoCloseSourceModal: !!autoCloseSourceModalEl?.checked,
        };
    }

    function writeUiSettings(settings) {
        if (autoCloseSourceModalEl) {
            autoCloseSourceModalEl.checked = !!settings.autoCloseSourceModal;
        }
    }

    function loadSettings() {
        if (!chrome?.storage?.sync) {
            writeUiSettings(DEFAULT_SETTINGS);
            setStatus('Storage API unavailable.');
            return;
        }

        chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
            writeUiSettings(settings);
        });
    }

    function saveSettings() {
        if (!chrome?.storage?.sync) {
            setStatus('Storage API unavailable.');
            return;
        }

        chrome.storage.sync.set(readUiSettings(), () => {
            setStatus('Saved.');
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', saveSettings);
    }

    loadSettings();
})();
