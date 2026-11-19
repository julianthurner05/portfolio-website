// Kleine API fürs Schreibprogramm: ein gemeinsamer Stand in KV,
// geschützt durch einen Schlüssel; alles andere bleiben statische Dateien
export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		if (url.pathname === "/api/schreiben") {
			const key = request.headers.get("x-schreib-key") || "";
			// Secret am Worker oder Eintrag "schluessel" im Speicher —
			// Preview-Versionen erben Secrets nicht zuverlässig
			let soll = null;
			let kvFehler = "";
			try {
				soll = await env.SCHREIBEN.get("schluessel");
			} catch (e) {
				kvFehler = encodeURIComponent(String((e && e.message) || e)).slice(0, 120);
			}
			const ok = key && (key === env.SCHREIB_KEY || (soll && key === soll));
			if (!ok) {
				return new Response("kein Zutritt", {
					status: 401,
					headers: {
						"x-diag": "secret:" + (env.SCHREIB_KEY ? "da" : "fehlt") + " kv:" + (kvFehler ? "fehler=" + kvFehler : soll === null ? "leer" : "da"),
					},
				});
			}
			if (request.method === "GET") {
				const stand = await env.SCHREIBEN.get("stand");
				return new Response(stand || "null", {
					headers: { "content-type": "application/json", "cache-control": "no-store" },
				});
			}
			if (request.method === "PUT") {
				const body = await request.text();
				if (body.length > 1000000) return new Response("zu groß", { status: 413 });
				await env.SCHREIBEN.put("stand", body);
				return new Response("ok");
			}
			return new Response("so nicht", { status: 405 });
		}
		return env.ASSETS.fetch(request);
	},
};
