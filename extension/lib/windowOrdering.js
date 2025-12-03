/**
 * Window Ordering Logic
 * 
 * This library provides functionality to reorder Chrome windows based on the similarity
 * of their tab URLs to a previously stored state.
 */

let freshMock = null;

/**
 * Mocks the fresh nested array for testing purposes.
 * @param {string[][]} mock - The mock data to return from generateFreshNestedArray
 */
function mockGenerateFreshNestedArray(mock) {
    freshMock = mock;
}

/**
 * Generates a nested array of URLs from the current Chrome windows.
 * Returns [[url, url], [url, url, url], ...]
 * 
 * @returns {Promise<string[][]>}
 */
async function generateFreshNestedArray() {
    if (freshMock) {
        return freshMock;
    }

    if (typeof chrome === 'undefined' || !chrome.windows) {
        console.warn('chrome.windows API not available, returning empty array');
        return [];
    }

    const windows = await chrome.windows.getAll({ populate: true });
    return windows.map(win => win.tabs.map(tab => tab.url));
}

/**
 * Calculates the Levenshtein distance between two arrays of strings (URLs).
 * Lower distance means higher similarity.
 * 
 * @param {string[]} arr1 
 * @param {string[]} arr2 
 * @returns {number}
 */
function levenshteinDistance(arr1, arr2) {
    const matrix = [];

    // Increment along the first column of each row
    for (let i = 0; i <= arr2.length; i++) {
        matrix[i] = [i];
    }

    // Increment each column in the first row
    for (let j = 0; j <= arr1.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= arr2.length; i++) {
        for (let j = 1; j <= arr1.length; j++) {
            if (arr2[i - 1] === arr1[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1  // deletion
                    )
                );
            }
        }
    }

    return matrix[arr2.length][arr1.length];
}

/**
 * Generates a new ordered array of window contents based on similarity to stored state.
 * 
 * @param {string[][]} fresh - The current state [[url...], [url...]]
 * @param {string[][]} stored - The stored state from localStorage [[url...], [url...]]
 * @returns {string[][]} - The reordered fresh array
 */
function generateNewOrder(fresh, stored) {
    if (!stored || !Array.isArray(stored) || stored.length === 0) {
        return fresh;
    }

    // Clone fresh to avoid mutating the input and to keep track of used windows
    // We wrap them in objects to keep track of original indices if needed, 
    // but here we just need to consume them.
    let availableFresh = [...fresh];
    const orderedOutput = [];

    // Iterate through stored windows to find best matches
    for (const storedWindow of stored) {
        if (availableFresh.length === 0) break;

        let bestMatchIndex = -1;
        let minDistance = Infinity;

        // Find the most similar window in availableFresh
        for (let i = 0; i < availableFresh.length; i++) {
            const freshWindow = availableFresh[i];
            const distance = levenshteinDistance(storedWindow, freshWindow);

            // We want the lowest distance
            if (distance < minDistance) {
                minDistance = distance;
                bestMatchIndex = i;
            }
        }

        // If we found a match (we always should if availableFresh is not empty)
        if (bestMatchIndex !== -1) {
            // Add to output
            orderedOutput.push(availableFresh[bestMatchIndex]);
            // Remove from available
            availableFresh.splice(bestMatchIndex, 1);
        }
    }

    // Append any remaining fresh windows that weren't matched to a stored window
    // (e.g. new windows opened since last save)
    if (availableFresh.length > 0) {
        orderedOutput.push(...availableFresh);
    }

    return orderedOutput;
}

// --- Exports for Node.js / Testing ---
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        mockGenerateFreshNestedArray,
        generateFreshNestedArray,
        levenshteinDistance,
        generateNewOrder
    };
}


