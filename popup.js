const $ = (id) => document.getElementById(id);
let scannedFields = [];
let ratingOptions = [];

function setStatus(message, type = "") {
  const el = $("status");
  el.textContent = message;
  el.className = `status ${type}`;
}
function uniqueOptions(fields) {
  const values = new Map();
  fields.forEach(field => (field.options || []).forEach(opt => {
    if (opt.value !== "" && !values.has(opt.value)) values.set(opt.value, opt.text);
  }));
  return [...values].map(([value, text]) => ({value, text}));
}
function fillRatingSelect(select, options, preferredText) {
  select.innerHTML = "";
  options.forEach(opt => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.text;
    select.append(option);
  });
  const match = options.find(o => o.text.toLowerCase() === preferredText.toLowerCase());
  if (match) select.value = match.value;
}
function renderQuestions() {
  const host = $("questions");
  host.innerHTML = "";
  if (!scannedFields.length) {
    host.innerHTML = '<div class="empty">No eligible dropdowns found. Make sure the feedback form is visible and try scanning again.</div>';
    return;
  }
  scannedFields.forEach((field, index) => {
    const card = document.createElement("div");
    card.className = "question";
    const top = document.createElement("div");
    top.className = "question-top";
    const number = document.createElement("span");
    number.className = "number";
    number.textContent = String(index + 1);
    const textWrap = document.createElement("div");
    const label = document.createElement("div");
    label.className = "q-label";
    label.textContent = field.label || `Feedback dropdown ${index + 1}`;
    const meta = document.createElement("div");
    meta.className = "q-meta";
    meta.textContent = field.currentText ? `Current: ${field.currentText}` : "Currently unanswered";
    textWrap.append(label, meta);
    top.append(number, textWrap);
    const select = document.createElement("select");
    select.dataset.index = String(index);
    select.setAttribute("aria-label", `Rating for ${field.label || `question ${index + 1}`}`);
    const opts = field.options.filter(o => o.value !== "");
    opts.forEach(opt => {
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = opt.text;
      select.append(option);
    });
    const selected = opts.find(o => o.value === field.currentValue) || opts[0];
    if (selected) select.value = selected.value;
    card.append(top, select);
    host.append(card);
  });
}
async function getActiveTab() {
  const tabs = await chrome.tabs.query({active:true, currentWindow:true});
  if (!tabs[0]?.id) throw new Error("Could not identify the active tab.");
  return tabs[0];
}
async function scan() {
  $("scanBtn").disabled = true;
  $("refreshBtn").disabled = true;
  setStatus("Scanning visible page dropdowns…");
  try {
    const tab = await getActiveTab();
    const results = await chrome.scripting.executeScript({
      target: {tabId: tab.id},
      func: () => {
        const clean = s => (s || "").replace(/\\s+/g, " ").trim();
        const visible = el => {
          const r = el.getBoundingClientRect();
          const st = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none";
        };
        const labelFor = (el, index) => {
          const direct = el.labels ? [...el.labels].map(x => clean(x.innerText)).filter(Boolean).join(" ") : "";
          if (direct) return direct;
          const row = el.closest("tr, [role='row'], .form-group, .form-row, .question, td, .col");
          if (row) {
            const txt = clean(row.innerText).replace(clean(el.innerText), "").replace(clean(el.value), "");
            if (txt && txt.length < 280) return txt;
          }
          const prev = el.previousElementSibling;
          if (prev && clean(prev.innerText)) return clean(prev.innerText);
          const parent = el.parentElement;
          if (parent) {
            const txt = clean(parent.innerText).replace(clean(el.value), "");
            if (txt && txt.length < 180) return txt;
          }
          return `Feedback dropdown ${index + 1}`;
        };
        return [...document.querySelectorAll("select")]
          .filter(el => visible(el) && !el.disabled && el.options.length > 1)
          .map((el, index) => ({
            index,
            label: labelFor(el, index),
            currentValue: el.value,
            currentText: el.selectedOptions?.[0]?.textContent?.trim() || "",
            options: [...el.options].map(o => ({value:o.value, text:clean(o.textContent)})),
            fingerprint: `${labelFor(el,index)}|${[...el.options].map(o=>clean(o.textContent)).join("|")}`
          }));
      }
    });
    scannedFields = results?.[0]?.result || [];
    ratingOptions = uniqueOptions(scannedFields);
    if (!ratingOptions.length) {
      $("controls").classList.add("hidden");
      setStatus("No standard dropdowns were detected on this page. Try opening the actual feedback form.", "error");
      return;
    }
    fillRatingSelect($("sameRating"), ratingOptions, "Strongly Agree");
    $("count").textContent = `${scannedFields.length} fields`;
    $("controls").classList.remove("hidden");
    renderQuestions();
    setStatus(`Found ${scannedFields.length} dropdowns. Choose ratings and review them before applying.`, "success");
    await chrome.storage.local.set({lastMode:$("mode").value, lastOnlyEmpty:$("onlyEmpty").checked});
  } catch (error) {
    setStatus(error.message || "Could not scan this page. Try reloading the page.", "error");
  } finally {
    $("scanBtn").disabled = false;
    $("refreshBtn").disabled = false;
  }
}
async function applyRatings() {
  if (!scannedFields.length) return;
  const mode = $("mode").value;
  const onlyEmpty = $("onlyEmpty").checked;
  const individualValues = [...$("questions").querySelectorAll("select")].map(el => el.value);
  const sameValue = $("sameRating").value;
  const ratings = scannedFields.map((field, index) => ({
    index,
    fingerprint: field.fingerprint,
    value: mode === "same" ? sameValue : individualValues[index]
  }));
  $("applyBtn").disabled = true;
  setStatus("Applying your selected ratings…");
  try {
    const tab = await getActiveTab();
    const result = await chrome.scripting.executeScript({
      target: {tabId: tab.id},
      args: [ratings, onlyEmpty],
      func: (ratings, onlyEmpty) => {
        const clean = s => (s || "").replace(/\\s+/g, " ").trim();
        const visible = el => {
          const r = el.getBoundingClientRect();
          const st = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none";
        };
        const fields = [...document.querySelectorAll("select")]
          .filter(el => visible(el) && !el.disabled && el.options.length > 1);
        const labelFor = (el, index) => {
          const direct = el.labels ? [...el.labels].map(x => clean(x.innerText)).filter(Boolean).join(" ") : "";
          if (direct) return direct;
          const row = el.closest("tr, [role='row'], .form-group, .form-row, .question, td, .col");
          if (row) {
            const txt = clean(row.innerText).replace(clean(el.innerText), "").replace(clean(el.value), "");
            if (txt && txt.length < 280) return txt;
          }
          const prev = el.previousElementSibling;
          if (prev && clean(prev.innerText)) return clean(prev.innerText);
          const parent = el.parentElement;
          if (parent) {
            const txt = clean(parent.innerText).replace(clean(el.value), "");
            if (txt && txt.length < 180) return txt;
          }
          return `Feedback dropdown ${index + 1}`;
        };
        let updated = 0, skipped = 0, missing = 0;
        ratings.forEach(item => {
          const el = fields[item.index];
          if (!el) { missing++; return; }
          const currentFingerprint = `${labelFor(el,item.index)}|${[...el.options].map(o=>clean(o.textContent)).join("|")}`;
          if (currentFingerprint !== item.fingerprint) { missing++; return; }
          if (onlyEmpty && el.value !== "") { skipped++; return; }
          const option = [...el.options].find(o => o.value === item.value);
          if (!option) { missing++; return; }
          const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
          if (setter) setter.call(el, item.value); else el.value = item.value;
          el.dispatchEvent(new Event("input", {bubbles:true}));
          el.dispatchEvent(new Event("change", {bubbles:true}));
          updated++;
        });
        return {updated, skipped, missing};
      }
    });
    const stats = result?.[0]?.result || {updated:0,skipped:0,missing:0};
    setStatus(`Applied ${stats.updated}. Skipped ${stats.skipped} existing answers. ${stats.missing} could not be matched. Review the page before submitting.`, "success");
  } catch (error) {
    setStatus(error.message || "Could not apply ratings. Scan the page again.", "error");
  } finally {
    $("applyBtn").disabled = false;
  }
}
$("scanBtn").addEventListener("click", scan);
$("refreshBtn").addEventListener("click", scan);
$("applyBtn").addEventListener("click", applyRatings);
$("clearBtn").addEventListener("click", () => {
  scannedFields = [];
  $("controls").classList.add("hidden");
  setStatus("Scan results cleared.");
});
$("mode").addEventListener("change", () => {
  $("sameRatingWrap").style.display = $("mode").value === "same" ? "" : "none";
  $("questions").style.display = $("mode").value === "individual" ? "" : "none";
});
$("mode").dispatchEvent(new Event("change"));
(async () => {
  const saved = await chrome.storage.local.get(["lastMode","lastOnlyEmpty"]);
  if (saved.lastMode) $("mode").value = saved.lastMode;
  if (typeof saved.lastOnlyEmpty === "boolean") $("onlyEmpty").checked = saved.lastOnlyEmpty;
  $("mode").dispatchEvent(new Event("change"));
})();
