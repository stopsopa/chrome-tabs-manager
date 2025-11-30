document.addEventListener("DOMContentLoaded", () => {
  const parentFolderInput = document.getElementById("parent-folder");
  const saveButton = document.getElementById("save-settings");

  // Load saved settings
  chrome.storage.sync.get(["parentFolder"], (result) => {
    parentFolderInput.value = result.parentFolder || "Bookmarks bar/_";
  });

  // Save settings
  saveButton.addEventListener("click", () => {
    const parentFolder = parentFolderInput.value;
    chrome.storage.sync.set({ parentFolder }, () => {
      // Visual feedback
      const originalText = saveButton.textContent;
      saveButton.textContent = "Saved!";
      saveButton.style.backgroundColor = "var(--success-color)";
      setTimeout(() => {
        saveButton.textContent = originalText;
        saveButton.style.backgroundColor = "";
      }, 1500);
    });
  });
});
