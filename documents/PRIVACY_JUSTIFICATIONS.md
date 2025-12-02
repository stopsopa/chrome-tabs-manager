# Privacy Justifications for Chrome Tabs Manager

## Single Purpose Description

Chrome Tabs Manager is a productivity extension designed to help users organize their browsing sessions. It provides a centralized dashboard to view, manage, and reorganize open tabs and windows. Key functionalities include identifying duplicate tabs to reduce clutter and saving entire windows of tabs to bookmarks for efficient session management.

## Detailed Permissions Justifications

### tabs Permission

**Usage**: Essential for the core functionality of managing tabs.

**Justification**: The extension needs to:

- List all open tabs to display them in the popup.
- Move tabs between windows (drag and drop).
- Close tabs upon user request.
- Highlight specific tabs (e.g., duplicates).
- Open new tabs from saved bookmarks.

**Data Handled**: The extension accesses tab titles and URLs to display them to the user and to identify duplicates. This data is processed locally and is not transmitted.

### windows Permission

**Usage**: Required to manage browser windows.

**Justification**: The extension organizes tabs by their parent window. It needs to:

- List all open windows.
- Create new windows.
- Close windows.
- Focus windows when a tab is clicked.

**Data Handled**: Window IDs and states (focused, etc.). No personal data.

### bookmarks Permission

**Usage**: Required for the "Save", "Sync", and "Override" features.

**Justification**: Users can save the state of a window (all its tabs) to their bookmarks. The extension needs to:

- Create new bookmark folders and items.
- Read existing bookmarks to check if tabs are already saved (for the "Sync" feature and "Unsaved" indicators).
- Remove bookmarks (for the "Override" feature).

**Data Handled**: Bookmark titles and URLs. This is done solely at the user's command to organize their data.

### storage Permission

**Usage**: Stores user preferences.

**Justification**: The extension saves:

- The preferred parent folder path for saving bookmarks.
- The size of the popup window (for a consistent user experience).
- "Don't show again" preferences for confirmation modals.

**Data Handled**: Only configuration settings. No personal browsing data.

### favicon Permission

**Usage**: Displaying website icons.

**Justification**: To make the tab list recognizable and user-friendly, the extension displays the favicon of each open tab next to its title.

**Data Handled**: The extension requests the favicon image for the URLs of open tabs.

## Data Usage Compliance

### Chrome Web Store Policy Compliance

**No Data Collection**: Chrome Tabs Manager does not collect, store, or transmit:

- Personal information.
- Browsing history (other than what is displayed momentarily in the popup).
- Analytics or usage statistics.

**Local Processing**: All logic, including duplicate detection and bookmark management, is executed locally within the browser.

**User Control**:

- The extension only acts when the user interacts with it (e.g., clicking "Save", dragging a tab).
- Users have full control over where bookmarks are saved.

### Privacy-First Architecture

**Minimal Data Principle**: The extension only requests permissions that are absolutely necessary for its stated features (managing tabs and bookmarks).

**Transparency**: The source code is open and available for inspection. The extension does not make any external network requests.
