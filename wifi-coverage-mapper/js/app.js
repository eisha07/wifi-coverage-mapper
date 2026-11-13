const STORAGE_KEY = "signalmap.reports.v1";
const HOUR = 60 * 60 * 1000;
const DUPLICATE_WINDOW_HOURS = 48;
const MAX_REPORT_AGE_DAYS = 30;

const LEVELS = [
  { id: "critical", label: "Critical", min: 70, heat: 4 },
  { id: "high", label: "High", min: 45, heat: 3 },
  { id: "medium", label: "Medium", min: 25, heat: 2 },
  { id: "low", label: "Low", min: 0, heat: 1 }
];

const DEFAULT_FILTERS = { query: "", building: "all", type: "all", status: "open", sort: "severity" };

const state = {
  reports: [],
  filters: { ...DEFAULT_FILTERS },
  duplicate: null,
  storageAvailable: true
};

const $ = (selector) => document.querySelector(selector);

const els = {
  stats: $("#stats"),
  map: $("#campus-map"),
  mapStatus: $("#map-status"),
  form: $("#report-form"),
  building: $("#building"),
  floor: $("#floor"),
  spot: $("#spot"),
  bars: $("#bars"),
  barsOutput: $("#bars-output"),
  speed: $("#speed"),
  observed: $("#observed"),
  note: $("#note"),
  noteCount: $("#note-count"),
  severityPreview: $("#severity-preview"),
  duplicateAlert: $("#duplicate-alert"),
  duplicateText: $("#duplicate-text"),
  confirmDuplicate: $("#confirm-duplicate"),
  formMessage: $("#form-message"),
  filterForm: $("#filter-form"),
  search: $("#search"),
  filterBuilding: $("#filter-building"),
  filterType: $("#filter-type"),
  filterStatus: $("#filter-status"),
  sort: $("#sort"),
  resultCount: $("#result-count"),
  list: $("#issue-list"),
  empty: $("#empty-state"),
  emptyTitle: $("#empty-title"),
  emptyText: $("#empty-text"),
  emptyAction: $("#empty-action"),
  resetData: $("#reset-data"),
  clearData: $("#clear-data"),
  template: $("#issue-template")
};

function seedReports() {
  const now = Date.now();
  return SAMPLE_REPORTS.map(({ hoursAgo, ...report }) => ({
    ...report,
    observedAt: new Date(now - hoursAgo * HOUR).toISOString()
  }));
}

function isValidReport(report) {
  return (
    report &&
    typeof report.id === "string" &&
    BUILDINGS.some((b) => b.id === report.building) &&
    report.type in ISSUE_TYPES &&
    Number.isFinite(report.speed) &&
    !Number.isNaN(Date.parse(report.observedAt))
  );
}

function loadReports() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return seedReports();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidReport) : seedReports();
  } catch {
    state.storageAvailable = false;
    return seedReports();
  }
}

function saveReports() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.reports));
    state.storageAvailable = true;
  } catch {
    state.storageAvailable = false;
  }
}

function createId() {
  if (window.crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildingName(id) {
  const building = BUILDINGS.find((b) => b.id === id);
  return building ? building.name : "Unknown building";
}

function floorLabel(floor) {
  if (floor === 0) return "Ground floor";
  if (floor < 0) return "Basement";
  return `Floor ${floor}`;
}

function normaliseSpot(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function calculateSeverity({ type, bars, speed, confirms = 0 }) {
  const typeWeight = ISSUE_TYPES[type] ? ISSUE_TYPES[type].weight : 0;
  const barPenalty = (4 - bars) * 10;
  let speedPenalty = 0;
  if (speed < 1) speedPenalty = 20;
  else if (speed < 5) speedPenalty = 12;
  else if (speed < 15) speedPenalty = 5;
  const crowdBonus = Math.min(confirms * 5, 20);
  return Math.min(100, typeWeight + barPenalty + speedPenalty + crowdBonus);
}

function severityLevel(score) {
  return LEVELS.find((level) => score >= level.min);
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

function toLocalInputValue(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function setFormMessage(text, tone = "info") {
  els.formMessage.textContent = text;
  els.formMessage.dataset.tone = tone;
}

function fillSelect(select, entries) {
  entries.forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
  });
}

function populateOptions() {
  const buildingEntries = BUILDINGS.map((b) => [b.id, b.name]);
  fillSelect(els.building, buildingEntries);
  fillSelect(els.filterBuilding, buildingEntries);
  fillSelect(els.filterType, Object.entries(ISSUE_TYPES).map(([id, t]) => [id, t.label]));
}

function prepareDateField() {
  const now = new Date();
  els.observed.max = toLocalInputValue(now);
  els.observed.min = toLocalInputValue(new Date(now.getTime() - MAX_REPORT_AGE_DAYS * 24 * HOUR));
  if (!els.observed.value) els.observed.value = toLocalInputValue(now);
}

function selectedType() {
  const checked = els.form.querySelector('input[name="type"]:checked');
  return checked ? checked.value : "";
}

function applyCustomRules() {
  const spotText = els.spot.value.trim();
  els.spot.setCustomValidity(
    els.spot.value.length > 0 && spotText.length < 2
      ? "Enter at least 2 visible characters, for example “Lab 3”."
      : ""
  );

  let observedMessage = "";
  const observedTime = Date.parse(els.observed.value);
  if (els.observed.value && Number.isNaN(observedTime)) {
    observedMessage = "Enter a valid date and time.";
  } else if (observedTime > Date.now() + 5 * 60000) {
    observedMessage = "The time can't be in the future.";
  } else if (observedTime < Date.now() - MAX_REPORT_AGE_DAYS * 24 * HOUR) {
    observedMessage = `Only report problems from the last ${MAX_REPORT_AGE_DAYS} days.`;
  }
  els.observed.setCustomValidity(observedMessage);

  const speed = els.speed.valueAsNumber;
  els.speed.setCustomValidity(
    selectedType() === "no-signal" && speed > 0
      ? "“No signal” means 0 Mbps. Choose a different issue type if some data loaded."
      : ""
  );
}

function findDuplicate(building, floor, spot) {
  const key = normaliseSpot(spot);
  if (!building || !Number.isFinite(floor) || key.length < 2) return null;
  const cutoff = Date.now() - DUPLICATE_WINDOW_HOURS * HOUR;
  return (
    state.reports.find(
      (r) =>
        r.status === "open" &&
        r.building === building &&
        r.floor === floor &&
        normaliseSpot(r.spot) === key &&
        new Date(r.observedAt).getTime() >= cutoff
    ) || null
  );
}

function updateDuplicateAlert() {
  const duplicate = findDuplicate(els.building.value, els.floor.valueAsNumber, els.spot.value);
  state.duplicate = duplicate;
  els.duplicateAlert.hidden = !duplicate;
  if (!duplicate) return;
  const people = duplicate.confirms + 1;
  els.duplicateText.textContent =
    `“${duplicate.spot}” on ${floorLabel(duplicate.floor).toLowerCase()} of ${buildingName(duplicate.building)} ` +
    `was already reported ${timeAgo(duplicate.observedAt)} as “${ISSUE_TYPES[duplicate.type].label}” ` +
    `(${people} ${people === 1 ? "person" : "people"} so far).`;
}

function updatePreview() {
  const bars = els.bars.valueAsNumber;
  els.barsOutput.value = `${bars} of 4 bars`;
  els.noteCount.textContent = `${els.note.value.length} / 280 characters`;

  const type = selectedType();
  const speed = els.speed.valueAsNumber;
  const preview = els.severityPreview;
  if (!type || !Number.isFinite(speed) || speed < 0) {
    preview.value = "Pick an issue type and speed";
    preview.dataset.level = "";
    return;
  }
  const score = calculateSeverity({ type, bars, speed });
  const level = severityLevel(score);
  preview.value = `${level.label} · ${score}`;
  preview.dataset.level = level.id;
}

function readForm() {
  const data = new FormData(els.form);
  return {
    id: createId(),
    building: data.get("building"),
    floor: Number(data.get("floor")),
    spot: String(data.get("spot")).trim().replace(/\s+/g, " "),
    type: data.get("type"),
    bars: Number(data.get("bars")),
    speed: Math.round(Number(data.get("speed")) * 10) / 10,
    observedAt: new Date(String(data.get("observed"))).toISOString(),
    device: data.get("device"),
    note: String(data.get("note")).trim(),
    reporter: String(data.get("reporter")).trim().toLowerCase(),
    status: "open",
    confirms: 0
  };
}

function handleSubmit(event) {
  event.preventDefault();
  applyCustomRules();
  if (!els.form.reportValidity()) {
    setFormMessage("Please fix the highlighted fields.", "error");
    return;
  }
  updateDuplicateAlert();
  if (state.duplicate) {
    setFormMessage("This spot already has an open report. Add your confirmation or change the location.", "error");
    els.confirmDuplicate.focus();
    return;
  }
  const report = readForm();
  state.reports.unshift(report);
  saveReports();
  els.form.reset();
  const level = severityLevel(calculateSeverity(report));
  setFormMessage(
    `Thanks! Report for ${report.spot} (${buildingName(report.building)}) added with ${level.label.toLowerCase()} severity.` +
      (state.storageAvailable ? "" : " Storage is blocked, so it will disappear when you close the page."),
    "success"
  );
  renderAll();
}

function confirmReport(id) {
  const report = state.reports.find((r) => r.id === id);
  if (!report || report.status !== "open") return null;
  report.confirms += 1;
  saveReports();
  return report;
}

function handleConfirmDuplicate() {
  if (!state.duplicate) return;
  const report = confirmReport(state.duplicate.id);
  els.form.reset();
  if (report) setFormMessage(`Added your confirmation to “${report.spot}”. It now has ${report.confirms + 1} reports.`, "success");
  renderAll();
}

function handleFormReset() {
  setTimeout(() => {
    els.observed.value = "";
    prepareDateField();
    [els.spot, els.observed, els.speed].forEach((input) => input.setCustomValidity(""));
    state.duplicate = null;
    els.duplicateAlert.hidden = true;
    updatePreview();
  });
}

function handleFormInput(event) {
  if (event.target.name !== "note") setFormMessage("");
  applyCustomRules();
  updatePreview();
  if (["building", "floor", "spot"].includes(event.target.name)) updateDuplicateAlert();
}

function readFilters() {
  state.filters = {
    query: els.search.value.trim().toLowerCase(),
    building: els.filterBuilding.value,
    type: els.filterType.value,
    status: els.filterStatus.value,
    sort: els.sort.value
  };
}

function writeFilters() {
  els.search.value = state.filters.query;
  els.filterBuilding.value = state.filters.building;
  els.filterType.value = state.filters.type;
  els.filterStatus.value = state.filters.status;
  els.sort.value = state.filters.sort;
}

const SORTERS = {
  severity: (a, b) => calculateSeverity(b) - calculateSeverity(a),
  newest: (a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt),
  confirms: (a, b) => b.confirms - a.confirms,
  speed: (a, b) => a.speed - b.speed
};

function matchesQuery(report, query) {
  if (!query) return true;
  const haystack = [
    buildingName(report.building),
    floorLabel(report.floor),
    report.spot,
    report.note,
    ISSUE_TYPES[report.type].label
  ]
    .join(" ")
    .toLowerCase();
  return query.split(/\s+/).every((word) => haystack.includes(word));
}

function getVisibleReports() {
  const { query, building, type, status, sort } = state.filters;
  return state.reports
    .filter((r) => building === "all" || r.building === building)
    .filter((r) => type === "all" || r.type === type)
    .filter((r) => status === "all" || r.status === status)
    .filter((r) => matchesQuery(r, query))
    .sort(SORTERS[sort] || SORTERS.severity);
}

function openReports() {
  return state.reports.filter((r) => r.status === "open");
}

function renderStats() {
  const open = openReports();
  const critical = open.filter((r) => severityLevel(calculateSeverity(r)).id === "critical").length;
  const avgSpeed = open.length ? open.reduce((sum, r) => sum + r.speed, 0) / open.length : null;

  const totals = {};
  open.forEach((r) => {
    totals[r.building] = (totals[r.building] || 0) + calculateSeverity(r);
  });
  const worst = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];

  const items = [
    ["Open reports", String(open.length)],
    ["Critical", String(critical)],
    ["Avg. speed", avgSpeed === null ? "—" : `${avgSpeed.toFixed(1)} Mbps`],
    ["Worst area", worst ? buildingName(worst[0]) : "None"]
  ];

  els.stats.replaceChildren(
    ...items.map(([term, value]) => {
      const wrapper = document.createElement("div");
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = term;
      dd.textContent = value;
      wrapper.append(dt, dd);
      return wrapper;
    })
  );
}

function renderMap() {
  const open = openReports();
  const tiles = BUILDINGS.map((building) => {
    const here = open.filter((r) => r.building === building.id);
    const worstScore = here.reduce((max, r) => Math.max(max, calculateSeverity(r)), -1);
    const level = worstScore >= 0 ? severityLevel(worstScore) : null;
    const active = state.filters.building === building.id;

    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = `map-tile heat-${level ? level.heat : 0}`;
    tile.style.gridArea = building.id;
    tile.dataset.building = building.id;
    tile.setAttribute("aria-pressed", String(active));

    const name = document.createElement("strong");
    name.textContent = building.name;
    const count = document.createElement("span");
    count.className = "tile-count";
    count.textContent = here.length === 1 ? "1 open issue" : `${here.length} open issues`;
    const status = document.createElement("span");
    status.className = "tile-level";
    status.textContent = level ? level.label : "Clear";

    tile.append(name, count, status);
    return tile;
  });
  els.map.replaceChildren(...tiles);

  const selected = state.filters.building;
  els.mapStatus.textContent =
    selected === "all"
      ? "Showing all buildings."
      : `Issue list filtered to ${buildingName(selected)}. Select it again to show all.`;
}

function buildBars(count) {
  const wrapper = document.createElement("span");
  wrapper.className = "bars";
  wrapper.dataset.bars = String(count);
  wrapper.setAttribute("role", "img");
  wrapper.setAttribute("aria-label", `${count} of 4 bars`);
  for (let i = 0; i < 4; i += 1) wrapper.append(document.createElement("i"));
  return wrapper;
}

function buildCard(report) {
  const node = els.template.content.firstElementChild.cloneNode(true);
  const score = calculateSeverity(report);
  const level = severityLevel(score);
  const resolved = report.status === "resolved";
  const people = report.confirms + 1;

  node.dataset.id = report.id;
  node.classList.toggle("is-resolved", resolved);
  node.querySelector(".issue-title").textContent = `${report.spot} · ${buildingName(report.building)}`;

  const badge = node.querySelector(".badge");
  badge.textContent = resolved ? "Resolved" : `${level.label} · ${score}`;
  badge.dataset.level = resolved ? "resolved" : level.id;

  node.querySelector(".issue-sub").textContent =
    `${ISSUE_TYPES[report.type].label} · ${floorLabel(report.floor)} · ${people} ${people === 1 ? "report" : "reports"}`;
  node.querySelector(".meta-bars").append(buildBars(report.bars));
  node.querySelector(".meta-speed").textContent = `${report.speed} Mbps`;

  const time = node.querySelector(".meta-time");
  time.dateTime = report.observedAt;
  time.textContent = timeAgo(report.observedAt);
  time.title = new Date(report.observedAt).toLocaleString();

  node.querySelector(".meta-device").textContent = DEVICES[report.device] || "Other";

  const note = node.querySelector(".issue-note");
  note.textContent = report.note || "No extra details.";
  note.classList.toggle("is-empty", !report.note);

  const confirmBtn = node.querySelector('[data-action="confirm"]');
  confirmBtn.textContent = "Me too";
  confirmBtn.disabled = resolved;
  confirmBtn.setAttribute("aria-label", `I have this problem too at ${report.spot}`);

  const toggleBtn = node.querySelector('[data-action="toggle"]');
  toggleBtn.textContent = resolved ? "Reopen" : "Mark resolved";
  toggleBtn.setAttribute("aria-label", `${resolved ? "Reopen" : "Mark resolved"}: ${report.spot}`);

  return node;
}

function renderEmptyState(visibleCount) {
  els.empty.hidden = visibleCount > 0;
  if (visibleCount > 0) return;
  if (state.reports.length === 0) {
    els.emptyTitle.textContent = "No reports yet";
    els.emptyText.textContent = "There are no WiFi reports at all. File the first one or bring back the sample data.";
    els.emptyAction.textContent = "Restore sample data";
    els.emptyAction.dataset.action = "restore";
  } else {
    els.emptyTitle.textContent = "No matching reports";
    els.emptyText.textContent = state.filters.query
      ? `Nothing matches “${state.filters.query}” with the current filters.`
      : "No reports match the current filters.";
    els.emptyAction.textContent = "Clear filters";
    els.emptyAction.dataset.action = "clear-filters";
  }
}

function renderList() {
  const visible = getVisibleReports();
  els.list.replaceChildren(...visible.map(buildCard));
  els.resultCount.textContent = `Showing ${visible.length} of ${state.reports.length} ${state.reports.length === 1 ? "report" : "reports"}`;
  renderEmptyState(visible.length);
}

function renderAll() {
  renderStats();
  renderMap();
  renderList();
}

function clearFilters() {
  state.filters = { ...DEFAULT_FILTERS };
  writeFilters();
  renderMap();
  renderList();
}

function restoreSamples() {
  state.reports = seedReports();
  saveReports();
  clearFilters();
  renderAll();
}

function handleMapClick(event) {
  const tile = event.target.closest(".map-tile");
  if (!tile) return;
  const id = tile.dataset.building;
  state.filters.building = state.filters.building === id ? "all" : id;
  writeFilters();
  renderMap();
  renderList();
  const refocus = els.map.querySelector(`[data-building="${id}"]`);
  if (refocus) refocus.focus();
}

function handleListClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = button.closest(".issue").dataset.id;
  const report = state.reports.find((r) => r.id === id);
  if (!report) return;

  if (button.dataset.action === "confirm") {
    confirmReport(id);
  } else if (button.dataset.action === "toggle") {
    report.status = report.status === "open" ? "resolved" : "open";
    saveReports();
  }
  renderAll();
  const again = els.list.querySelector(`[data-id="${CSS.escape(id)}"] [data-action="${button.dataset.action}"]`);
  if (again && !again.disabled) again.focus();
}

function armButton(button, action) {
  if (button.dataset.armed === "true") {
    clearTimeout(Number(button.dataset.timer));
    button.dataset.armed = "false";
    button.textContent = button.dataset.label;
    action();
    return;
  }
  button.dataset.label = button.textContent;
  button.dataset.armed = "true";
  button.textContent = "Click again to confirm";
  const timer = setTimeout(() => {
    button.dataset.armed = "false";
    button.textContent = button.dataset.label;
  }, 4000);
  button.dataset.timer = String(timer);
}

function bindEvents() {
  els.form.addEventListener("submit", handleSubmit);
  els.form.addEventListener("input", handleFormInput);
  els.form.addEventListener("change", handleFormInput);
  els.form.addEventListener("reset", handleFormReset);
  els.confirmDuplicate.addEventListener("click", handleConfirmDuplicate);

  els.filterForm.addEventListener("input", () => {
    readFilters();
    renderMap();
    renderList();
  });
  els.filterForm.addEventListener("submit", (event) => event.preventDefault());
  els.filterForm.addEventListener("reset", (event) => {
    event.preventDefault();
    clearFilters();
  });

  els.map.addEventListener("click", handleMapClick);
  els.list.addEventListener("click", handleListClick);

  els.resetData.addEventListener("click", () => armButton(els.resetData, restoreSamples));
  els.clearData.addEventListener("click", () =>
    armButton(els.clearData, () => {
      state.reports = [];
      saveReports();
      renderAll();
    })
  );
  els.emptyAction.addEventListener("click", () => {
    if (els.emptyAction.dataset.action === "restore") restoreSamples();
    else clearFilters();
  });
}

function init() {
  state.reports = loadReports();
  populateOptions();
  prepareDateField();
  writeFilters();
  updatePreview();
  bindEvents();
  renderAll();
  if (!state.storageAvailable) {
    setFormMessage("Your browser is blocking storage, so new reports last only until you close this page.", "error");
  }
}

init();
