# UniFeedback Assistant

A privacy-friendly Chromium extension that helps students fill standard HTML feedback dropdowns using ratings they choose themselves.

## Supported browsers
- Google Chrome
- Microsoft Edge
- Brave
- Other Chromium-based browsers that support Manifest V3

The same extension package can be loaded in each browser. A Chrome Web Store listing is a separate publishing step; Edge Add-ons and other stores also require their own submission/review.

## Features
- Scans the active tab for visible, enabled standard `<select>` dropdowns.
- Same-rating mode: apply one chosen rating to all detected fields.
- Individual mode: choose a rating separately for each detected field.
- "Only fill unanswered boxes" is enabled by default.
- Re-scan after changing page sections or scrolling.
- Does not submit the feedback form.
- Does not collect passwords, student IDs, page contents, or analytics.
- Preferences remain in local extension storage only.

## Install for testing (Chrome / Edge / Brave)
1. Extract `UniFeedback-Assistant.zip`.
2. Open the browser's extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
3. Turn on **Developer mode**.
4. Choose **Load unpacked**.
5. Select the extracted `UniFeedback-Assistant` folder (the folder containing `manifest.json`).
6. Pin the extension if desired.
7. Open the feedback form in a tab, click the extension, then click **Scan this page**.

## Use
1. Open the actual feedback form.
2. Click the extension icon.
3. Click **Scan this page**.
4. Choose same-rating or individual mode.
5. Select your own ratings.
6. Keep "Only fill unanswered boxes" on unless you intentionally want to replace existing selections.
7. Click **Apply selected ratings**.
8. Review the university page and submit it yourself.

## Important limitations
- This first version supports native HTML `<select>` controls. Custom JavaScript dropdowns, radio buttons, iframes, shadow-DOM controls, and virtualized forms may need site-specific support.
- If the form is split into sections, scan each section after opening it. Only currently rendered dropdowns can be detected.
- Some portals may not save changes until you interact with each control or may use a framework-specific state model. Verify every answer on the page.
- The extension intentionally never clicks Submit, Save, or Finalize.
- Use the ratings that accurately reflect your own experience. Do not submit feedback you have not reviewed.

## Privacy and permissions
- `activeTab` grants temporary access to the tab only after the student invokes the extension.
- `scripting` injects the scan/apply functions into that active tab.
- `storage` stores only small UI preferences locally.
- No remote server, external API, tracking, or student login access is used.

## Publishing
To publish publicly:
1. Create developer/publisher accounts for the relevant extension stores.
2. Add store screenshots, privacy disclosures, support contact, and listing text.
3. Test on supported university pages and browsers.
4. Upload the ZIP to the Chrome Web Store and separately submit to Microsoft Edge Add-ons if desired.
5. Follow each store's current policies and review requirements.

This ZIP is a working developer-loadable project, not a store-approved listing.
