import { SlatGraph } from "./slat-graph.js";
const $ = (id) => document.getElementById(id);
const reference = [
  { date: "2025-04-08", count: 2 },
  { date: "2025-05-18", count: 4 },
  { date: "2025-07-08", count: 2 },
];
const dense = [];
let seed = 42;
const random = () => {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 4294967296;
};
for (let i = 0; i < 365; i++) {
  const v = random();
  if (v > 0.48)
    dense.push({
      date: new Date(Date.UTC(2025, 0, 1) + i * 86400000)
        .toISOString()
        .slice(0, 10),
      count: 1 + Math.floor(random() * 11),
    });
}
let data = reference,
  paused = false,
  expanded = false;
const state = { radius: 100, strength: 2, trail: 0.75 };
const tooltip = $("tooltip");
const dateFormat = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const graph = new SlatGraph($("graph"), {
  data,
  ...state,
  variant: "squares",
  onHover(day) {
    tooltip.hidden = !day;
    if (!day) return;
    tooltip.replaceChildren();
    const strong = document.createElement("strong");
    strong.textContent = `${day.count} contribution${day.count === 1 ? "" : "s"}`;
    const small = document.createElement("small");
    small.textContent = dateFormat.format(new Date(day.date + "T00:00:00Z"));
    tooltip.append(strong, small);
    const host = $("graph");
    const halfWidth = Math.min(105, host.clientWidth / 2);
    tooltip.style.left = `${Math.max(halfWidth, Math.min(host.clientWidth - halfWidth, day.x - host.scrollLeft))}px`;
    tooltip.style.top = `${Math.max(70, day.y - 22)}px`;
  },
  onColorChange({ mix, color }) {
    $("color-dot").style.background = color;
    $("mix-indicator").style.left = `${Math.min(99, mix * 100)}%`;
    $("color-caption").textContent =
      mix < 0.05
        ? "Move near a green cell."
        : mix < 0.4
          ? "A little green."
          : mix < 0.75
            ? "Green is spreading."
            : "Mostly green.";
  },
});
for (const key of ["radius", "strength", "trail"]) {
  const input = $(key);
  const sync = () => {
    const value = Number(input.value);
    state[key] = value;
    const suffix = key === "radius" ? "px" : key === "trail" ? "s" : "×";
    $(key + "-value").replaceChildren(
      document.createTextNode(
        (key === "radius" ? value : value.toFixed(key === "trail" ? 2 : 1)) +
          (key === "strength" ? "" : " "),
      ),
    );
    const unit = document.createElement("span");
    unit.textContent = suffix;
    $(key + "-value").append(unit);
    const percent =
      ((value - Number(input.min)) / (Number(input.max) - Number(input.min))) *
      100;
    input.style.background = `linear-gradient(to right,#bdbdbd ${percent}%,#373737 ${percent}%)`;
    $("code-" + key).textContent = value;
    graph.update({ [key]: value });
  };
  input.addEventListener("input", sync);
  sync();
}
function selectData(mode) {
  data = mode === "dense" ? dense : reference;
  graph.update({ data });
  $("contribution-total").textContent = data
    .reduce((sum, d) => sum + d.count, 0)
    .toLocaleString("en-US");
  for (const id of ["sparse", "dense"]) {
    const active = (id === "dense") === (mode === "dense");
    $(id).classList.toggle("active", active);
    $(id).setAttribute("aria-pressed", String(active));
  }
}
$("sparse").addEventListener("click", () => selectData("sparse"));
$("dense").addEventListener("click", () => selectData("dense"));
function setPaused(value) {
  paused = value;
  graph.update({ paused });
  $("pause").setAttribute(
    "aria-label",
    paused ? "Resume animation" : "Pause animation",
  );
  $("pause").title = paused ? "Resume animation" : "Pause animation";
  $("pause").setAttribute("aria-pressed", String(paused));
  $("pause").innerHTML = paused
    ? '<svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="m6 3 8 6-8 6V3Z" stroke="currentColor" stroke-width="1.3"/></svg>'
    : '<svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M6 4v10M12 4v10" stroke="currentColor" stroke-width="1.5"/></svg>';
  document.querySelector(".live-pill").innerHTML = paused
    ? "<i></i> PAUSED"
    : "<i></i> RUNNING";
}
$("pause").addEventListener("click", () => setPaused(!paused));
function setExpanded(value) {
  expanded = value;
  $("playground").classList.toggle("expanded", expanded);
  $("expand").setAttribute(
    "aria-label",
    expanded ? "Close expanded preview" : "Expand preview",
  );
  $("expand").setAttribute("aria-pressed", String(expanded));
  $("expand").title = expanded
    ? "Close expanded preview (Esc)"
    : "Expand preview";
}
$("expand").addEventListener("click", () => setExpanded(!expanded));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && expanded) {
    setExpanded(false);
    $("expand").focus();
  }
});
$("reset").addEventListener("click", () => {
  for (const [key, value] of Object.entries({
    radius: 100,
    strength: 2,
    trail: 0.75,
  })) {
    $(key).value = value;
    $(key).dispatchEvent(new Event("input"));
  }
  setPaused(false);
  graph.update({ variant: "squares" });
  selectData("sparse");
  toast("Settings reset.");
});
let toastTimer;
function toast(message) {
  clearTimeout(toastTimer);
  $("toast").textContent = message;
  $("toast").hidden = false;
  toastTimer = setTimeout(() => {
    $("toast").hidden = true;
  }, 2800);
}
$("copy-code").addEventListener("click", async () => {
  const code = `import SlatGraph from './SlatGraph';\n\nconst contributions = [\n  { date: '2025-05-18', count: 4 },\n];\n\nexport default function Activity() {\n  return (\n    <SlatGraph\n      data={contributions}\n      year={2025}\n      radius={${state.radius}}\n      strength={${state.strength}}\n      trail={${state.trail}}\n    />\n  );\n}`;
  try {
    await navigator.clipboard.writeText(code);
    toast("Copied with your settings.");
  } catch {
    toast("Could not copy. Select the code and copy it manually.");
  }
});
window.addEventListener("pagehide", (event) => {
  if (!event.persisted) graph.destroy();
});
