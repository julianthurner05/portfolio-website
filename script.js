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
