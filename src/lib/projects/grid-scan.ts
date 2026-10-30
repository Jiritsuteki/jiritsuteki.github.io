import { BLUR, COMPOSITE, DOWN, ROOM, VERTEX } from './grid-shaders';

const MAX_PINGS = 4;
const PING_LIFE = 2.4;
const EYE_DISTANCE = 1.25;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export type GridStatus = 'ready' | 'paused' | 'fallback';

export interface GridScanOptions {
	getTime: () => number | null;
	reducedMotion: boolean;
	introDuration: number;
	scanDuration: number;
	scanDelay: number;
	onstatus: (status: GridStatus) => void;
}

export interface GridScanController {
	setReducedMotion: (reduced: boolean) => void;
	dispose: () => void;
}

type Program = {
	program: WebGLProgram;
	uniforms: Record<string, WebGLUniformLocation | null>;
};
type Target = { texture: WebGLTexture; width: number; height: number };
type Pipeline = {
	room: Program;
	down: Program;
	blur: Program;
	composite: Program;
	scene: Target;
	light: Target;
	bloomA: Target;
	bloomB: Target;
	sceneBuffer: WebGLFramebuffer;
	bloomBufferA: WebGLFramebuffer;
	bloomBufferB: WebGLFramebuffer;
	vao: WebGLVertexArrayObject;
};

/** The supplied WebGL2 renderer, with an external clock instead of a React effect. */
export function createGridScan(
	canvas: HTMLCanvasElement,
	container: HTMLElement,
	options: GridScanOptions
): GridScanController | null {
	let gl: WebGL2RenderingContext | null;
	try {
		gl = canvas.getContext('webgl2', {
			alpha: true,
			premultipliedAlpha: true,
			antialias: false,
			depth: false,
			stencil: false,
			powerPreference: 'low-power'
		});
	} catch {
		return null;
	}
	if (!gl) return null;
	const context = gl;
	const interactionTarget = container.parentElement ?? container;
	let pipeline: Pipeline | null = null;
	const programs: WebGLProgram[] = [];
	const textures: WebGLTexture[] = [];
	const framebuffers: WebGLFramebuffer[] = [];
	const vaos: WebGLVertexArrayObject[] = [];
	let disposed = false;
	let lost = false;
	let reduced = options.reducedMotion;
	let visible = true;
	let raf = 0;
	let last = 0;
	let time = 0;
	let introClock = 0;
	const view = { width: 1, height: 1, ratio: 1 };
	const eye = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, f: EYE_DISTANCE };
	const pointer = { x: 0, y: 0, inside: false };
	const look = { x: 0, y: 0, held: false };
	const hover = { x: 0, y: 0, z: 0, strength: 0, ready: false };
	const scan = { z: 0, alpha: 0 };
	const pings: { x: number; y: number; z: number; start: number }[] = [];
	const pingData = new Float32Array(MAX_PINGS * 4);
	const pingAlpha = new Float32Array(MAX_PINGS);
	const lineRgb = new Float32Array([77 / 255, 71 / 255, 87 / 255]);
	const white = new Float32Array([1, 1, 1]);

	function compile(type: number, source: string) {
		const shader = context.createShader(type);
		if (!shader) throw new Error('Shader unavailable');
		context.shaderSource(shader, source);
		context.compileShader(shader);
		if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
			context.deleteShader(shader);
			throw new Error('Shader compilation unavailable');
		}
		return shader;
	}

	function link(fragmentSource: string): Program {
		const vertex = compile(context.VERTEX_SHADER, VERTEX);
		let fragment: WebGLShader | null = null;
		try {
			fragment = compile(context.FRAGMENT_SHADER, fragmentSource);
			const program = context.createProgram();
			if (!program) throw new Error('Program unavailable');
			programs.push(program);
			context.attachShader(program, vertex);
			context.attachShader(program, fragment);
			context.linkProgram(program);
			if (!context.getProgramParameter(program, context.LINK_STATUS)) {
				throw new Error('Program linking unavailable');
			}
			const uniforms: Program['uniforms'] = {};
			const count = context.getProgramParameter(program, context.ACTIVE_UNIFORMS) as number;
			for (let i = 0; i < count; i++) {
				const info = context.getActiveUniform(program, i);
				if (!info) continue;
				const name = info.name.replace(/\[0\]$/, '');
				uniforms[name] = context.getUniformLocation(program, name);
			}
			return { program, uniforms };
		} finally {
			context.deleteShader(vertex);
			if (fragment) context.deleteShader(fragment);
		}
	}

	function createTarget(): Target {
		const texture = context.createTexture();
		if (!texture) throw new Error('Texture unavailable');
		textures.push(texture);
		context.bindTexture(context.TEXTURE_2D, texture);
		context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR);
		context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR);
		context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
		context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
		return { texture, width: 0, height: 0 };
	}

	function createFramebuffer() {
		const buffer = context.createFramebuffer();
		if (!buffer) throw new Error('Framebuffer unavailable');
		framebuffers.push(buffer);
		return buffer;
	}

	function sizeTarget(target: Target, width: number, height: number) {
		if (target.width === width && target.height === height) return;
		target.width = width;
		target.height = height;
		context.bindTexture(context.TEXTURE_2D, target.texture);
		context.texImage2D(
			context.TEXTURE_2D,
			0,
			context.RGBA8,
			width,
			height,
			0,
			context.RGBA,
			context.UNSIGNED_BYTE,
			null
		);
	}

	function release() {
		textures.splice(0).forEach((texture) => context.deleteTexture(texture));
		framebuffers.splice(0).forEach((buffer) => context.deleteFramebuffer(buffer));
		vaos.splice(0).forEach((vao) => context.deleteVertexArray(vao));
		programs.splice(0).forEach((program) => context.deleteProgram(program));
		pipeline = null;
	}

	function roomSize() {
		const aspect = view.width / view.height;
		const cy = 1 / 8;
		const cx = aspect / Math.max(1, Math.round(aspect / cy));
		return { aspect, cx, cy, roomDepth: 10 };
	}

	function castRay(u: number, v: number) {
		const { aspect, roomDepth } = roomSize();
		const px = (u - 0.5) * aspect;
		const py = v - 0.5;
		const dx = px - eye.x;
		const dy = py - eye.y;
		const dz = eye.f;
		const sx = dx > 0 ? 0.5 * aspect : -0.5 * aspect;
		const sy = dy > 0 ? 0.5 : -0.5;
		let t = roomDepth / dz;
		if (Math.abs(dx) > 1e-6) t = Math.min(t, (sx - px) / dx);
		if (Math.abs(dy) > 1e-6) t = Math.min(t, (sy - py) / dy);
		return { x: px + dx * t, y: py + dy * t, z: dz * t };
	}

	function updateScan(elapsed: number | null) {
		if (reduced) {
			introClock = 1;
			scan.alpha = 0;
			return;
		}
		if (elapsed === null || elapsed < 0) {
			introClock = 0;
			scan.z = -0.2;
			scan.alpha = 0;
			return;
		}
		introClock = clamp(elapsed / options.introDuration, 0, 1);
		if (introClock < 1) {
			const k = introClock;
			scan.z = k * 10.4 - 0.2;
			scan.alpha = Math.min(1, k * 6) * (1 - Math.max(0, k - 0.85) / 0.15);
			return;
		}
		const phase = (elapsed - options.introDuration) % (options.scanDelay + options.scanDuration);
		if (phase < options.scanDelay) {
			scan.alpha = 0;
			return;
		}
		const k = (phase - options.scanDelay) / options.scanDuration;
		scan.z = k * 10.3 - 0.15;
		scan.alpha = Math.min(1, k / 0.12) * Math.min(1, (1 - k) / 0.12);
	}

	function updateEye(dt: number) {
		const aspect = view.width / view.height;
		const nx = reduced
			? 0
			: look.held
				? look.x
				: Math.sin(time * 0.21) * 0.2 + Math.sin(time * 0.083 + 1.3) * 0.12;
		const ny = reduced ? 0 : look.held ? look.y : Math.sin(time * 0.17 + 2.1) * 0.16;
		eye.tx = nx * 0.22 * aspect;
		eye.ty = ny * 0.22;
		const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
		const h = dt / steps;
		for (let i = 0; i < steps; i++) {
			eye.vx += ((eye.tx - eye.x) * 42 - eye.vx * 11) * h;
			eye.vy += ((eye.ty - eye.y) * 42 - eye.vy * 11) * h;
			eye.x += eye.vx * h;
			eye.y += eye.vy * h;
		}
	}

	function updateInteraction(dt: number) {
		const aim = pointer.inside && !reduced ? 1 : 0;
		if (aim) {
			const target = castRay(pointer.x, pointer.y);
			if (!hover.ready) Object.assign(hover, target, { ready: true });
			const follow = 1 - Math.exp(-dt / 0.08);
			hover.x += (target.x - hover.x) * follow;
			hover.y += (target.y - hover.y) * follow;
			hover.z += (target.z - hover.z) * follow;
		}
		hover.strength += (aim - hover.strength) * (1 - Math.exp(-dt / 0.25));
		if (!aim && hover.strength < 0.01) hover.ready = false;
		for (let i = pings.length - 1; i >= 0; i--) {
			if (time - pings[i].start > PING_LIFE) pings.splice(i, 1);
		}
		for (let i = 0; i < MAX_PINGS; i++) {
			const ping = pings[i];
			if (!ping) {
				pingAlpha[i] = 0;
				continue;
			}
			const age = Math.max(0, time - ping.start);
			const k = age / PING_LIFE;
			pingData.set([ping.x, ping.y, ping.z, age * 1.15], i * 4);
			pingAlpha[i] = Math.min(1, age / 0.05) * (1 - k) * (1 - k);
		}
	}

	function draw() {
		if (!pipeline || lost || disposed) return;
		const {
			room,
			down,
			blur,
			composite,
			scene,
			light,
			bloomA,
			bloomB,
			sceneBuffer,
			bloomBufferA,
			bloomBufferB,
			vao
		} = pipeline;
		const { aspect, cx, cy, roomDepth } = roomSize();
		const ru = room.uniforms;
		context.bindVertexArray(vao);
		context.disable(context.BLEND);
		context.bindFramebuffer(context.FRAMEBUFFER, sceneBuffer);
		context.drawBuffers([context.COLOR_ATTACHMENT0, context.COLOR_ATTACHMENT1]);
		context.viewport(0, 0, canvas.width, canvas.height);
		context.useProgram(room.program);
		context.uniform1f(ru.uAspect, aspect);
		context.uniform1f(ru.uPixel, 1 / canvas.height);
		context.uniform3f(ru.uEye, eye.x, eye.y, -eye.f);
		context.uniform1f(ru.uDepth, roomDepth);
		context.uniform3f(ru.uCell, cx, cy, cy);
		context.uniform1f(ru.uThick, view.ratio * 0.5);
		context.uniform1f(ru.uDot, 1.8 * view.ratio);
		context.uniform1i(ru.uStyle, 0);
		context.uniform3fv(ru.uLineColor, lineRgb);
		context.uniform3fv(ru.uScanColor, white);
		context.uniform3fv(ru.uCoreColor, white);
		context.uniform1f(ru.uFade, 1);
		context.uniform1f(ru.uScanZ, scan.z);
		context.uniform1f(ru.uScanDir, 1);
		context.uniform1f(ru.uScanAlpha, scan.alpha);
		context.uniform1f(ru.uScanWidth, 0.006);
		context.uniform1f(ru.uTrail, 0.59);
		context.uniform1f(ru.uReveal, introClock < 1 ? scan.z + 0.05 : 1e4);
		context.uniform1f(ru.uPoints, 1);
		context.uniform1f(ru.uReflect, 0.35);
		context.uniform1f(ru.uHaze, 0.05);
		context.uniform1f(ru.uShade, 0.7);
		context.uniform1f(ru.uLight, 0);
		context.uniform4fv(ru.uPing, pingData);
		context.uniform1fv(ru.uPingAlpha, pingAlpha);
		context.uniform4f(ru.uHover, hover.x, hover.y, hover.z, hover.strength);
		context.uniform1f(ru.uTime, time);
		context.drawArrays(context.TRIANGLES, 0, 3);

		context.bindFramebuffer(context.FRAMEBUFFER, bloomBufferA);
		context.viewport(0, 0, bloomA.width, bloomA.height);
		context.useProgram(down.program);
		context.activeTexture(context.TEXTURE0);
		context.bindTexture(context.TEXTURE_2D, light.texture);
		context.uniform1i(down.uniforms.uSource, 0);
		context.uniform2f(down.uniforms.uTexel, 1 / light.width, 1 / light.height);
		context.drawArrays(context.TRIANGLES, 0, 3);
		const spread = (2.2 * view.ratio) / 2;
		context.useProgram(blur.program);
		context.uniform1i(blur.uniforms.uSource, 0);
		context.bindFramebuffer(context.FRAMEBUFFER, bloomBufferB);
		context.bindTexture(context.TEXTURE_2D, bloomA.texture);
		context.uniform2f(blur.uniforms.uStep, spread / bloomA.width, 0);
		context.drawArrays(context.TRIANGLES, 0, 3);
		context.bindFramebuffer(context.FRAMEBUFFER, bloomBufferA);
		context.bindTexture(context.TEXTURE_2D, bloomB.texture);
		context.uniform2f(blur.uniforms.uStep, 0, spread / bloomA.height);
		context.drawArrays(context.TRIANGLES, 0, 3);

		context.bindFramebuffer(context.FRAMEBUFFER, null);
		context.viewport(0, 0, canvas.width, canvas.height);
		context.useProgram(composite.program);
		context.activeTexture(context.TEXTURE0);
		context.bindTexture(context.TEXTURE_2D, scene.texture);
		context.uniform1i(composite.uniforms.uScene, 0);
		context.activeTexture(context.TEXTURE1);
		context.bindTexture(context.TEXTURE_2D, bloomA.texture);
		context.uniform1i(composite.uniforms.uBloom, 1);
		context.uniform1f(composite.uniforms.uGlow, 0.6 * 1.6);
		context.drawArrays(context.TRIANGLES, 0, 3);
		context.activeTexture(context.TEXTURE0);
	}

	function resize() {
		if (!pipeline || disposed || lost) return;
		try {
			view.width = Math.max(1, container.clientWidth);
			view.height = Math.max(1, container.clientHeight);
			const mobile = window.matchMedia('(pointer: coarse)').matches || view.width < 768;
			view.ratio = Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.5);
			canvas.width = Math.max(1, Math.round(view.width * view.ratio));
			canvas.height = Math.max(1, Math.round(view.height * view.ratio));
			const { scene, light, bloomA, bloomB, sceneBuffer, bloomBufferA, bloomBufferB } = pipeline;
			sizeTarget(scene, canvas.width, canvas.height);
			sizeTarget(light, canvas.width, canvas.height);
			context.bindFramebuffer(context.FRAMEBUFFER, sceneBuffer);
			context.framebufferTexture2D(
				context.FRAMEBUFFER,
				context.COLOR_ATTACHMENT0,
				context.TEXTURE_2D,
				scene.texture,
				0
			);
			context.framebufferTexture2D(
				context.FRAMEBUFFER,
				context.COLOR_ATTACHMENT1,
				context.TEXTURE_2D,
				light.texture,
				0
			);
			if (context.checkFramebufferStatus(context.FRAMEBUFFER) !== context.FRAMEBUFFER_COMPLETE)
				throw new Error('Scene unavailable');
			const bw = Math.max(1, Math.round(canvas.width / 4));
			const bh = Math.max(1, Math.round(canvas.height / 4));
			sizeTarget(bloomA, bw, bh);
			sizeTarget(bloomB, bw, bh);
			for (const [buffer, target] of [
				[bloomBufferA, bloomA],
				[bloomBufferB, bloomB]
			] as const) {
				context.bindFramebuffer(context.FRAMEBUFFER, buffer);
				context.framebufferTexture2D(
					context.FRAMEBUFFER,
					context.COLOR_ATTACHMENT0,
					context.TEXTURE_2D,
					target.texture,
					0
				);
				if (context.checkFramebufferStatus(context.FRAMEBUFFER) !== context.FRAMEBUFFER_COMPLETE)
					throw new Error('Bloom unavailable');
			}
			context.bindFramebuffer(context.FRAMEBUFFER, null);
			updateScan(options.getTime());
			draw();
			wake();
		} catch {
			cancelAnimationFrame(raf);
			raf = 0;
			release();
			options.onstatus('fallback');
		}
	}

	function frame(now: number) {
		raf = 0;
		if (!pipeline || disposed || lost || !visible || document.hidden) return;
		const dt = last ? clamp((now - last) / 1000, 0.001, 0.05) : 1 / 60;
		last = now;
		const elapsed = options.getTime();
		time = Math.max(0, elapsed ?? 0);
		updateScan(elapsed);
		updateEye(dt);
		updateInteraction(dt);
		draw();
		if (!reduced) raf = requestAnimationFrame(frame);
		else last = 0;
	}

	function wake() {
		if (!raf && !disposed && !lost && pipeline && visible && !document.hidden) {
			raf = requestAnimationFrame(frame);
		}
	}

	function initialize() {
		try {
			const room = link(ROOM);
			const down = link(DOWN);
			const blur = link(BLUR);
			const composite = link(COMPOSITE);
			const vao = context.createVertexArray();
			if (!vao) throw new Error('Vertex array unavailable');
			vaos.push(vao);
			pipeline = {
				room,
				down,
				blur,
				composite,
				vao,
				scene: createTarget(),
				light: createTarget(),
				bloomA: createTarget(),
				bloomB: createTarget(),
				sceneBuffer: createFramebuffer(),
				bloomBufferA: createFramebuffer(),
				bloomBufferB: createFramebuffer()
			};
			resize();
			if (!pipeline) return false;
			options.onstatus('ready');
			return true;
		} catch {
			release();
			options.onstatus('fallback');
			return false;
		}
	}

	function locate(event: PointerEvent) {
		const rect = container.getBoundingClientRect();
		const u = (event.clientX - rect.left) / Math.max(1, rect.width);
		const v = 1 - (event.clientY - rect.top) / Math.max(1, rect.height);
		return { u, v, inside: u >= 0 && u <= 1 && v >= 0 && v <= 1 };
	}

	function onPointerMove(event: PointerEvent) {
		if (reduced || event.pointerType !== 'mouse') return;
		const { u, v, inside } = locate(event);
		pointer.x = u;
		pointer.y = v;
		pointer.inside = inside;
		look.held = inside;
		look.x = clamp(u * 2 - 1, -1, 1);
		look.y = clamp(v * 2 - 1, -1, 1);
		wake();
	}

	function onPointerDown(event: PointerEvent) {
		if (reduced || event.button !== 0 || options.getTime() === null) return;
		const target = event.target;
		if (
			target instanceof Element &&
			target.closest('a, button, dialog, [data-project-card], [data-no-ping]')
		)
			return;
		const { u, v, inside } = locate(event);
		if (!inside) return;
		pings.unshift({ ...castRay(u, v), start: time });
		if (pings.length > MAX_PINGS) pings.pop();
		wake();
	}

	function onPointerLeave() {
		pointer.inside = false;
		look.held = false;
		wake();
	}

	function onVisibility() {
		cancelAnimationFrame(raf);
		raf = 0;
		last = 0;
		if (pipeline) options.onstatus(document.hidden || !visible ? 'paused' : 'ready');
		wake();
	}

	function onContextLost(event: Event) {
		event.preventDefault();
		lost = true;
		cancelAnimationFrame(raf);
		raf = 0;
		options.onstatus('fallback');
	}

	function onContextRestored() {
		if (disposed) return;
		release();
		lost = false;
		last = 0;
		initialize();
	}

	if (!initialize()) {
		context.getExtension('WEBGL_lose_context')?.loseContext();
		return null;
	}
	const observer = new ResizeObserver(resize);
	observer.observe(container);
	const intersection = new IntersectionObserver((entries) => {
		visible = entries.some((entry) => entry.isIntersecting);
		onVisibility();
	});
	intersection.observe(container);
	interactionTarget.addEventListener('pointermove', onPointerMove, { passive: true });
	interactionTarget.addEventListener('pointerdown', onPointerDown, { passive: true });
	interactionTarget.addEventListener('pointerleave', onPointerLeave);
	document.addEventListener('visibilitychange', onVisibility);
	canvas.addEventListener('webglcontextlost', onContextLost);
	canvas.addEventListener('webglcontextrestored', onContextRestored);

	return {
		setReducedMotion(value) {
			if (reduced === value) return;
			reduced = value;
			cancelAnimationFrame(raf);
			raf = 0;
			last = 0;
			if (reduced) {
				Object.assign(eye, { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 });
				pings.length = 0;
				pingAlpha.fill(0);
				hover.strength = 0;
			}
			wake();
		},
		dispose() {
			if (disposed) return;
			disposed = true;
			cancelAnimationFrame(raf);
			observer.disconnect();
			intersection.disconnect();
			interactionTarget.removeEventListener('pointermove', onPointerMove);
			interactionTarget.removeEventListener('pointerdown', onPointerDown);
			interactionTarget.removeEventListener('pointerleave', onPointerLeave);
			document.removeEventListener('visibilitychange', onVisibility);
			canvas.removeEventListener('webglcontextlost', onContextLost);
			canvas.removeEventListener('webglcontextrestored', onContextRestored);
			release();
			context.getExtension('WEBGL_lose_context')?.loseContext();
		}
	};
}
