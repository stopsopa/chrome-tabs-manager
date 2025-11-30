document.addEventListener('DOMContentLoaded', async () => {
    const windowsContainer = document.getElementById('windows-container');
    const searchInput = document.getElementById('search-input');
    const openSettingsBtn = document.getElementById('open-settings');

    // Open settings
    openSettingsBtn.addEventListener('click', () => {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options.html'));
        }
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

        win.tabs.forEach(tab => {
            const tabItem = document.createElement('div');
            tabItem.className = 'tab-item';
            // tabItem.title = tab.title; // Remove default browser tooltip
            tabItem.dataset.url = tab.url;
            tabItem.dataset.tabId = tab.id;
            
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
            tabItem.addEventListener('mouseenter', () => {
                // Reset content
                globalTooltip.innerHTML = '';
                const span = document.createElement('span');
                span.className = 'tooltip-text';
                span.textContent = tab.title;
                globalTooltip.appendChild(span);
                
                globalTooltip.style.display = 'block';
                
                // Position above the window card
                const card = windowCard;
                const cardRect = card.getBoundingClientRect();
                
                // Calculate position relative to document
                const scrollY = window.scrollY;
                const scrollX = window.scrollX;
                const viewportWidth = window.innerWidth;

                // Allow natural width but max out at viewport width - padding
                globalTooltip.style.width = 'auto';
                globalTooltip.style.maxWidth = `${viewportWidth - 24}px`; // 24px total padding/margin safety
                
                // Check for overflow
                // We need to check if the text span is wider than the computed content box of the tooltip
                const textWidth = span.scrollWidth;
                const tooltipClientWidth = globalTooltip.clientWidth; // This will be <= max-width
                
                // If text is wider than the container (which is capped at max-width), marquee it
                // We compare with a small buffer to avoid subpixel issues
                if (textWidth > tooltipClientWidth) {
                    const offset = tooltipClientWidth - textWidth - 24; // Extra buffer for marquee to scroll fully
                    span.style.setProperty('--scroll-offset', `${offset}px`);
                    
                    // Calculate duration based on speed (pixels per second)
                    // "Edge of speed humans can read" -> let's try ~150px/s
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
                
                // Calculate Top
                let top = cardRect.top + scrollY - tooltipRect.height - 4;
                
                // Calculate Left - align with card, but clamp to viewport
                let left = cardRect.left + scrollX;
                
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

                if (urlCounts.get(tab.url) > 1) {
                    highlightDuplicates(tab.url, true);
                }
            });

            tabItem.addEventListener('mouseleave', () => {
                globalTooltip.style.display = 'none';
                
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
        saveBtn.title = 'Save Group';
        saveBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`;
        saveBtn.addEventListener('click', () => openSaveModal(win));
        windowCard.appendChild(saveBtn);

        // Close Button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'action-btn close';
        closeBtn.title = 'Close Window';
        closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        closeBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to close this window?')) {
                chrome.windows.remove(win.id);
                windowCard.remove();
            }
        });
        windowCard.appendChild(closeBtn);

        windowsContainer.appendChild(windowCard);
    });
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
function openSaveModal(windowObj) {
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
    input.value = '';
    
    // Remove old listener to avoid duplicates
    const confirmBtn = document.getElementById('confirm-save');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', async () => {
        const name = input.value.trim();
        if (!name) return;
        
        await saveWindowTabs(windowObj, name);
        modal.classList.remove('visible');
        renderWindows(); // Refresh
    });

    modal.classList.add('visible');
    input.focus();
}

async function saveWindowTabs(windowObj, name) {
    // Get parent folder setting
    const settings = await chrome.storage.sync.get(['parentFolder']);
    const parentPath = settings.parentFolder || 'Bookmarks bar/_';
    
    // Parse parent path (simple implementation: assumes 'Bookmarks bar' is root, and '_' is a subfolder)
    // We need to find or create the folder structure.
    // For now, let's assume we just want to put it in 'Other bookmarks' or 'Bookmarks bar' -> '_'
    
    // 1. Find 'Bookmarks bar' (id '1') or 'Other bookmarks' (id '2')
    // Let's try to find the folder specified.
    
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '_');
    const folderName = `${dateStr}_${name}`;

    try {
        // Find or create the parent folder "_"
        // We'll search for it.
        const searchResults = await chrome.bookmarks.search({ title: '_' });
        let parentId;
        
        if (searchResults.length > 0) {
            parentId = searchResults[0].id;
        } else {
            // Create it under Bookmarks Bar (id '1')
            const created = await chrome.bookmarks.create({ parentId: '1', title: '_' });
            parentId = created.id;
        }

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

        // Close the window
        await chrome.windows.remove(windowObj.id);
        
    } catch (err) {
        console.error('Error saving tabs:', err);
        alert('Failed to save tabs: ' + err.message);
    }
}
