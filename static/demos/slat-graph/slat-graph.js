const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const lerp = (a, b, t) => a + (b - a) * t;
const DAY = 86400000;
let instanceId = 0;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const CELL_COLORS = [
  [27, 29, 32],
  [14, 68, 41],
  [0, 109, 50],
  [38, 166, 65],
  [57, 211, 83],
];
export function makeCalendar(year, data = []) {
  const y = clamp(Math.round(Number(year) || 2025), 1971, 9998);
  const counts = new Map();
  for (const d of Array.isArray(data) ? data : []) {
    if (!d || typeof d.date !== "string") continue;
    const ms = Date.parse(d.date + "T00:00:00Z");
    if (
      !Number.isFinite(ms) ||
      new Date(ms).toISOString().slice(0, 10) !== d.date ||
      !Number.isFinite(d.count)
    )
      continue;
    counts.set(
      d.date,
      (counts.get(d.date) || 0) + Math.max(0, Math.floor(d.count)),
    );
  }
  const first = Date.UTC(y, 0, 1);
  const start = first - new Date(first).getUTCDay() * DAY;
  const end = Date.UTC(y + 1, 0, 1);
  return Array.from({ length: Math.ceil((end - start) / DAY) }, (_, i) => {
    const date = new Date(start + i * DAY).toISOString().slice(0, 10);
    const count = counts.get(date) || 0;
    return {
      date,
      count,
      level:
        count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 6 ? 3 : 4,
      col: Math.floor(i / 7),
      row: i % 7,
      valid: new Date(start + i * DAY).getUTCFullYear() === y,
    };
  });
}
export class SlatGraph {
  constructor(host, options = {}) {
    if (!(host instanceof HTMLElement))
      throw new TypeError("SlatGraph needs a host element.");
    this.host = host;
    this.options = {
      year: 2025,
      data: [],
      radius: 100,
      strength: 2,
      speed: 0.7,
      trail: 0.75,
      minWidth: 640,
      paused: false,
      variant: "squares",
      ...options,
    };
    this.canvas = document.createElement("canvas");
    this.canvas.style.cssText =
      "display:block;width:100%;height:100%;touch-action:pan-x pan-y;outline-offset:-4px";
    this.oldOverflow = host.style.overflowX;
    host.style.overflowX = "auto";
    this.canvas.setAttribute("role", "img");
    this.canvas.setAttribute("tabindex", "0");
    this.canvas.setAttribute(
      "aria-keyshortcuts",
      "ArrowLeft ArrowRight ArrowUp ArrowDown Escape",
    );
    this.ctx = this.canvas.getContext("2d");
    if (!this.ctx) throw new Error("Canvas 2D is unavailable.");
    this.summary = document.createElement("div");
    this.summary.style.cssText =
      "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap";
    this.summary.id = `slat-summary-${++instanceId}`;
    this.canvas.setAttribute("aria-describedby", this.summary.id);
    this.announcement = document.createElement("div");
    this.announcement.style.cssText = this.summary.style.cssText;
    this.announcement.setAttribute("aria-live", "polite");
    host.append(this.canvas, this.summary, this.announcement);
    this.pointer = { x: -1000, y: -1000, active: false, mix: 0 };
    this.samples = [];
    this.ripples = [];
    this.time = 0;
    this.last = 0;
    this.raf = 0;
    this.visible = true;
    this.dead = false;
    this.keyIndex = -1;
    this.motion = matchMedia("(prefers-reduced-motion: reduce)");
    this.abort = new AbortController();
    const signal = this.abort.signal;
    this.canvas.addEventListener("pointermove", (e) => this.move(e), {
      signal,
    });
    this.canvas.addEventListener("pointerleave", () => this.leave(), {
      signal,
    });
    this.canvas.addEventListener("pointercancel", () => this.leave(), {
      signal,
    });
    this.canvas.addEventListener(
      "pointerdown",
      (e) => {
        this.move(e);
        this.ripples.push({
          x: this.pointer.x,
          y: this.pointer.y,
          age: 0,
          mix: this.pointer.mix,
        });
        this.wake();
      },
      { signal },
    );
    this.canvas.addEventListener(
      "pointerup",
      (e) => {
        if (e.pointerType !== "mouse") this.leave();
      },
      { signal },
    );
    this.canvas.addEventListener("keydown", (e) => this.key(e), { signal });
    this.canvas.addEventListener("blur", () => this.leave(), { signal });
    document.addEventListener(
      "visibilitychange",
      () => {
        this.last = 0;
        this.wake();
      },
      { signal },
    );
    this.motion.addEventListener("change", () => this.wake(), { signal });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.intersection = new IntersectionObserver((entries) => {
      this.visible = entries[0].isIntersecting;
      this.last = 0;
      this.wake();
    });
    this.intersection.observe(host);
    this.update({});
    this.resize();
  }
  update(options = {}) {
    const widthChanged =
      options.minWidth !== undefined &&
      options.minWidth !== this.options.minWidth;
    const dataChanged =
      (options.data !== undefined && options.data !== this.options.data) ||
      (options.year !== undefined &&
        Number(options.year) !== this.options.year) ||
      !this.days;
    Object.assign(this.options, options);
    this.options.year = clamp(
      Math.round(Number(this.options.year) || 2025),
      1971,
      9998,
    );
    for (const [key, min, max] of [
      ["radius", 25, 300],
      ["strength", 0, 2],
      ["speed", 0, 2],
      ["trail", 0.5, 1],
    ]) {
      this.options[key] = clamp(Number(this.options[key]) || 0, min, max);
    }
    this.canvas.style.minWidth = `${clamp(Number(this.options.minWidth) || 0, 120, 2048)}px`;
    if (dataChanged) {
      this.days = makeCalendar(this.options.year, this.options.data);
      this.active = this.days.filter((d) => d.valid && d.count > 0);
      this.cols = this.days.at(-1).col + 1;
      const total = this.active.reduce((sum, d) => sum + d.count, 0);
      this.canvas.setAttribute(
        "aria-label",
        `${this.options.year} contribution grid. ${total} contributions across ${this.active.length} active days. Use the arrow keys to explore.`,
      );
      this.summary.textContent =
        this.active
          .map((d) => `${d.date}: ${d.count} contributions`)
          .join("; ") || "No contributions this year.";
      this.layout();
      this.samples = [];
      this.ripples = [];
      this.leave();
    }
    if (this.options.paused) {
      this.samples = [];
      this.ripples = [];
    }
    if (widthChanged) this.resize();
    this.wake();
  }
  resize() {
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(this.width * dpr));
    this.canvas.height = Math.max(1, Math.round(this.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.layout();
    this.leave();
    this.wake();
  }
  layout() {
    if (this.width < 100 || !this.days) return;
    const pad = this.width < 600 ? 30 : 58;
    this.pitch = (this.width - pad - (this.width < 600 ? 12 : 34)) / this.cols;
    this.cellW = this.pitch * 0.76;
    this.cellH = this.cellW;
    this.rowPitch = this.pitch;
    this.x0 = pad;
    this.y0 = (this.height - this.rowPitch * 7) / 2 + 10;
    for (const d of this.days) {
      d.x = this.x0 + d.col * this.pitch + this.cellW / 2;
      d.y = this.y0 + d.row * this.rowPitch + this.cellH / 2;
    }
  }
  influence(x, y) {
    let green = 0;
    const sigma = this.options.radius * 0.51;
    for (const d of this.active) {
      const dist = (x - d.x) ** 2 + (y - d.y) ** 2;
      green = Math.max(
        green,
        (0.42 + d.level * 0.145) * Math.exp(-dist / (2 * sigma ** 2)),
      );
    }
    return clamp(green);
  }
  hoverAt(x, y) {
    const col = Math.floor(
      (x - this.x0 + (this.pitch - this.cellW) / 2) / this.pitch,
    );
    const row = Math.floor(
      (y - this.y0 + (this.rowPitch - this.cellH) / 2) / this.rowPitch,
    );
    return (
      this.days.find((d) => d.valid && d.col === col && d.row === row) || null
    );
  }
  move(event) {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.setPointer(
      ((event.clientX - r.left) * this.width) / r.width,
      ((event.clientY - r.top) * this.height) / r.height,
    );
  }
  setPointer(x, y) {
    const mix = this.influence(x, y);
    const prev = this.pointer;
    const dist = Math.hypot(x - prev.x, y - prev.y);
    const steps = prev.active
      ? Math.min(6, Math.max(1, Math.ceil(dist / 14)))
      : 1;
    if (!this.options.paused && !this.motion.matches) {
      for (let i = 1; i <= steps; i++) {
        const sx = prev.active ? lerp(prev.x, x, i / steps) : x;
        const sy = prev.active ? lerp(prev.y, y, i / steps) : y;
        this.samples.push({
          x: sx,
          y: sy,
          age: 0,
          mix: this.influence(sx, sy),
          vx: clamp((x - prev.x) / 60, -1, 1),
        });
      }
      this.samples = this.samples.slice(-48);
    }
    this.pointer = { x, y, active: true, mix };
    const day = this.hoverAt(x, y);
    this.hovered = day;
    this.options.onHover?.(day ? { ...day, x: day.x, y: day.y } : null);
    this.options.onColorChange?.({
      mix,
      color: `rgb(${Math.round(lerp(163, 57, mix))},${Math.round(lerp(163, 211, mix))},${Math.round(lerp(163, 83, mix))})`,
    });
    this.wake();
  }
  leave() {
    this.pointer.active = false;
    this.hovered = null;
    this.keyIndex = -1;
    this.options.onHover?.(null);
    this.options.onColorChange?.({ mix: 0, color: "#a3a3a3" });
    this.wake();
  }
  key(e) {
    if (e.key === "Escape") {
      this.leave();
      return;
    }
    const diff = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 }[
      e.key
    ];
    if (!diff) return;
    e.preventDefault();
    const valid = this.days.filter((d) => d.valid);
    this.keyIndex = clamp(
      this.keyIndex < 0 ? 0 : this.keyIndex + diff,
      0,
      valid.length - 1,
    );
    const d = valid[this.keyIndex];
    this.setPointer(d.x, d.y);
    this.announcement.textContent = `${d.date}: ${d.count} contribution${d.count === 1 ? "" : "s"}`;
  }
  wake() {
    if (!this.dead && !this.raf)
      this.raf = requestAnimationFrame((t) => this.frame(t));
  }
  frame(now) {
    this.raf = 0;
    if (this.dead || !this.visible || document.hidden) {
      this.last = 0;
      return;
    }
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0.016;
    this.last = now;
    const animated = !this.options.paused && !this.motion.matches;
    if (animated) {
      this.time += dt * this.options.speed;
      this.samples.forEach((s) => {
        s.age += dt;
      });
      this.samples = this.samples.filter(
        (s) => s.age < this.options.trail * 2.4,
      );
      this.ripples.forEach((r) => {
        r.age += dt;
      });
      this.ripples = this.ripples.filter((r) => r.age < 1.4).slice(-5);
    }
    this.draw(animated);
    if (animated) this.wake();
  }
  field(x, y, animated) {
    let force = 0,
      mix = 0,
      lean = 0;
    const radius = this.options.radius;
    if (this.pointer.active) {
      const v = Math.exp(
        -((x - this.pointer.x) ** 2 + (y - this.pointer.y) ** 2) /
          (radius * radius * 0.42),
      );
      force = v * 0.8;
      mix = this.pointer.mix * v;
    }
    if (animated) {
      for (let i = this.samples.length - 1; i >= 0; i -= 2) {
        const s = this.samples[i];
        const distance = Math.hypot(x - s.x, y - s.y);
        if (distance > radius * 2) continue;
        const fade = Math.exp((-s.age * 3) / this.options.trail);
        const v = Math.exp(-(distance ** 2) / (radius * radius * 0.32)) * fade;
        force = Math.max(force, v);
        mix = Math.max(mix, s.mix * v);
        lean += s.vx * v * 0.08;
      }
      for (const r of this.ripples) {
        const dist = Math.hypot(x - r.x, y - r.y);
        const v =
          Math.exp(-(((dist - r.age * 140) / 20) ** 2)) *
          (1 - r.age / 1.4) *
          0.65;
        force += v;
        mix = Math.max(mix, v * r.mix);
      }
    }
    return {
      force: clamp(force * this.options.strength, 0, 1.6),
      mix: clamp(mix),
      lean: clamp(lean, -0.32, 0.32),
    };
  }
  draw(animated) {
    const ctx = this.ctx,
      w = this.width,
      h = this.height;
    if (w < 100 || h < 20) return;
    ctx.clearRect(0, 0, w, h);
    const t = this.time;
    const step = w < 600 ? 14 : 11;
    if (this.options.variant === "slats")
      for (let x = 7; x < w; x += step)
        for (let y = 9; y < h; y += 14) {
          if (
            x > this.x0 - 6 &&
            x < this.x0 + this.cols * this.pitch &&
            y > this.y0 - 5 &&
            y < this.y0 + this.rowPitch * 7
          )
            continue;
          const f = this.field(x, y, animated);
          const wave =
            (Math.sin(x * 0.011 + y * 0.018 - t) +
              Math.cos(x * 0.006 - y * 0.024 + t * 0.7)) *
            0.5;
          const light = 0.055 + (wave + 1) * 0.025 + f.force * 0.7;
          const green = f.mix;
          ctx.fillStyle = `rgba(${Math.round(lerp(135, 57, green))},${Math.round(lerp(135, 211, green))},${Math.round(lerp(135, 83, green))},${light})`;
          const length = 3 + (wave + 1) * 1.4 + f.force * 7;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(f.lean);
          ctx.fillRect(-0.8, -length / 2, 1.6, length);
          ctx.restore();
        }
    const label = w < 600 ? 8 : 10;
    ctx.font = `400 ${label}px ui-monospace, SFMono-Regular, Consolas, monospace`;
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#8b8b8b";
    for (let m = 0; m < 12; m++) {
      const d = this.days.find(
        (d) =>
          d.valid &&
          d.date ===
            `${this.options.year}-${String(m + 1).padStart(2, "0")}-01`,
      );
      if (d) ctx.fillText(MONTHS[m], d.x - this.cellW / 2, this.y0 - 22);
    }
    ["Mon", "Wed", "Fri"].forEach((s, i) =>
      ctx.fillText(
        s,
        w < 600 ? 1 : 19,
        this.y0 + (i * 2 + 1) * this.rowPitch + this.cellH / 2,
      ),
    );
    for (const d of this.days) {
      if (!d.valid) continue;
      const f = this.field(d.x, d.y, animated);
      const wave =
        (Math.sin(d.col * 0.18 + d.row * 0.38 - t * 1.3) +
          Math.sin(d.col * 0.09 - d.row * 0.7 + t * 0.8)) *
          0.25 +
        0.5;
      const level = d.level / 4;
      const green = d.count ? 1 : f.mix * 0.95;
      const brightness = d.count
        ? 0.34 + level * 0.6 + f.force * 0.28
        : 0.15 + wave * 0.12 + f.force * 0.8;
      const base = CELL_COLORS[d.level];
      const neutral = Math.round(
        lerp(29, 153, clamp(f.force * (0.72 + wave * 0.15))),
      );
      const glow = clamp(f.force * 0.25);
      const color = d.count
        ? base.map((v, i) => Math.round(lerp(v, [98, 235, 123][i], glow)))
        : [57, 211, 83].map((v) => Math.round(lerp(neutral, v, green)));
      const cw = this.cellW,
        ch = this.cellH;
      const hovered = this.hovered === d;
      if (d.count && f.force > 0.08) {
        ctx.shadowColor = `rgba(57,211,83,${f.force * 0.35})`;
        ctx.shadowBlur = 7 * f.force;
      }
      if (this.options.variant === "squares") {
        ctx.fillStyle = `rgb(${color})`;
        ctx.beginPath();
        ctx.roundRect(
          d.x - cw / 2,
          d.y - ch / 2,
          cw,
          ch,
          Math.min(2.5, cw * 0.16),
        );
        ctx.fill();
      } else {
        const nx = cw < 9 ? 2 : 3,
          ny = 4;
        const slotW = cw / (nx + 0.8),
          slotH = ch / (ny + 0.4);
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(f.lean);
        for (let a = 0; a < nx; a++)
          for (let b = 0; b < ny; b++) {
            const offset = Math.sin(
              d.col * 0.22 + d.row * 0.7 + a * 0.7 + b * 0.5 - t * 1.2,
            );
            const length = slotH * (0.44 + (offset + 1) * 0.16 + f.force * 0.2);
            ctx.fillStyle = `rgba(${color},${clamp(brightness + offset * 0.09)})`;
            ctx.beginPath();
            ctx.roundRect(
              (a - (nx - 1) / 2) * (cw / nx) - slotW / 2,
              (b - 1.5) * (ch / ny) - length / 2,
              Math.max(0.8, slotW * 0.63),
              length,
              0.7,
            );
            ctx.fill();
          }
        ctx.restore();
      }
      ctx.shadowBlur = 0;
      if (hovered) {
        ctx.strokeStyle = "rgba(230,230,230,0.7)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(
          d.x - cw / 2 - 2,
          d.y - ch / 2 - 2,
          cw + 4,
          ch + 4,
          Math.min(3, cw * 0.2),
        );
        ctx.stroke();
      }
    }
    if (this.pointer.active && this.options.strength > 0) {
      const p = this.pointer;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = p.mix > 0.15 ? "#56d364" : "#d0d0d0";
      ctx.fill();
    }
  }
  destroy() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    this.abort.abort();
    this.resizeObserver.disconnect();
    this.intersection.disconnect();
    this.canvas.remove();
    this.summary.remove();
    this.announcement.remove();
    this.host.style.overflowX = this.oldOverflow;
  }
}
