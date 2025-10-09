// script.js - client-only repository viewer (HTML docs)
// NOTE: This is client-side only. Do not store extremely-highly-sensitive content here without server controls.

async function loadJSON(path) {
  const res = await fetch(path, {cache: "no-store"});
  if (!res.ok) throw new Error(`${path} fetch failed: ${res.status}`);
  return await res.json();
}

// DOM refs
const accessBtn = document.getElementById("accessBtn");
const helpBtn = document.getElementById("helpBtn");
const logoutBtn = document.getElementById("logoutBtn");
const backBtn = document.getElementById("backBtn");
const closeHelp = document.getElementById("closeHelp");
const serviceInput = document.getElementById("serviceNumber");
const errorEl = document.getElementById("error");
const loginSection = document.getElementById("login-section");
const repoSection = document.getElementById("repo-section");
const viewerSection = document.getElementById("viewer-section");
const snDisplay = document.getElementById("snDisplay");
const docList = document.getElementById("docList");
const docContainer = document.getElementById("docContainer");
const docTitle = document.getElementById("docTitle");
const helpModal = document.getElementById("helpModal");

// State
let ALLOWED = [];
let DOCUMENTS = [];
let currentSN = null;

async function init() {
  try {
    ALLOWED = await loadJSON("allowed.json");
  } catch (e) {
    console.error("allowed.json load error:", e);
    // fallback to empty
    ALLOWED = [];
  }

  try {
    DOCUMENTS = await loadJSON("documents.json");
  } catch (e) {
    console.error("documents.json load error:", e);
    DOCUMENTS = [];
  }
}
init();

// helpers
function showError(msg) {
  errorEl.textContent = msg;
  setTimeout(() => { errorEl.textContent = ""; }, 3500);
}

function showRepo(sn) {
  loginSection.style.display = "none";
  viewerSection.style.display = "none";
  repoSection.style.display = "block";
  snDisplay.textContent = sn;
  buildDocList();
}

function buildDocList() {
  docList.innerHTML = "";
  if (!Array.isArray(DOCUMENTS) || DOCUMENTS.length === 0) {
    docList.innerHTML = "<li>No documents available.</li>";
    return;
  }

  DOCUMENTS.forEach(doc => {
    const li = document.createElement("li");
    li.className = "doc-item";

    const meta = document.createElement("div");
    meta.className = "doc-meta";
    const h = document.createElement("h4");
    h.textContent = doc.title;
    const p = document.createElement("p");
    p.textContent = doc.description || "";
    meta.appendChild(h);
    meta.appendChild(p);

    const openBtn = document.createElement("button");
    openBtn.textContent = "Open";
    openBtn.addEventListener("click", () => openDoc(doc));

    li.appendChild(meta);
    li.appendChild(openBtn);
    docList.appendChild(li);
  });
}

async function openDoc(doc) {
  // doc.filename must be a safe local path like "history-of-1cdo.html"
  docTitle.textContent = doc.title || doc.filename;
  repoSection.style.display = "none";
  viewerSection.style.display = "flex";
  docContainer.innerHTML = "<p>Loading document…</p>";

  try {
    // fetch the HTML doc, then inject directly
    const res = await fetch(`docs/${doc.filename}`, {cache: "no-store"});
    if (!res.ok) {
      docContainer.innerHTML = `<p style="color: #900">Failed to load document (${res.status})</p>`;
      return;
    }
    // we assume these documents are authored HTML fragments or full HTML files;
    // if full HTML, we extract the body contents; if fragment, we inject as-is.
    let text = await res.text();

    // If the document is a full HTML page, try to extract <body> contents
    const bodyMatch = text.match(/<body[^>]*>((.|[\n\r])*)<\/body>/im);
    if (bodyMatch && bodyMatch[1]) {
      text = bodyMatch[1];
    }

    // sanitize minimal: remove <script> tags to avoid execution
    text = text.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');

    // insert the HTML
    docContainer.innerHTML = text;

    // optional: display watermark with service number to discourage screenshot sharing
    if (currentSN) {
      const wm = document.createElement("div");
      wm.style.position = "fixed";
      wm.style.right = "8px";
      wm.style.bottom = "8px";
      wm.style.opacity = "0.12";
      wm.style.fontSize = "12px";
      wm.style.pointerEvents = "none";
      wm.style.color = "#000";
      wm.textContent = `Service#: ${currentSN}`;
      // append inside docContainer so watermark visible when printing disabled
      docContainer.appendChild(wm);
    }

    // ensure focus for keyboard and accessibility
    docContainer.focus();
  } catch (e) {
    console.error(e);
    docContainer.innerHTML = `<p style="color:#900">Error loading document.</p>`;
  }
}

// events
accessBtn.addEventListener("click", () => {
  const sn = serviceInput.value.trim();
  if (!sn) { showError("Please enter service number."); return; }
  // If you want hashed comparison, compare hashes here instead of raw values
  if (Array.isArray(ALLOWED) && ALLOWED.includes(sn)) {
    currentSN = sn;
    showRepo(sn);
  } else {
    showError("Invalid service number.");
  }
});

helpBtn.addEventListener("click", () => {
  helpModal.style.display = "flex";
  helpModal.setAttribute("aria-hidden","false");
});

document.getElementById("closeHelp")?.addEventListener("click", () => {
  helpModal.style.display = "none";
  helpModal.setAttribute("aria-hidden","true");
});

backBtn.addEventListener("click", () => {
  viewerSection.style.display = "none";
  repoSection.style.display = "block";
  docContainer.innerHTML = "";
  docTitle.textContent = "";
});

logoutBtn.addEventListener("click", () => {
  // clear state
  currentSN = null;
  serviceInput.value = "";
  repoSection.style.display = "none";
  viewerSection.style.display = "none";
  loginSection.style.display = "block";
});

// accessibility: allow Enter key to submit
serviceInput.addEventListener("keyup", (e) => {
  if (e.key === "Enter") accessBtn.click();
});

// disable right-click inside doc container (mild deterrent)
docContainer.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});
