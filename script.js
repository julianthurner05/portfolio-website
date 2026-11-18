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

		// Fünf Programme, je Track eines (Index modulo fünf)
		const flow = () => {
			let pts = [], hue = 0;
			return {
				init(s) {
					s.colorMode(s.HSB, 360, 100, 100, 100);
					pts = Array.from({ length: 350 }, () => [s.random(s.width), s.random(s.height)]);
					s.background(235, 60, 8);
				},
				draw(s, lv) {
					s.noStroke();
					s.fill(235, 60, 8, 7);
					s.rect(0, 0, s.width, s.height);
					hue = (hue + 0.3 + lv.mid * 4) % 360;
					s.stroke(hue, 85, 100, 55);
					s.strokeWeight(1.5 + lv.low * 3);
					const sp = 1.2 + lv.low * 7;
					for (const p of pts) {
						const a = s.noise(p[0] * 0.0013, p[1] * 0.0013, s.frameCount * 0.004) * s.TWO_PI * 2;
						const nx = p[0] + Math.cos(a) * sp, ny = p[1] + Math.sin(a) * sp;
						s.line(p[0], p[1], nx, ny);
						p[0] = (nx + s.width) % s.width;
						p[1] = (ny + s.height) % s.height;
					}
				},
			};
		};
		const pulse = () => {
			let rings = [], cool = 0;
			return {
				init(s) {
					s.colorMode(s.HSB, 360, 100, 100, 100);
					rings = [];
				},
				draw(s, lv) {
					s.background(0, 0, 4);
					if (lv.low > 0.4 && cool <= 0) {
						rings.push(0);
						cool = 10;
					}
					cool--;
					s.noFill();
					rings = rings.filter((r) => r < s.width * 1.3);
					for (let i = 0; i < rings.length; i++) {
						rings[i] += 3 + lv.low * 12;
						s.stroke((rings[i] * 0.25 + 290) % 360, 95, 100, 70);
						s.strokeWeight(2.5);
						s.circle(s.width / 2, s.height / 2, rings[i]);
					}
					s.stroke(185, 95, 100);
					s.strokeWeight(2);
					s.beginShape();
					for (let i = 0; i < wave.length; i += 4) {
						const a = (i / wave.length) * s.TWO_PI;
						const r = Math.min(s.width, s.height) * 0.18 + (wave[i] - 128) * 0.7;
						s.vertex(s.width / 2 + Math.cos(a) * r, s.height / 2 + Math.sin(a) * r);
					}
					s.endShape(s.CLOSE);
				},
			};
		};
		const raster = () => {
			return {
				init(s) {
					s.colorMode(s.HSB, 360, 100, 100, 100);
					s.rectMode(s.CENTER);
				},
				draw(s, lv) {
					s.background(45, 12, 96);
					const n = 12, c = s.width / n, m = Math.ceil(s.height / c);
					s.noStroke();
					let k = 0;
					for (let y = 0; y < m; y++)
						for (let x = 0; x < n; x++) {
							const e = bins[(k++ * 7) % bins.length] / 255;
							s.push();
							s.translate(x * c + c / 2, y * c + c / 2);
							s.rotate(s.frameCount * 0.01 + e * s.PI);
							s.fill((15 + e * 70 + x * 4) % 360, 75, 95);
							s.rect(0, 0, c * (0.15 + e * 0.7), c * (0.15 + e * 0.7));
							s.pop();
						}
				},
			};
		};
		const wellen = () => {
			return {
				init(s) {
					s.colorMode(s.HSB, 360, 100, 100, 100);
				},
				draw(s, lv) {
					s.background(230, 75, 6);
					const rows = 9;
					s.noFill();
					s.strokeWeight(2);
					for (let r = 0; r < rows; r++) {
						const y0 = (s.height * (r + 1)) / (rows + 1);
						s.stroke((135 + r * 14) % 360, 85, 100, 80);
						s.beginShape();
						for (let i = 0; i < wave.length; i += 6) {
							const x = (i / wave.length) * s.width;
							const amp = (0.3 + r * 0.12) * (0.4 + lv.mid * 1.6);
							s.vertex(x, y0 + (wave[(i + r * 60) % wave.length] - 128) * amp);
						}
						s.endShape();
					}
				},
			};
		};
		const orbits = () => {
			return {
				init(s) {
					s.colorMode(s.HSB, 360, 100, 100, 100);
				},
				draw(s, lv) {
					s.background(310, 45, 7);
					const cx = s.width / 2, cy = s.height / 2;
					const u = Math.min(s.width, s.height);
					s.noStroke();
					for (let i = 0; i < 90; i++) {
						const e = bins[i % bins.length] / 255;
						const a = s.frameCount * (0.002 + i * 0.0004) + i;
						const r = u * 0.05 + i * u * 0.0075;
						s.fill((i * 4 + s.frameCount * 0.5) % 360, 85, 100, 80);
						s.circle(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.75, 4 + e * 28);
					}
				},
			};
		};
		const progs = [flow(), pulse(), raster(), wellen(), orbits()];
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
		document.body.classList.remove("listening");
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
