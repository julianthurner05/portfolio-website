// Kleine API fürs Schreibprogramm: ein gemeinsamer Stand in KV,
// geschützt durch einen Schlüssel; alles andere bleiben statische Dateien
export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		if (url.pathname === "/api/schreiben") {
			const key = request.headers.get("x-schreib-key") || "";
			if (!env.SCHREIB_KEY || key !== env.SCHREIB_KEY) {
				return new Response("kein Zutritt", { status: 401 });
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
