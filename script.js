// Menü-Overlay auf/zu, Escape schließt
const btn = document.querySelector(".menu-btn");
btn.addEventListener("click", () => {
	const open = document.body.classList.toggle("menu-open");
	btn.setAttribute("aria-expanded", open);
});
addEventListener("keydown", (e) => {
	if (e.key !== "Escape") return;
	if (document.body.classList.contains("menu-open")) {
		document.body.classList.remove("menu-open");
		btn.setAttribute("aria-expanded", "false");
	}
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
	const stopRow = (li) => {
		btnOf(li).textContent = "play";
		li.style.setProperty("--p", "0%");
	};

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

		// Fünf Programme, je Track eines (Index modulo fünf) — alle hell
		// und nah an der ersten Fassung: Formen auf fast Weiß
		const PAPER = "#fcfcfc", BLUE = "#2440c9", RED = "#e8401c", YELLOW = "#f5c518", BLACK = "#141414";
		const kreise = () => {
			let t = 0;
			return {
				init() { t = 0; },
				draw(s, lv) {
					s.background(PAPER);
					const cx = s.width / 2, cy = s.height / 2;
					const u = Math.min(s.width, s.height);
					t += 0.0025 + lv.low * 0.004;
					s.noFill();
					s.stroke(BLACK);
					s.strokeWeight(2);
					s.circle(cx, cy, u * (0.55 + lv.low * 0.12));
					s.noStroke();
					s.fill(BLUE);
					s.circle(cx + Math.cos(t) * u * 0.22, cy + Math.sin(t) * u * 0.18, u * (0.16 + lv.low * 0.22));
					s.fill(RED);
					s.circle(cx + Math.cos(-t * 1.7 + 2) * u * 0.3, cy + Math.sin(-t * 1.7 + 2) * u * 0.24, u * (0.08 + lv.mid * 0.18));
					s.fill(YELLOW);
					s.circle(cx + Math.cos(t * 2.6 + 4) * u * 0.36, cy + Math.sin(t * 2.6 + 4) * u * 0.3, u * (0.045 + lv.high * 0.14));
					s.fill(BLACK);
					s.circle(cx, cy, u * (0.012 + lv.mid * 0.02));
				},
			};
		};
		const ringe = () => {
			let rings = [], cool = 0;
			return {
				init() { rings = []; cool = 0; },
				draw(s, lv) {
					s.background(PAPER);
					const u = Math.min(s.width, s.height);
					if (lv.low > 0.4 && cool <= 0) { rings.push(0); cool = 12; }
					cool--;
					rings = rings.filter((r) => r < s.width * 1.3);
					s.noFill();
					s.stroke(BLACK);
					s.strokeWeight(1.5);
					for (let i = 0; i < rings.length; i++) {
						rings[i] += 2.5 + lv.low * 9;
						s.circle(s.width / 2, s.height / 2, rings[i]);
					}
					s.stroke(BLUE);
					s.strokeWeight(3);
					s.circle(s.width / 2, s.height / 2, u * (0.3 + lv.mid * 0.14));
					s.stroke(YELLOW);
					s.circle(s.width / 2, s.height / 2, u * (0.46 + lv.high * 0.1));
					s.noStroke();
					s.fill(RED);
					s.circle(s.width / 2, s.height / 2, u * (0.03 + lv.low * 0.06));
				},
			};
		};
		const raster = () => {
			const cols = [BLUE, YELLOW, RED, BLACK];
			return {
				init(s) { s.rectMode(s.CENTER); },
				draw(s, lv) {
					s.background(PAPER);
					const n = 11, c = s.width / n, m = Math.ceil(s.height / c);
					s.noStroke();
					let k = 0;
					for (let y = 0; y < m; y++)
						for (let x = 0; x < n; x++) {
							const e = bins[(k * 7) % bins.length] / 255;
							s.push();
							s.translate(x * c + c / 2, y * c + c / 2);
							s.rotate(s.frameCount * 0.006 + e * s.HALF_PI);
							s.fill(cols[k % 4]);
							const d = c * (0.08 + e * 0.5);
							s.rect(0, 0, d, d);
							s.pop();
							k++;
						}
				},
			};
		};
		const wellen = () => {
			const cols = [BLACK, BLUE, RED, YELLOW];
			return {
				init() {},
				draw(s, lv) {
					s.background(PAPER);
					const rows = 7;
					s.noFill();
					s.strokeWeight(2);
					for (let r = 0; r < rows; r++) {
						const y0 = (s.height * (r + 1)) / (rows + 1);
						s.stroke(cols[r % 4]);
						s.beginShape();
						for (let i = 0; i < wave.length; i += 6) {
							const x = (i / wave.length) * s.width;
							const amp = (0.25 + r * 0.1) * (0.4 + lv.mid * 1.4);
							s.vertex(x, y0 + (wave[(i + r * 60) % wave.length] - 128) * amp);
						}
						s.endShape();
					}
				},
			};
		};
		const orbits = () => {
			const cols = [BLUE, RED, YELLOW, BLACK];
			return {
				init() {},
				draw(s, lv) {
					s.background(PAPER);
					const cx = s.width / 2, cy = s.height / 2;
					const u = Math.min(s.width, s.height);
					s.noStroke();
					for (let i = 0; i < 70; i++) {
						const e = bins[i % bins.length] / 255;
						const a = s.frameCount * (0.002 + i * 0.0004) + i;
						const r = u * 0.06 + i * u * 0.008;
						s.fill(cols[i % 4]);
						s.circle(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.75, 3 + e * 22);
					}
				},
			};
		};
		const progs = [kreise(), ringe(), raster(), wellen(), orbits()];
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
	const enterListening = (li) => {
		ensureViz();
		li.classList.add("current");
		// die Zeile rückt vertikal in die Mitte; Layout-Position statt
		// getBoundingClientRect, damit ein noch laufender Transform
		// die Messung nicht verfälscht
		let y = 0;
		for (let el = li; el; el = el.offsetParent) y += el.offsetTop;
		const center = y - scrollY + li.offsetHeight / 2;
		li.style.transform = `translateY(${Math.round(innerHeight / 2 - center)}px)`;
		document.body.classList.add("listening");
		viz && viz.start(li);
	};
	const exitListening = () => {
		const cur = document.querySelector(".track.current");
		document.body.classList.remove("listening");
		if (cur) {
			// Die Zeile bleibt optisch stehen: Transform fällt ohne
			// Übergang weg, dafür springt der Scroll an die Stelle, an
			// der ihre natürliche Position genau mittig liegt
			let y = 0;
			for (let el = cur; el; el = el.offsetParent) y += el.offsetTop;
			cur.style.transition = "none";
			cur.style.transform = "";
			window.scrollTo({ top: Math.round(y + cur.offsetHeight / 2 - innerHeight / 2), behavior: "instant" });
			requestAnimationFrame(() => (cur.style.transition = ""));
		}
		for (const li of trackList) {
			li.classList.remove("current");
			li.style.transform = "";
		}
		viz && viz.stop();
	};
	audio.addEventListener("timeupdate", () => {
		if (current && audio.duration)
			current.style.setProperty("--p", (audio.currentTime / audio.duration) * 100 + "%");
	});
	audio.addEventListener("ended", () => {
		if (current) stopRow(current);
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
				current.classList.remove("current");
				current.style.transform = "";
			}
			if (current !== li) {
				current = li;
				audio.src = li.dataset.src;
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
