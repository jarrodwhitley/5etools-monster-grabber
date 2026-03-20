(() => {
    const STORAGE_KEY = 'capturedMonsters';
    const statusEl = document.querySelector('#status');
    const openOptionsBtn = document.querySelector('#open-options');
    const captureMonsterBtn = document.querySelector('#capture-monster');
    const historyEl = document.querySelector('#history');
    let activeTabId = null;

    function getStoredMonsters() {
        return new Promise((resolve) => {
            chrome.storage.local.get({ [STORAGE_KEY]: [] }, (result) => {
                resolve(result[STORAGE_KEY]);
            });
        });
    }

    function setStoredMonsters(monsters) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [STORAGE_KEY]: monsters }, () => {
                resolve();
            });
        });
    }

    async function addMonsterToHistory(monster) {
        const monsters = await getStoredMonsters();
        const existingIndex = monsters.findIndex((it) => it.name === monster.name);
        if (existingIndex >= 0) {
            monsters.splice(existingIndex, 1);
        }
        monsters.unshift(monster);
        await setStoredMonsters(monsters.slice(0, 50));
        await renderHistory();
    }

    function setStatus(message) {
        if (statusEl) {
            statusEl.textContent = message;
        }
    }

    function normalizeDamageType(value) {
        if (!value || typeof value !== 'string') {
            return undefined;
        }
        const normalized = value.toLowerCase().replace(/[^a-z_]/g, '');
        const valid = new Set([
            'non_magical_bludgeoning',
            'non_magical_piercing',
            'non_magical_slashing',
            'bludgeoning',
            'piercing',
            'slashing',
            'acid',
            'cold',
            'fire',
            'force',
            'lightning',
            'necrotic',
            'poison',
            'psychic',
            'radiant',
            'thunder',
        ]);
        return valid.has(normalized) ? normalized : undefined;
    }

    function sanitizeNpcForImport(npc) {
        if (!npc || typeof npc !== 'object') {
            return npc;
        }

        const clone = JSON.parse(JSON.stringify(npc));
        const sanitizeActionCollection = (collection) => {
            if (!Array.isArray(collection)) {
                return;
            }

            collection.forEach((action) => {
                if (!action || typeof action !== 'object') {
                    return;
                }

                if (Array.isArray(action.action_list)) {
                    action.action_list = action.action_list.slice(0, 1).map((entry) => {
                        if (!entry || typeof entry !== 'object') {
                            return { type: 'other' };
                        }
                        const next = { ...entry };
                        if (!next.type) {
                            next.type = 'other';
                        }
                        if (next.rolls && !Array.isArray(next.rolls) && typeof next.rolls === 'object') {
                            next.rolls = [next.rolls];
                        }
                        if (!Array.isArray(next.rolls)) {
                            next.rolls = [];
                        }
                        next.rolls = next.rolls.map((roll, idx) => {
                            if (!roll || typeof roll !== 'object') {
                                return roll;
                            }
                            const fixedFromAction = idx === 0 && Number.isFinite(action.fixed_val) && !Number.isFinite(roll.fixed_val)
                                ? action.fixed_val
                                : roll.fixed_val;
                            const normalizedDamage = normalizeDamageType(roll.damage_type);
                            return {
                                ...roll,
                                damage_type: normalizedDamage || roll.damage_type,
                                fixed_val: Number.isFinite(fixedFromAction) ? fixedFromAction : roll.fixed_val,
                            };
                        });
                        return next;
                    });
                }

                if ('fixed_val' in action) {
                    delete action.fixed_val;
                }
            });
        };

        sanitizeActionCollection(clone.actions);
        sanitizeActionCollection(clone.special_abilities);
        sanitizeActionCollection(clone.reactions);
        sanitizeActionCollection(clone.legendary_actions);

        return clone;
    }

    function buildNpcImportPayload(npc, fallbackKey) {
        const normalizedNpc = sanitizeNpcForImport(npc);
        const key = normalizedNpc?.harmless_key || fallbackKey || `${Date.now()}`;
        return {
            npcs: {
                [key]: {
                    ...normalizedNpc,
                    harmless_key: key,
                },
            },
            meta: {
                export_version: '2.0',
                export_date: new Date().toISOString(),
                author: '5etools-monster-grabber',
            },
        };
    }

    async function renderHistory() {
        if (!historyEl) {
            return;
        }

        const monsters = await getStoredMonsters();
        historyEl.innerHTML = '';

        if (!monsters.length) {
            const empty = document.createElement('div');
            empty.className = 'history-empty';
            empty.textContent = 'No captured monsters yet.';
            historyEl.appendChild(empty);
            return;
        }

        monsters.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'history-item';

            const name = document.createElement('div');
            name.className = 'history-item-name';
            name.title = item.name;
            name.textContent = item.name || 'Unnamed Monster';

            const actions = document.createElement('div');
            actions.className = 'history-item-actions';

            const copyBtn = document.createElement('button');
            copyBtn.className = 'history-copy-btn';
            copyBtn.textContent = 'Copy JSON';
            copyBtn.addEventListener('click', async () => {
                const payload = buildNpcImportPayload(item.json, item.id);
                await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
                setStatus(`Copied ${item.name} as import JSON.`);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'history-delete-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', async () => {
                const current = await getStoredMonsters();
                const next = current.filter((entry, entryIndex) => {
                    if (item.id && entry.id) {
                        return entry.id !== item.id;
                    }
                    return entryIndex !== index;
                });
                await setStoredMonsters(next);
                await renderHistory();
                setStatus(`Deleted ${item.name}.`);
            });

            row.appendChild(name);
            actions.appendChild(copyBtn);
            actions.appendChild(deleteBtn);
            row.appendChild(actions);
            historyEl.appendChild(row);
        });
    }

    function wireCaptureButton() {
        if (!captureMonsterBtn) {
            return;
        }

        captureMonsterBtn.addEventListener('click', async () => {
            if (activeTabId == null) {
                setStatus('Open a 5etools bestiary page first.');
                return;
            }

            setStatus('Capturing monster...');
            chrome.tabs.sendMessage(activeTabId, { type: 'captureMonster' }, async (response) => {
                if (chrome.runtime.lastError) {
                    setStatus('Could not contact page script. Refresh the tab and try again.');
                    return;
                }

                if (!response?.ok || !response?.monster) {
                    setStatus(response?.error || 'Capture failed.');
                    return;
                }

                await addMonsterToHistory({
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    name: response.monster?.name || 'Unnamed Monster',
                    createdAt: Date.now(),
                    json: response.monster,
                });
                const warningCount = Array.isArray(response.warnings) ? response.warnings.length : 0;
                if (warningCount > 0) {
                    setStatus(`Captured ${response.monster?.name || 'monster'} (${warningCount} review note${warningCount === 1 ? '' : 's'}).`);
                } else {
                    setStatus(`Captured ${response.monster?.name || 'monster'}.`);
                }
            });
        });
    }

    function wireOptionsButton() {
        if (!openOptionsBtn || !chrome?.runtime?.openOptionsPage) {
            return;
        }

        openOptionsBtn.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });
    }

    wireOptionsButton();
    wireCaptureButton();
    renderHistory();

    if (!chrome?.tabs?.query) {
        setStatus('Popup loaded. Visit 5etools and use the injected "Copy JSON" button.');
        return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs && tabs[0];
        activeTabId = activeTab?.id ?? null;
        const url = activeTab?.url || '';
        const onFiveETools = /^https:\/\/(?:[^/]+\.)?5e\.tools\//.test(url);

        if (!onFiveETools) {
            setStatus('You are not on 5e.tools. Open a bestiary page, then click "Copy Monster".');
            return;
        }

        setStatus('Ready. Open a creature and click "Copy Monster".');
    });
})();
