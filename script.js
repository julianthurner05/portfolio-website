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

	// Hörmodus: Liste blendet aus, nur der laufende Titel bleibt,
	// dahinter ein abstraktes, audio-reaktives p5-Visual
	let viz = null;
	function ensureViz() {
		if (viz || !window.p5 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const actx = new (window.AudioContext || window.webkitAudioContext)();
		const an = actx.createAnalyser();
		an.fftSize = 256;
		actx.createMediaElementSource(audio).connect(an);
		an.connect(actx.destination);
		const data = new Uint8Array(an.frequencyBinCount);
		const band = (a, b) => {
			let s = 0;
			for (let i = a; i < b; i++) s += data[i];
			return s / ((b - a) * 255);
		};
		let sk = null;
		new p5((s) => {
			sk = s;
			let t = 0;
			s.setup = () => {
				s.createCanvas(innerWidth, innerHeight).parent("viz");
				s.noLoop();
			};
			s.windowResized = () => s.resizeCanvas(innerWidth, innerHeight);
			s.draw = () => {
				an.getByteFrequencyData(data);
				const low = band(1, 8), mid = band(8, 40), high = band(40, 110);
				s.background("#fcfcfc");
				const cx = s.width / 2, cy = s.height / 2;
				const u = Math.min(s.width, s.height);
				t += 0.0025 + low * 0.004;
				s.noFill();
				s.stroke("#141414");
				s.strokeWeight(2);
				s.circle(cx, cy, u * (0.55 + low * 0.12));
				s.noStroke();
				s.fill("#2440c9");
				s.circle(cx + Math.cos(t) * u * 0.22, cy + Math.sin(t) * u * 0.18, u * (0.16 + low * 0.22));
				s.fill("#e8401c");
				s.circle(cx + Math.cos(-t * 1.7 + 2) * u * 0.3, cy + Math.sin(-t * 1.7 + 2) * u * 0.24, u * (0.08 + mid * 0.18));
				s.fill("#f5c518");
				s.circle(cx + Math.cos(t * 2.6 + 4) * u * 0.36, cy + Math.sin(t * 2.6 + 4) * u * 0.3, u * (0.045 + high * 0.14));
				s.fill("#141414");
				s.circle(cx, cy, u * (0.012 + mid * 0.02));
			};
		});
		viz = {
			start() {
				actx.resume();
				if (sk) sk.loop();
			},
			stop() {
				setTimeout(() => sk && sk.noLoop(), 1300);
			},
		};
	}
	const enterListening = (li) => {
		ensureViz();
		li.classList.add("current");
		document.body.classList.add("listening");
		viz && viz.start();
	};
	const exitListening = () => {
		document.body.classList.remove("listening");
		for (const li of trackList) li.classList.remove("current");
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
