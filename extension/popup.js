document.addEventListener('DOMContentLoaded', async () => {
    const windowsContainer = document.getElementById('windows-container');
    const searchInput = document.getElementById('search-input');
    const openSettingsBtn = document.getElementById('open-settings');
    const newWindowBtn = document.getElementById('new-window');

    const settingsPanel = document.getElementById('settings-panel');
    const parentFolderInput = document.getElementById('parent-folder-input');
    const saveSettingsBtn = document.getElementById('save-settings');
    const resetSettingsBtn = document.getElementById('reset-settings');

    // Toggle settings panel
    // openSettingsBtn.title = ''; // Remove native title
    attachTooltip(openSettingsBtn, 'Settings');
    openSettingsBtn.addEventListener('click', async () => {
        const isHidden = settingsPanel.classList.contains('hidden');
        if (isHidden) {
            // Load current setting
            const settings = await chrome.storage.sync.get(['parentFolder']);
            // Default is 'Bookmarks bar/' (with trailing slash for empty folder)
            parentFolderInput.value = settings.parentFolder !== undefined ? settings.parentFolder : 'Bookmarks bar/';
            settingsPanel.classList.remove('hidden');
        } else {
            settingsPanel.classList.add('hidden');
        }
    });

    // Reset settings
    // resetSettingsBtn.title = ''; // Remove native title
    attachTooltip(resetSettingsBtn, 'Reset to Default');
    resetSettingsBtn.addEventListener('click', () => {
        parentFolderInput.value = 'Bookmarks bar/'; // Reset to default
    });

    // Save settings
    saveSettingsBtn.addEventListener('click', async () => {
        const parentFolder = parentFolderInput.value.trim();
        await chrome.storage.sync.set({ parentFolder });
        
        // Visual feedback
        const originalText = saveSettingsBtn.textContent;
        saveSettingsBtn.textContent = 'Saved!';
        setTimeout(() => {
            saveSettingsBtn.textContent = originalText;
            settingsPanel.classList.add('hidden');
        }, 1000);
    });

    // New Window Placeholder
    // newWindowBtn.title = ''; // Remove native title
    attachTooltip(newWindowBtn, 'New Window');
    newWindowBtn.addEventListener('click', () => {
        createPlaceholderWindow();
    });

    // Initial render
    await renderWindows();

    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        filterTabs(query);
    });
});

async function renderWindows() {
    const windowsContainer = document.getElementById('windows-container');
    windowsContainer.innerHTML = '';

    const windows = await chrome.windows.getAll({ populate: true });
    
    // Identify duplicates across all windows
    const urlCounts = new Map();
    windows.forEach(win => {
        win.tabs.forEach(tab => {
            const url = tab.url;
            urlCounts.set(url, (urlCounts.get(url) || 0) + 1);
        });
    });

    // Create Global Tooltip
    let globalTooltip = document.getElementById('global-tooltip');
    if (!globalTooltip) {
        globalTooltip = document.createElement('div');
        globalTooltip.id = 'global-tooltip';
        globalTooltip.className = 'global-tooltip';
        document.body.appendChild(globalTooltip);
    }

    windows.forEach(win => {
        const windowCard = document.createElement('div');
        windowCard.className = 'window-card';
        windowCard.dataset.windowId = win.id;

        // No Header - Tabs directly in the card container
        // We append tabs first, then actions at the end

        // Drag and Drop: Window Card as Drop Target
        windowCard.addEventListener('dragover', (e) => {
            e.preventDefault(); // Allow dropping
            windowCard.classList.add('drag-over');
        });

        windowCard.addEventListener('dragleave', () => {
            windowCard.classList.remove('drag-over');
        });

        windowCard.addEventListener('drop', async (e) => {
            e.preventDefault();
            windowCard.classList.remove('drag-over');
            
            const tabId = parseInt(e.dataTransfer.getData('text/plain'));
            const targetWindowId = win.id;
            
            if (tabId) {
                try {
                    // Move tab to new window
                    await chrome.tabs.move(tabId, { windowId: targetWindowId, index: -1 });
                    // Refresh UI
                    renderWindows();
                } catch (err) {
                    console.error('Failed to move tab:', err);
                }
            }
        });

        win.tabs.forEach(tab => {
            const tabItem = document.createElement('div');
            tabItem.className = 'tab-item';
            // tabItem.title = tab.title; // Remove default browser tooltip
            tabItem.dataset.url = tab.url;
            tabItem.dataset.tabId = tab.id;
            
            // Make Draggable
            tabItem.draggable = true;
            tabItem.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', tab.id);
                tabItem.classList.add('dragging');
                // Hide tooltip while dragging
                globalTooltip.style.display = 'none';
                closeContextMenu(); // Close any open menu
            });
            
            tabItem.addEventListener('dragend', () => {
                tabItem.classList.remove('dragging');
            });

            // Context Menu (Right Click)
            tabItem.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showContextMenu(e.clientX, e.clientY, tab.id, win.id);
            });
            
            // Check for duplicates
            if (urlCounts.get(tab.url) > 1) {
                tabItem.classList.add('duplicate');
            }

            // Favicon
            const img = document.createElement('img');
            img.src = tab.favIconUrl || 'images/icon16.png'; // Fallback
            img.onerror = () => { img.src = 'images/icon16.png'; }; // Handle broken favicons
            tabItem.appendChild(img);

            // Click to switch to tab
            tabItem.addEventListener('click', () => {
                chrome.tabs.update(tab.id, { active: true });
                chrome.windows.update(win.id, { focused: true });
            });

            // Hover effects
            attachTooltip(tabItem, tab.title, windowCard, () => {
                if (urlCounts.get(tab.url) > 1) {
                    highlightDuplicates(tab.url, true);
                }
            }, () => {
                if (urlCounts.get(tab.url) > 1) {
                    highlightDuplicates(tab.url, false);
                }
            });

            windowCard.appendChild(tabItem);
        });

        // Actions - Appended as icons at the end of the flex container
        
        // Save Button
        const saveBtn = document.createElement('button');
        saveBtn.className = 'action-btn save';
        // saveBtn.title = 'Save Group'; // Removed title
        saveBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`;
        saveBtn.addEventListener('click', () => openSaveModal(win));
        attachTooltip(saveBtn, 'Save Group', windowCard);
        windowCard.appendChild(saveBtn);

        // Sync Button (Save +)
        const syncBtn = document.createElement('button');
        syncBtn.className = 'action-btn sync';
        // syncBtn.title = 'Sync to Folder'; // Removed title
        // Folder icon with plus
        syncBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>`;
        syncBtn.addEventListener('click', async () => {
            const settings = await chrome.storage.sync.get(['parentFolder']);
            const parentPath = settings.parentFolder || 'Bookmarks bar/';
            const folders = await getSubfolders(parentPath);
            
            // Find best match to highlight
            const { folder: bestMatch, matchCount } = await findBestMatchFolder(win.tabs, folders);
            const bestMatchId = bestMatch ? bestMatch.id : null;
            const totalTabs = win.tabs.length;

            showFolderSelectionModal(folders, async (folderId) => {
                // Sync Logic
                try {
                    const existingBookmarks = await chrome.bookmarks.getChildren(folderId);
                    const existingUrls = new Set(existingBookmarks.map(b => b.url));
                    
                    let addedCount = 0;
                    for (const tab of win.tabs) {
                        if (!existingUrls.has(tab.url)) {
                            await chrome.bookmarks.create({
                                parentId: folderId,
                                title: tab.title,
                                url: tab.url
                            });
                            addedCount++;
                        }
                    }
                    
                    // Visual feedback
                    const originalHtml = syncBtn.innerHTML;
                    syncBtn.innerHTML = `<span style="font-size:10px; font-weight:bold;">+${addedCount}</span>`;
                    setTimeout(() => {
                        syncBtn.innerHTML = originalHtml;
                    }, 1500);
                    
                } catch (err) {
                    console.error('Sync failed:', err);
                    alert('Sync failed: ' + err.message);
                }
            }, 'Sync to Folder', bestMatchId, matchCount, totalTabs);
        });
        attachTooltip(syncBtn, 'Sync to Folder', windowCard);
        windowCard.appendChild(syncBtn);

        // Close Button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'action-btn close';
        // closeBtn.title = 'Close Window'; // Removed title
        closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        closeBtn.addEventListener('click', async () => {
            // Smart Check Logic
            const settings = await chrome.storage.sync.get(['parentFolder']);
            const parentPath = settings.parentFolder || 'Bookmarks bar/';
            
            let message = 'Are you sure you want to close this window?';
            
            try {
                const subfolders = await getSubfolders(parentPath);
                const { folder: bestMatch, matchCount: maxMatches, fullySaved } = await findBestMatchFolder(win.tabs, subfolders);
                const winTabCount = win.tabs.length;

                if (!fullySaved) {
                    if (bestMatch && maxMatches > 0) {
                        const missingCount = winTabCount - maxMatches;
                        message = `Folder "${bestMatch.title}" contains ${maxMatches} of ${winTabCount} tabs.\n\nIt is missing ${missingCount} tabs.\n\nAre you sure you want to close without saving properly?`;
                    } else {
                        message = `None of the tabs in this window are saved in any folder under "${parentPath}".\n\nIt would be nice to save first.\n\nAre you sure you want to close?`;
                    }
                } else {
                    message = 'All tabs are safely saved. Close window?';
                }

            } catch (err) {
                console.error('Smart check failed:', err);
                // Fallback to generic message
            }

            const confirmed = await showConfirmModal(message);
            if (confirmed) {
                chrome.windows.remove(win.id);
                windowCard.remove();
            }
        });
        attachTooltip(closeBtn, 'Close Window', windowCard);
        windowCard.appendChild(closeBtn);

        windowsContainer.appendChild(windowCard);
    });
}

    // Close context menu on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.context-menu')) {
            closeContextMenu();
        }
    });



// Context Menu Logic
let activeContextMenu = null;

function closeContextMenu() {
    if (activeContextMenu) {
        activeContextMenu.remove();
        activeContextMenu = null;
    }
}

function showContextMenu(x, y, tabId, windowId) {
    closeContextMenu();

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    // Add to Folder Button (+)
    const addBtn = document.createElement('button');
    addBtn.className = 'context-menu-btn add';
    // addBtn.title = 'Add to Folder'; // Removed title
    addBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`;
    addBtn.addEventListener('click', async () => {
        closeContextMenu(); // Close menu first
        
        const settings = await chrome.storage.sync.get(['parentFolder']);
        const parentPath = settings.parentFolder || 'Bookmarks bar/';
        const folders = await getSubfolders(parentPath);
        
        // We need the tab details. We have tabId.
        const tab = await chrome.tabs.get(tabId);
        
        showFolderSelectionModal(folders, async (folderId) => {
            try {
                await chrome.bookmarks.create({
                    parentId: folderId,
                    title: tab.title,
                    url: tab.url
                });
                // No visual feedback needed for context menu action usually, or maybe a small toast?
                // For now, silent success is fine.
            } catch (err) {
                console.error('Failed to bookmark tab:', err);
                alert('Failed to bookmark: ' + err.message);
            }
        }, 'Bookmark Tab');
    });
    attachTooltip(addBtn, 'Add to Folder');
    menu.appendChild(addBtn);

    // Delete Button (Trash)
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'context-menu-btn delete';
    // deleteBtn.title = 'Close Tab'; // Removed title
    deleteBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
    deleteBtn.addEventListener('click', async () => {
        try {
            await chrome.tabs.remove(tabId);
            closeContextMenu();
            renderWindows(); // Refresh UI
        } catch (err) {
            console.error('Failed to close tab:', err);
        }
    });
    attachTooltip(deleteBtn, 'Close Tab');
    menu.appendChild(deleteBtn);

    // Dismiss Button (X)
    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'context-menu-btn';
    // dismissBtn.title = 'Dismiss'; // Removed title
    dismissBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    dismissBtn.addEventListener('click', () => {
        closeContextMenu();
    });
    attachTooltip(dismissBtn, 'Dismiss');
    menu.appendChild(dismissBtn);
    document.body.appendChild(menu);
    activeContextMenu = menu;
    
    // Adjust position if off-screen
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        menu.style.left = `${window.innerWidth - rect.width - 4}px`;
    }
    if (rect.bottom > window.innerHeight) {
        menu.style.top = `${window.innerHeight - rect.height - 4}px`;
    }
}

function createPlaceholderWindow() {
    const windowsContainer = document.getElementById('windows-container');
    
    // Check if placeholder already exists
    if (document.querySelector('.window-card.placeholder')) return;

    const placeholderCard = document.createElement('div');
    placeholderCard.className = 'window-card placeholder';
    placeholderCard.style.borderStyle = 'dashed';
    placeholderCard.style.opacity = '0.7';
    placeholderCard.style.minHeight = '100px';
    placeholderCard.style.display = 'flex';
    placeholderCard.style.alignItems = 'center';
    placeholderCard.style.justifyContent = 'center';
    placeholderCard.innerHTML = '<span style="color: var(--text-secondary); font-size: 12px;">Drop tab here to create window</span>';

    // Drag and Drop Handlers
    placeholderCard.addEventListener('dragover', (e) => {
        e.preventDefault();
        placeholderCard.classList.add('drag-over');
    });

    placeholderCard.addEventListener('dragleave', () => {
        placeholderCard.classList.remove('drag-over');
    });

    placeholderCard.addEventListener('drop', async (e) => {
        e.preventDefault();
        
        const tabId = parseInt(e.dataTransfer.getData('text/plain'));
        
        if (tabId) {
            try {
                // Create new window with the dropped tab
                await chrome.windows.create({ tabId: tabId, focused: true });
                // Refresh UI
                renderWindows();
            } catch (err) {
                console.error('Failed to create window with tab:', err);
            }
        }
    });

    // Insert at the beginning
    windowsContainer.prepend(placeholderCard);
}

function highlightDuplicates(url, active) {
    const allTabs = document.querySelectorAll('.tab-item');
    allTabs.forEach(tab => {
        if (tab.dataset.url === url) {
            if (active) {
                tab.classList.add('duplicate-active');
            } else {
                tab.classList.remove('duplicate-active');
            }
        }
    });
}

function filterTabs(query) {
    const windowCards = document.querySelectorAll('.window-card');
    windowCards.forEach(card => {
        const tabs = card.querySelectorAll('.tab-item');
        tabs.forEach(tab => {
            // Always ensure tab is visible
            tab.style.display = 'flex';
            
            if (!query) {
                tab.classList.remove('search-match');
                return;
            }

            const title = tab.title.toLowerCase();
            const url = tab.dataset.url.toLowerCase();
            if (title.includes(query) || url.includes(query)) {
                tab.classList.add('search-match');
            } else {
                tab.classList.remove('search-match');
            }
        });
        // Always show the card
        card.style.display = 'flex';
    });
}

// Modal Logic
async function openSaveModal(windowObj) {
    // Create modal if not exists
    let modal = document.getElementById('save-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'save-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3 class="modal-title">Save Window Tabs</h3>
                <input type="text" id="group-name-input" class="modal-input" placeholder="Enter group name (e.g. AI Training)">
                <div class="modal-checkbox-wrapper">
                    <input type="checkbox" id="close-window-checkbox">
                    <label for="close-window-checkbox">Close window after saving</label>
                </div>
                <div class="modal-actions">
                    <button id="cancel-save" class="btn btn-secondary">Cancel</button>
                    <button id="confirm-save" class="btn btn-primary">Save & Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Event listeners
        document.getElementById('cancel-save').addEventListener('click', () => {
            modal.classList.remove('visible');
        });
    }

    const input = document.getElementById('group-name-input');
    const checkbox = document.getElementById('close-window-checkbox');
    input.value = '';
    
    // Load saved preference for checkbox, default to false (unticked)
    const settings = await chrome.storage.sync.get(['closeWindowAfterSave']);
    checkbox.checked = settings.closeWindowAfterSave === true; // Strict check for true, otherwise false
    
    // Save preference on change
    checkbox.addEventListener('change', () => {
        chrome.storage.sync.set({ closeWindowAfterSave: checkbox.checked });
    });
    
    // Remove old listener to avoid duplicates
    const confirmBtn = document.getElementById('confirm-save');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', async () => {
        const name = input.value.trim();
        const shouldClose = checkbox.checked;
        if (!name) return;
        
        // Save preference again just in case (though change listener handles it)
        await chrome.storage.sync.set({ closeWindowAfterSave: shouldClose });
        
        await saveWindowTabs(windowObj, name, shouldClose);
        modal.classList.remove('visible');
        
        // Only refresh if window wasn't closed (card was already removed manually)
        if (!shouldClose) {
            renderWindows();
        }
    });

    modal.classList.add('visible');
    input.focus();
}

async function saveWindowTabs(windowObj, name, shouldClose = true) {
    // Get parent folder setting
    const settings = await chrome.storage.sync.get(['parentFolder']);
    const parentPath = settings.parentFolder || 'Bookmarks bar/_';
    
    // Parse parent path (simple implementation: assumes 'Bookmarks bar' is root, and '_' is a subfolder)
    // We need to find or create the folder structure.
    // For now, let's assume we just want to put it in 'Other bookmarks' or 'Bookmarks bar' -> '_'
    
    // 1. Find 'Bookmarks bar' ID dynamically
    // The structure is usually Root(0) -> [Bar, Other, Mobile]
    // We'll look for the first child of the root that is a folder.
    const tree = await chrome.bookmarks.getTree();
    let bookmarksBarId = '1'; // Default fallback
    
    if (tree && tree[0] && tree[0].children && tree[0].children.length > 0) {
        // Usually the first child is the Bookmarks Bar
        bookmarksBarId = tree[0].children[0].id;
    }

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '_');
    const folderName = `${dateStr}_${name}`;

    try {
        // Use the user's configured parent folder path, or default to "Bookmarks bar/"
        const targetPath = settings.parentFolder !== undefined ? settings.parentFolder : 'Bookmarks bar/';
        
        const parentId = await findOrCreateFolderByPath(targetPath);
        
        // Create the new group folder
        const groupFolder = await chrome.bookmarks.create({
            parentId: parentId,
            title: folderName
        });



        // Save all tabs
        for (const tab of windowObj.tabs) {
            await chrome.bookmarks.create({
                parentId: groupFolder.id,
                title: tab.title,
                url: tab.url
            });
        }

        // Close the window if requested
        if (shouldClose) {
            await chrome.windows.remove(windowObj.id);
            // Manually remove from DOM for immediate feedback
            const card = document.querySelector(`.window-card[data-window-id="${windowObj.id}"]`);
            if (card) {
                card.remove();
            }
        }
        
    } catch (err) {
        console.error('Error saving tabs:', err);
        alert('Failed to save tabs: ' + err.message);
    }
}

// Helper to find the best matching folder for a set of tabs
async function findBestMatchFolder(tabs, subfolders) {
    let bestMatch = null;
    let maxMatches = -1;
    let fullySaved = false;
    const winTabCount = tabs.length;

    for (const folder of subfolders) {
        const bookmarks = await chrome.bookmarks.getChildren(folder.id);
        const bookmarkUrls = new Set(bookmarks.map(b => b.url));
        
        let matchCount = 0;
        for (const tab of tabs) {
            if (bookmarkUrls.has(tab.url)) {
                matchCount++;
            }
        }

        if (matchCount === winTabCount) {
            fullySaved = true;
            return { folder, matchCount, fullySaved: true };
        }

        if (matchCount > maxMatches) {
            maxMatches = matchCount;
            bestMatch = folder;
        }
    }

    return { 
        folder: bestMatch, 
        matchCount: maxMatches, 
        fullySaved: false 
    };
}

// Helper to find or create a folder by absolute path (e.g. "Bookmarks bar/MyFolder")
async function findOrCreateFolderByPath(path) {
    // Split by slash, trim parts, but KEEP the last empty part if it exists (trailing slash)
    // "Bookmarks bar/" -> ["Bookmarks bar", ""]
    // "Bookmarks bar" -> ["Bookmarks bar"]
    // "Bookmarks bar//Folder" -> ["Bookmarks bar", "Folder"] (middle empty ignored)
    let parts = path.split('/').map(p => p.trim()).filter((p, i, arr) => p !== '' || i === arr.length - 1);
    
    // Special case: if input was just "" or "/", parts might be [""]
    // If it's just "", we usually mean root.
    if (parts.length === 1 && parts[0] === '') {
        parts = [];
    }

    const tree = await chrome.bookmarks.getTree();
    const rootChildren = tree[0].children; // Bookmarks bar, Other, Mobile

    if (parts.length === 0) {
        // Default to first root child (usually Bookmarks bar) if empty
        return rootChildren[0].id;
    }

    let parentId;
    let currentNodes;

    // Check if first part matches a root folder (case-insensitive)
    const firstPart = parts[0];
    const rootMatch = rootChildren.find(node => node.title.toLowerCase() === firstPart.toLowerCase());

    if (rootMatch) {
        parentId = rootMatch.id;
        currentNodes = await chrome.bookmarks.getChildren(parentId);
        parts.shift(); // Remove the root part from processing list
    } else {
        // Default to Bookmarks bar (usually id '1')
        // We find it by ID '1' or the first one.
        const bookmarksBar = rootChildren.find(n => n.id === '1') || rootChildren[0];
        parentId = bookmarksBar.id;
        currentNodes = await chrome.bookmarks.getChildren(parentId);
        // Do NOT shift parts; the first part is a subfolder of Bookmarks bar
    }

    for (const part of parts) {
        // Find a folder with this title
        let foundNode = currentNodes.find(node => node.title === part && !node.url);
        
        if (foundNode) {
            parentId = foundNode.id;
            // Fetch children for next iteration
            currentNodes = await chrome.bookmarks.getChildren(parentId);
        } else {
            // Create it
            const created = await chrome.bookmarks.create({
                parentId: parentId,
                title: part
            });
            parentId = created.id;
            currentNodes = []; // New folder has no children yet
        }
    }
    
    return parentId;
}

// Helper to get subfolders of a parent folder (by path)
async function getSubfolders(parentPath) {
    try {
        const parentId = await findOrCreateFolderByPath(parentPath);
        const children = await chrome.bookmarks.getChildren(parentId);
        return children.filter(node => !node.url); // Only folders
    } catch (err) {
        console.error('Error fetching subfolders:', err);
        return [];
    }
}

// Folder Selection Modal
function showFolderSelectionModal(folders, onSelect, title = 'Select Folder', bestMatchId = null, matchCount = 0, totalCount = 0) {
    // Create modal if not exists (reuse save-modal structure but different content)
    let modal = document.getElementById('folder-modal');
    if (modal) modal.remove(); // Re-create to ensure clean state

    modal = document.createElement('div');
    modal.id = 'folder-modal';
    modal.className = 'modal visible'; // Immediately visible
    
    // Determine if we have a valid match to highlight
    const hasMatch = bestMatchId && matchCount > 0;

    // Sort folders: If match found, put it first, then alphabetical. Otherwise natural order.
    let sortedFolders = [...folders];
    if (hasMatch) {
        sortedFolders.sort((a, b) => {
            if (a.id === bestMatchId) return -1;
            if (b.id === bestMatchId) return 1;
            return a.title.localeCompare(b.title);
        });
    }

    let folderListHtml = '';
    if (sortedFolders.length === 0) {
        folderListHtml = '<div class="no-folders">No subfolders found in parent path.</div>';
    } else {
        folderListHtml = '<div class="folder-list">';
        sortedFolders.forEach(folder => {
            const isBestMatch = hasMatch && folder.id === bestMatchId;
            const extraClass = isBestMatch ? 'best-match' : '';
            const badge = isBestMatch ? `<span class="match-badge">Best Match ${matchCount}/${totalCount}</span>` : '';
            
            // Parse Title
            let datePart = '';
            let namePart = folder.title;
            
            // Regex for YYYY_MM_DD_
            const dateRegex = /^(\d{4}_\d{2}_\d{2})_(.*)$/;
            const match = folder.title.match(dateRegex);
            
            if (match) {
                datePart = match[1];
                namePart = match[2];
            }

            folderListHtml += `
                <div class="folder-item ${extraClass}" data-id="${folder.id}">
                    <span class="folder-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                    </span>
                    <div class="folder-info">
                        <span class="folder-name">${namePart}</span>
                        ${datePart ? `<span class="folder-date">${datePart}</span>` : ''}
                    </div>
                    ${badge}
                </div>
            `;
        });
        folderListHtml += '</div>';
    }

    modal.innerHTML = `
        <div class="modal-content">
            <h3 class="modal-title">${title}</h3>
            ${folderListHtml}
            <div class="modal-actions">
                <button id="cancel-folder" class="btn btn-secondary">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Event listeners
    document.getElementById('cancel-folder').addEventListener('click', () => {
        modal.remove();
    });

    modal.querySelectorAll('.folder-item').forEach(item => {
        item.addEventListener('click', () => {
            const folderId = item.dataset.id;
            onSelect(folderId);
            modal.remove();
        });
    });
}

// Tooltip Helper
function attachTooltip(element, text, referenceElement, onEnter, onLeave) {
    // If no reference element provided, use the element itself
    const refEl = referenceElement || element;
    const globalTooltip = document.getElementById('global-tooltip');

    element.addEventListener('mouseenter', () => {
        // Callback
        if (onEnter) onEnter();

        // Reset content
        globalTooltip.innerHTML = '';
        const span = document.createElement('span');
        span.className = 'tooltip-text';
        span.textContent = text;
        globalTooltip.appendChild(span);
        
        globalTooltip.style.display = 'block';
        
        // Position logic
        const refRect = refEl.getBoundingClientRect();
        
        // Calculate position relative to document
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;
        const viewportWidth = window.innerWidth;

        // Allow natural width but max out at viewport width - padding
        globalTooltip.style.width = 'auto';
        globalTooltip.style.maxWidth = `${viewportWidth - 24}px`; // 24px total padding/margin safety
        
        // Check for overflow
        const textWidth = span.scrollWidth;
        const tooltipClientWidth = globalTooltip.clientWidth; 
        
        if (textWidth > tooltipClientWidth) {
            const offset = tooltipClientWidth - textWidth - 24; 
            span.style.setProperty('--scroll-offset', `${offset}px`);
            
            const speed = 150; 
            const duration = Math.abs(offset) / speed;
            span.style.setProperty('--marquee-duration', `${Math.max(duration, 0.5)}s`);
            
            span.classList.add('marquee');
        } else {
            span.classList.remove('marquee');
            span.style.removeProperty('--scroll-offset');
            span.style.removeProperty('--marquee-duration');
        }

        const tooltipRect = globalTooltip.getBoundingClientRect();
        
        // Calculate Top - Default to above
        let top = refRect.top + scrollY - tooltipRect.height - 4;
        
        // If it goes off top, put it below
        if (top < scrollY) {
             top = refRect.bottom + scrollY + 4;
        }

        // Calculate Left - align with ref, but clamp to viewport
        let left = refRect.left + scrollX;
        
        // Clamp right edge
        if (left + tooltipRect.width > viewportWidth - 12) {
            left = viewportWidth - tooltipRect.width - 12;
        }
        // Clamp left edge
        if (left < 12) {
            left = 12;
        }

        globalTooltip.style.top = `${top}px`;
        globalTooltip.style.left = `${left}px`;
    });

    element.addEventListener('mouseleave', () => {
        globalTooltip.style.display = 'none';
        if (onLeave) onLeave();
    });
}

// Custom Confirmation Modal
function showConfirmModal(message) {
    return new Promise((resolve) => {
        let modal = document.getElementById('confirm-modal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'confirm-modal';
        modal.className = 'modal visible';
        
        modal.innerHTML = `
            <div class="modal-content" style="width: 320px;">
                <h3 class="modal-title">Confirmation</h3>
                <div class="modal-message">${message}</div>
                <div class="modal-actions">
                    <button id="confirm-cancel" class="btn btn-secondary">Cancel</button>
                    <button id="confirm-ok" class="btn btn-primary">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const cleanup = () => {
            modal.remove();
        };

        document.getElementById('confirm-cancel').addEventListener('click', () => {
            cleanup();
            resolve(false);
        });

        document.getElementById('confirm-ok').addEventListener('click', () => {
            cleanup();
            resolve(true);
        });
    });
}
