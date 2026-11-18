const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Escape schließt offene Infobox-Panels
addEventListener("keydown", (e) => {
	if (e.key !== "Escape") return;
	for (const hero of document.querySelectorAll(".hero.open")) {
		hero.classList.remove("open");
		hero.querySelector(".more").setAttribute("aria-expanded", "false");
	}
});

// Infobox-Panel pro Projekt: fährt von unten hoch, X schließt
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

// Vollbild-Slider der Designprojekte: Pfeile blättern, Videos
// spielen nur auf der sichtbaren Folie
for (const sl of document.querySelectorAll(".slider")) {
	const slides = sl.querySelector(".slides");
	const n = slides.children.length;
	let i = 0;
	const go = (d) => {
		i = (i + d + n) % n;
		slides.style.transform = `translateX(-${i * 100}%)`;
		[...slides.children].forEach((f, k) => {
			const v = f.querySelector("video");
			if (v) {
				if (k === i) v.play().catch(() => {});
				else v.pause();
			}
		});
	};
	sl.querySelector(".prev").addEventListener("click", () => go(-1));
	sl.querySelector(".next").addEventListener("click", () => go(1));
}
