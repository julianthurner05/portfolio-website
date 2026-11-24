const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Escape schließt offene Infobox-Panels
addEventListener("keydown", (e) => {
	if (e.key !== "Escape") return;
	for (const hero of document.querySelectorAll(".hero.open")) {
		hero.classList.remove("open");
		hero.querySelector(".more").setAttribute("aria-expanded", "false");
	}
});

// Infobox-Panel pro Projekt: taucht aus der Unschärfe auf, X schließt
for (const hero of document.querySelectorAll(".hero")) {
	const more = hero.querySelector(".more");
	const close = hero.querySelector(".close");
	if (!more || !close) continue;
	more.addEventListener("click", () => {
		hero.classList.add("open");
		more.setAttribute("aria-expanded", "true");
	});
	close.addEventListener("click", () => {
		hero.classList.remove("open");
		more.setAttribute("aria-expanded", "false");
		more.focus();
	});
}

// Hörseite: ein gemeinsamer Player, eine Spur zur Zeit,
// rote Linie unter der laufenden Zeile zeigt den Fortschritt
const trackList = document.querySelectorAll(".track");
if (trackList.length) {
	const audio = new Audio();
	let current = null;
	const btnOf = (li) => li.querySelector(".t-btn");
	let barCur = 0;
	const stopRow = (li) => {
		btnOf(li).textContent = "play";
		// die Linie bleibt stehen: gehörte Spuren behalten ihren Fortschritt
	};
	// Playbar extrem weich: die Linie läuft dem echten Stand träge nach
	(function bar() {
		if (current && audio.duration) {
			const t = (audio.currentTime / audio.duration) * 100;
			barCur += (t - barCur) * 0.06;
			current.style.setProperty("--p", barCur.toFixed(3) + "%");
		}
		requestAnimationFrame(bar);
	})();

	// Hörmodus: Liste blendet aus, die laufende Zeile rückt in die
	// Bildschirmmitte, dahinter läuft ein audio-reaktives p5-Visual.
	// Jeder Track bekommt sein eigenes — bewusst frei von der
	// Formensprache der Seite.
	let viz = null;
	function ensureViz() {
		if (viz || !window.p5 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const actx = new (window.AudioContext || window.webkitAudioContext)();
		const an = actx.createAnalyser();
		an.fftSize = 256;
		actx.createMediaElementSource(audio).connect(an);
		an.connect(actx.destination);
		const bins = new Uint8Array(an.frequencyBinCount);
		const wave = new Uint8Array(an.fftSize);
		const band = (a, b) => {
			let s = 0;
			for (let i = a; i < b; i++) s += bins[i];
			return s / ((b - a) * 255);
		};

		// Fünf Programme, je Track eines (Index modulo fünf) — alle aus
		// ganz kleinen Punkten auf fast Weiß, jedes in anderer Formation
		const PAPER = "#fcfcfc", BLUE = "#2440c9", RED = "#e8401c", YELLOW = "#f5c518", BLACK = "#141414";
		const COLS = [BLUE, RED, YELLOW, BLACK];
		const kreise = () => {
			let t = 0;
			return {
				init() { t = 0; },
				draw(s, lv) {
					s.background(PAPER);
					const cx = s.width / 2, cy = s.height / 2;
					const u = Math.min(s.width, s.height);
					t += 0.0012 + lv.low * 0.002;
					s.noStroke();
					const ringe = [
						[0.16, BLUE, lv.low, 24, 1],
						[0.28, RED, lv.mid, 38, -0.55],
						[0.4, YELLOW, lv.high, 52, 0.35],
						[0.52, BLACK, lv.mid, 68, -0.2],
					];
					for (const [rr, col, e, n, sp] of ringe) {
						s.fill(col);
						for (let i = 0; i < n; i++) {
							const a = t * sp * 5 + (i / n) * s.TWO_PI;
							const w = bins[(i * 3) % bins.length] / 255;
							s.circle(cx + Math.cos(a) * u * rr, cy + Math.sin(a) * u * rr, 2 + e * 5 + w * 4);
						}
					}
					s.fill(BLACK);
					s.circle(cx, cy, 3 + lv.low * 8);
				},
			};
		};
		const puls = () => {
			let rings = [], cool = 0;
			return {
				init() { rings = []; cool = 0; },
				draw(s, lv) {
					s.background(PAPER);
					const cx = s.width / 2, cy = s.height / 2;
					if (lv.low > 0.4 && cool <= 0) {
						rings.push([0, COLS[rings.length % 4]]);
						cool = 12;
					}
					cool--;
					rings = rings.filter((r) => r[0] < s.width * 0.8);
					s.noStroke();
					for (const r of rings) {
						r[0] += 1.5 + lv.low * 6;
						const n = Math.max(14, Math.floor(r[0] / 7));
						s.fill(r[1]);
						for (let i = 0; i < n; i++) {
							const a = (i / n) * s.TWO_PI;
							s.circle(cx + Math.cos(a) * r[0], cy + Math.sin(a) * r[0], 2 + lv.mid * 4);
						}
					}
					s.fill(BLACK);
					s.circle(cx, cy, 3 + lv.low * 9);
				},
			};
		};
		const raster = () => {
			return {
				init() {},
				draw(s, lv) {
					s.background(PAPER);
					const n = 26, c = s.width / n, m = Math.ceil(s.height / c);
					s.noStroke();
					let k = 0;
					for (let y = 0; y < m; y++)
						for (let x = 0; x < n; x++) {
							const e = bins[(k * 5) % bins.length] / 255;
							s.fill(COLS[(x + y) % 4]);
							s.circle(x * c + c / 2, y * c + c / 2, 1.2 + e * 6);
							k++;
						}
				},
			};
		};
		const wellen = () => {
			return {
				init() {},
				draw(s, lv) {
					s.background(PAPER);
					const rows = 6;
					s.noStroke();
					for (let r = 0; r < rows; r++) {
						const y0 = (s.height * (r + 1)) / (rows + 1);
						s.fill(COLS[r % 4]);
						for (let i = 0; i < wave.length; i += 10) {
							const x = (i / wave.length) * s.width;
							const amp = (0.25 + r * 0.1) * (0.4 + lv.mid * 1.4);
							s.circle(x, y0 + (wave[(i + r * 60) % wave.length] - 128) * amp, 2 + lv.high * 4);
						}
					}
				},
			};
		};
		const orbits = () => {
			return {
				init() {},
				draw(s, lv) {
					s.background(PAPER);
					const cx = s.width / 2, cy = s.height / 2;
					const u = Math.min(s.width, s.height);
					s.noStroke();
					for (let i = 0; i < 80; i++) {
						const e = bins[i % bins.length] / 255;
						const a = s.frameCount * (0.002 + i * 0.0004) + i;
						const r = u * 0.05 + i * u * 0.0072;
						s.fill(COLS[i % 4]);
						s.circle(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.75, 2 + e * 8);
					}
				},
			};
		};
		const progs = [kreise(), puls(), raster(), wellen(), orbits()];
		let prog = null;
		let sk = null;
		new p5((s) => {
			sk = s;
			s.setup = () => {
				s.createCanvas(innerWidth, innerHeight).parent("viz");
				s.noLoop();
			};
			s.windowResized = () => s.resizeCanvas(innerWidth, innerHeight);
			s.draw = () => {
				an.getByteFrequencyData(bins);
				an.getByteTimeDomainData(wave);
				const lv = { low: band(1, 8), mid: band(8, 40), high: band(40, 110) };
				if (prog) prog.draw(s, lv);
			};
		});
		viz = {
			start(li) {
				actx.resume();
				if (!sk) return;
				const idx = Array.prototype.indexOf.call(trackList, li);
				prog = progs[((idx % progs.length) + progs.length) % progs.length];
				// Grundzustand zurücksetzen, bevor das Programm übernimmt
				sk.colorMode(sk.RGB, 255);
				sk.rectMode(sk.CORNER);
				sk.noStroke();
				prog.init(sk);
				sk.loop();
			},
			stop() {
				setTimeout(() => sk && sk.noLoop(), 1300);
			},
		};
	}
	let moveTimer = 0;
	const enterListening = (li) => {
		ensureViz();
		li.classList.add("current");
		document.body.classList.add("listening");
		if (lenis) lenis.stop();
		// Jukebox: erst blendet der Rest der Liste aus, dann erst fährt
		// der Titel in die Mitte und das Visual kommt dazu
		clearTimeout(moveTimer);
		moveTimer = setTimeout(() => {
			// Layout-Position statt getBoundingClientRect, damit ein noch
			// laufender Transform die Messung nicht verfälscht
			let y = 0;
			for (let el = li; el; el = el.offsetParent) y += el.offsetTop;
			const center = y - scrollY + li.offsetHeight / 2;
			li.style.transform = `translateY(${Math.round(innerHeight / 2 - center)}px)`;
			document.body.classList.add("viz-in");
			viz && viz.start(li);
		}, 850);
	};
	const exitListening = () => {
		clearTimeout(moveTimer);
		if (lenis) lenis.start();
		const cur = document.querySelector(".track.current");
		document.body.classList.remove("listening");
		document.body.classList.remove("viz-in");
		// Scroll-Ausgleich nur, wenn die Zeile schon eingefahren war
		if (cur && cur.style.transform) {
			// Die Zeile bleibt optisch stehen: Transform fällt ohne
			// Übergang weg, dafür springt der Scroll an die Stelle, an
			// der ihre natürliche Position genau mittig liegt
			let y = 0;
			for (let el = cur; el; el = el.offsetParent) y += el.offsetTop;
			cur.style.transition = "none";
			cur.style.transform = "";
			const top = Math.round(y + cur.offsetHeight / 2 - innerHeight / 2);
			if (lenis) {
				lenis.start();
				lenis.scrollTo(top, { immediate: true });
			} else {
				window.scrollTo({ top, behavior: "instant" });
			}
			requestAnimationFrame(() => (cur.style.transition = ""));
		}
		for (const li of trackList) {
			li.classList.remove("current");
			li.style.transform = "";
		}
		viz && viz.stop();
	};
	audio.addEventListener("ended", () => {
		if (current) {
			stopRow(current);
			current.style.setProperty("--p", "100%");
			current._t = 0;
		}
		current = null;
		exitListening();
	});
	for (const li of trackList) {
		btnOf(li).addEventListener("click", () => {
			const btn = btnOf(li);
			if (current === li && !audio.paused) {
				audio.pause();
				btn.textContent = "play";
				exitListening();
				return;
			}
			if (current && current !== li) {
				stopRow(current);
				current._t = audio.currentTime;
				current.classList.remove("current");
				current.style.transform = "";
			}
			if (current !== li) {
				current = li;
				audio.src = li.dataset.src;
				// dort weitermachen, wo die Spur zuletzt stand
				if (li._t) {
					audio.addEventListener(
						"loadedmetadata",
						() => {
							if (li._t < audio.duration - 1) audio.currentTime = li._t;
						},
						{ once: true }
					);
				}
				barCur = parseFloat(li.style.getPropertyValue("--p")) || 0;
			}
			audio.play().then(
				() => {
					btn.textContent = "pause";
					enterListening(li);
				},
				() => {
					// Datei fehlt noch: kurz "bald" zeigen
					btn.textContent = "bald";
					setTimeout(() => (btn.textContent = "play"), 1600);
					current = null;
				}
			);
		});
	}
}

// Kontakt: baut aus den Feldern eine Mail und öffnet das Mailprogramm
const form = document.querySelector("form.contact");
if (form) {
	form.addEventListener("submit", (e) => {
		e.preventDefault();
		const d = new FormData(form);
		const subject = encodeURIComponent(`Anfrage von ${d.get("name")}`);
		const body = encodeURIComponent(`${d.get("message")}\n\n${d.get("name")}\n${d.get("email")}`);
		location.href = `mailto:me@julianthurner.com?subject=${subject}&body=${body}`;
	});
}

// Leichtes Lenis-Smooth-Scrolling; die Snap-Startseite bleibt nativ
let lenis = null;
if (window.Lenis && !reduceMotion && !document.querySelector("main.snap") && !document.querySelector(".shelf")) {
	lenis = new Lenis({ lerp: 0.14 });
	(function raf(t) {
		lenis.raf(t);
		requestAnimationFrame(raf);
	})(performance.now());
}

// Cursor-Duo: der Punkt folgt zügig, der Ring zieht wie durch
// Watte hinterher; über Links wächst der Ring, beim Klick zuckt er
const dot = document.getElementById("cursor");
const ring = document.getElementById("cursor-ring");
if (dot && ring && matchMedia("(pointer: fine)").matches) {
	let px = 0, py = 0, dx = 0, dy = 0, rx = 0, ry = 0, seen = false;
	const place = (el, x, y) =>
		(el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`);
	addEventListener("pointermove", (e) => {
		px = e.clientX;
		py = e.clientY;
		if (!seen) {
			seen = true;
			dx = rx = px;
			dy = ry = py;
			dot.style.opacity = "1";
			ring.style.opacity = "1";
		}
		document.body.classList.toggle("cursor-hover", !!e.target.closest("a, button"));
		if (reduceMotion) {
			place(dot, px, py);
			place(ring, px, py);
		}
	});
	document.documentElement.addEventListener("pointerleave", () => {
		seen = false;
		dot.style.opacity = "0";
		ring.style.opacity = "0";
	});
	addEventListener("pointerdown", () => document.body.classList.add("cursor-down"));
	addEventListener("pointerup", () => document.body.classList.remove("cursor-down"));
	if (!reduceMotion) {
		(function follow() {
			dx += (px - dx) * 0.4;
			dy += (py - dy) * 0.4;
			rx += (px - rx) * 0.12;
			ry += (py - ry) * 0.12;
			place(dot, dx, dy);
			place(ring, rx, ry);
			requestAnimationFrame(follow);
		})();
	}
}

// Regal: das Rad setzt ein Ziel, das Regal gleitet sanft hin
const shelf = document.querySelector(".shelf");
if (shelf) {
	let target = shelf.scrollLeft, cur = target, raf = null;
	const step = () => {
		cur += (target - cur) * 0.14;
		if (Math.abs(target - cur) < 0.5) {
			cur = target;
			raf = null;
		} else {
			raf = requestAnimationFrame(step);
		}
		shelf.scrollLeft = cur;
	};
	shelf.addEventListener(
		"wheel",
		(e) => {
			e.preventDefault();
			e.stopPropagation();
			target += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
			target = Math.max(0, Math.min(shelf.scrollWidth - shelf.clientWidth, target));
			if (reduceMotion) {
				cur = target;
				shelf.scrollLeft = target;
			} else if (!raf) {
				raf = requestAnimationFrame(step);
			}
		},
		{ passive: false }
	);
	shelf.addEventListener("scroll", () => {
		if (!raf) cur = target = shelf.scrollLeft;
	});
}

// Rückweg zum Textemenü: die Bücher fahren von rechts herein
const shelfReturn = document.querySelector(".shelf-return");
if (shelfReturn) {
	shelfReturn.addEventListener("click", () => {
		if (reduceMotion) {
			location.href = shelfReturn.dataset.href;
			return;
		}
		shelfReturn.classList.add("in");
		shelfReturn.addEventListener(
			"transitionend",
			() => (location.href = shelfReturn.dataset.href),
			{ once: true }
		);
	});
}

// Galerie-Karussell: endlos in beide Richtungen, per Klonen an
// beiden Enden ohne Rücklauf-Sprung; Videos spielen nur sichtbar
for (const sl of document.querySelectorAll(".slider")) {
	const slides = sl.querySelector(".slides");
	const real = [...slides.children];
	const n = real.length;
	if (n > 1) {
		const first = real[0].cloneNode(true);
		const last = real[n - 1].cloneNode(true);
		for (const c of [first, last]) {
			c.removeAttribute("data-film");
			for (const v of c.querySelectorAll("video")) {
				v.removeAttribute("autoplay");
				v.preload = "metadata";
			}
		}
		slides.appendChild(first);
		slides.insertBefore(last, slides.firstChild);
	}
	let i = n > 1 ? 1 : 0;
	const set = (anim) => {
		slides.style.transition = anim ? "" : "none";
		slides.style.transform = `translateX(-${i * 100}%)`;
		if (!anim) void slides.offsetWidth;
	};
	set(false);
	// "Film anschauen" sitzt in der Titelzeile und zeigt sich nur,
	// solange das Bild mit dem Film steht
	const film = sl.closest(".hero")?.querySelector(".film-btn");
	const showFilm = (on) => {
		if (!film) return;
		const f = slides.children[i];
		const yes = on && f.hasAttribute("data-film");
		film.classList.toggle("on", yes);
		if (yes) film.figure = f;
	};
	showFilm(true);
	const syncVideos = () => {
		[...slides.children].forEach((f, k) => {
			const v = f.querySelector("video");
			if (v) {
				if (k === i) v.play().catch(() => {});
				else v.pause();
			}
		});
	};
	let busy = false;
	const settle = () => {
		busy = false;
		if (i === 0) {
			i = n;
			set(false);
		} else if (i === n + 1) {
			i = 1;
			set(false);
		}
		syncVideos();
		showFilm(true);
	};
	const go = (d) => {
		if (n < 2) return;
		if (reduceMotion) {
			i = ((i - 1 + d + n) % n) + 1;
			set(false);
			syncVideos();
			showFilm(true);
			return;
		}
		if (busy) return;
		busy = true;
		showFilm(false);
		i += d;
		set(true);
	};
	slides.addEventListener("transitionend", (e) => {
		if (e.target === slides) settle();
	});
	sl.querySelector(".prev").addEventListener("click", () => go(-1));
	sl.querySelector(".next").addEventListener("click", () => go(1));
}

// Objektiv per WebGL: zum Rand hin leicht verzogen, mit Farbsaum und
// weicher Bokeh-Unschärfe (helle Stellen blühen auf). Ein gemeinsamer
// WebGL-Kontext rechnet, jede Figur bekommt eine Leinwand darüber, die
// zur Mitte hin durchsichtig wird: dort bleibt das scharfe Original.
// Läuft nach dem Karussell, damit auch die Klone eine Leinwand haben
(() => {
	const frames = [...document.querySelectorAll(".work-frame")];
	if (!frames.length) return;
	const glc = document.createElement("canvas");
	const gl = glc.getContext("webgl", { antialias: false, premultipliedAlpha: true });
	if (!gl) return;
	const vs = `
		attribute vec2 a;
		varying vec2 v;
		void main() {
			v = vec2(a.x * 0.5 + 0.5, 0.5 - a.y * 0.5);
			gl_Position = vec4(a, 0.0, 1.0);
		}`;
	const fs = `
		precision mediump float;
		varying vec2 v;
		uniform sampler2D t;
		uniform vec2 crop;    // object-fit: cover nachbauen
		uniform float aspect; // Breite / Höhe der Figur
		uniform vec2 px;      // ein Pixel in Figur-Koordinaten
		uniform float blur;   // größter Bokeh-Radius in Pixeln (Ecken)
		uniform float ca;     // Farbsaum: Rot/Blau leicht anders vergrößert
		uniform float warp;   // Verzug: Ränder gedehnt
		vec2 tc(vec2 f) { return 0.5 + (f - 0.5) * crop; }
		void main() {
			vec2 p = v - 0.5;
			// 0 in der Mitte, 1 in den Ecken, unabhängig vom Format
			vec2 q = vec2(p.x * aspect, p.y) / (0.5 * sqrt(aspect * aspect + 1.0));
			float r2 = dot(q, q);
			float a = smoothstep(0.1, 0.3, r2);
			if (a <= 0.0) {
				gl_FragColor = vec4(0.0);
				return;
			}
			float r4 = r2 * r2;
			vec2 f = 0.5 + p * (1.0 - warp * r4);
			float rad = blur * smoothstep(0.3, 1.0, r2);
			float c = ca * r4;
			vec3 col = vec3(0.0);
			float wsum = 0.0;
			for (int i = 0; i < 12; i++) {
				float fi = float(i);
				float ang = fi * 2.39996;
				float rr = sqrt((fi + 0.5) / 12.0) * rad;
				vec2 g = f + vec2(cos(ang), sin(ang)) * rr * px;
				vec2 d = g - 0.5;
				vec3 s = vec3(
					texture2D(t, tc(0.5 + d * (1.0 + c))).r,
					texture2D(t, tc(g)).g,
					texture2D(t, tc(0.5 + d * (1.0 - c))).b
				);
				float l = dot(s, vec3(0.299, 0.587, 0.114));
				float w = 1.0 + 3.0 * l * l * l * l;
				col += s * w;
				wsum += w;
			}
			gl_FragColor = vec4(col / wsum * a, a);
		}`;
	const shader = (type, src) => {
		const sh = gl.createShader(type);
		gl.shaderSource(sh, src);
		gl.compileShader(sh);
		return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
	};
	const vsh = shader(gl.VERTEX_SHADER, vs);
	const fsh = shader(gl.FRAGMENT_SHADER, fs);
	if (!vsh || !fsh) return;
	const prog = gl.createProgram();
	gl.attachShader(prog, vsh);
	gl.attachShader(prog, fsh);
	gl.linkProgram(prog);
	if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
	gl.useProgram(prog);
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
	const aLoc = gl.getAttribLocation(prog, "a");
	gl.enableVertexAttribArray(aLoc);
	gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
	gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	const u = (n) => gl.getUniformLocation(prog, n);
	const uCrop = u("crop");
	const uAspect = u("aspect");
	const uPx = u("px");
	gl.uniform1f(u("blur"), 6);
	gl.uniform1f(u("ca"), 0.005);
	gl.uniform1f(u("warp"), 0.03);

	// Leinwand in CSS-Pixeln: am Rand ist ohnehin alles weich, und so
	// bleibt der Speicher klein
	const render = (frame) => {
		const m = frame.querySelector("img, video");
		const mw = m.naturalWidth || m.videoWidth;
		const mh = m.naturalHeight || m.videoHeight;
		if (!mw || !mh || (m.tagName === "VIDEO" && m.readyState < 2)) return;
		const W = frame.clientWidth;
		const H = frame.clientHeight;
		if (!W || !H) return;
		const cv = frame.lensCanvas;
		if (cv.width !== W || cv.height !== H) {
			cv.width = W;
			cv.height = H;
		}
		if (glc.width !== W || glc.height !== H) {
			glc.width = W;
			glc.height = H;
		}
		gl.viewport(0, 0, W, H);
		const fa = W / H;
		const ma = mw / mh;
		gl.uniform2f(uCrop, ma > fa ? fa / ma : 1, ma > fa ? 1 : ma / fa);
		gl.uniform1f(uAspect, fa);
		gl.uniform2f(uPx, 1 / W, 1 / H);
		try {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, m);
		} catch {
			return;
		}
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		const c2 = cv.getContext("2d");
		c2.clearRect(0, 0, W, H);
		c2.drawImage(glc, 0, 0);
	};

	// nur sichtbare Figuren rechnen fortlaufend (laufende Videos)
	const seen = new Set();
	const io = new IntersectionObserver((entries) => {
		for (const e of entries) {
			if (e.isIntersecting) {
				seen.add(e.target);
				render(e.target);
			} else {
				seen.delete(e.target);
			}
		}
	});
	for (const f of frames) {
		const cv = document.createElement("canvas");
		cv.className = "lens-canvas";
		cv.setAttribute("aria-hidden", "true");
		f.appendChild(cv);
		f.lensCanvas = cv;
		io.observe(f);
		const m = f.querySelector("img, video");
		if (!m) continue;
		if (m.tagName === "IMG") {
			if (m.complete) render(f);
			else m.addEventListener("load", () => render(f));
			continue;
		}
		m.addEventListener("loadeddata", () => render(f));
		m.addEventListener("seeked", () => render(f));
		const frameCb = m.requestVideoFrameCallback
			? (cb) => m.requestVideoFrameCallback(cb)
			: (cb) => requestAnimationFrame(cb);
		const tick = () => {
			if (seen.has(f) && !m.paused) render(f);
			frameCb(tick);
		};
		frameCb(tick);
	}
	let resizeT = 0;
	addEventListener("resize", () => {
		clearTimeout(resizeT);
		resizeT = setTimeout(() => frames.forEach(render), 150);
	});
	document.documentElement.classList.add("lensgl");
})();

// Kinomodus: Film mit Ton auf Schwarz, alles andere blendet aus,
// der Film skaliert dabei aufs Vollformat
let cinemaVideo = null;
let cinemaFrame = null;
let cinemaFadeRaf = 0;
const fadeAudioIn = (v, dur = 1400) => {
	cancelAnimationFrame(cinemaFadeRaf);
	v.volume = 0;
	v.muted = false;
	const t0 = performance.now();
	const step = (t) => {
		const k = Math.min(1, (t - t0) / dur);
		v.volume = k * k; // leise beginnen, weich anschwellen
		if (k < 1) cinemaFadeRaf = requestAnimationFrame(step);
	};
	cinemaFadeRaf = requestAnimationFrame(step);
};
const closeCinema = () => {
	if (!cinemaVideo) return;
	cancelAnimationFrame(cinemaFadeRaf);
	document.body.classList.remove("cinema");
	cinemaFrame.classList.remove("cinema-stage");
	cinemaVideo.muted = true;
	cinemaVideo.volume = 1;
	cinemaVideo = null;
	cinemaFrame = null;
};
for (const btn of document.querySelectorAll(".film-btn")) {
	btn.addEventListener("click", () => {
		if (!btn.figure) return;
		// ein offenes Info-Panel schließt mit
		for (const hero of document.querySelectorAll(".hero.open")) {
			hero.classList.remove("open");
			hero.querySelector(".more").setAttribute("aria-expanded", "false");
		}
		cinemaFrame = btn.figure.querySelector(".work-frame");
		cinemaVideo = cinemaFrame.querySelector("video");
		cinemaFrame.classList.add("cinema-stage");
		document.body.classList.add("cinema");
		fadeAudioIn(cinemaVideo);
		cinemaVideo.play().catch(() => {});
	});
}
document.querySelector(".cinema-close") && document.querySelector(".cinema-close").addEventListener("click", closeCinema);
addEventListener("keydown", (e) => {
	if (e.key === "Escape") closeCinema();
});

// Eigene Kinoleiste: pause/play als Wort, rote Linie zum Springen, Zeit
const cBar = document.querySelector(".cinema-bar");
if (cBar) {
	const cPlay = cBar.querySelector(".c-play");
	const cTrack = cBar.querySelector(".c-track");
	const cProg = cBar.querySelector(".c-prog");
	const cTime = cBar.querySelector(".c-time");
	const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
	cPlay.addEventListener("click", () => {
		if (!cinemaVideo) return;
		if (cinemaVideo.paused) {
			cinemaVideo.play().catch(() => {});
			cPlay.textContent = "pause";
		} else {
			cinemaVideo.pause();
			cPlay.textContent = "play";
		}
	});
	const seek = (e) => {
		if (!cinemaVideo || !cinemaVideo.duration) return;
		const r = cTrack.getBoundingClientRect();
		cinemaVideo.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * cinemaVideo.duration;
	};
	cTrack.addEventListener("pointerdown", (e) => {
		seek(e);
		const move = (ev) => seek(ev);
		const up = () => {
			removeEventListener("pointermove", move);
			removeEventListener("pointerup", up);
		};
		addEventListener("pointermove", move);
		addEventListener("pointerup", up);
	});
	(function cTick() {
		if (cinemaVideo && cinemaVideo.duration) {
			cProg.style.width = (cinemaVideo.currentTime / cinemaVideo.duration) * 100 + "%";
			cTime.textContent = `${fmt(cinemaVideo.currentTime)} / ${fmt(cinemaVideo.duration)}`;
			cPlay.textContent = cinemaVideo.paused ? "play" : "pause";
		}
		requestAnimationFrame(cTick);
	})();
	addEventListener("keydown", (e) => {
		if (e.key === " " && cinemaVideo) {
			e.preventDefault();
			cPlay.click();
		}
	});
}
