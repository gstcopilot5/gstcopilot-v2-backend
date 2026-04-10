// GSTCopilot V2 - Content Script
// Auto-extracts GSTINs from any webpage

function extractGSTINs() {
  const gstinRegex = /[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}/g;
    const text = document.body.innerText;
      const matches = text.match(gstinRegex);
        return matches ? [...new Set(matches)] : [];
        }

        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
          if (request.action === 'extractGSTINs') {
              sendResponse({gstins: extractGSTINs()});
                }
                });