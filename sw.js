// Le service worker : c'est lui qui fait la difference entre une page et une
// application. Il met la page en cache au premier passage, et la sert ensuite
// depuis le disque - donc l'application s'ouvre hors ligne, et instantanement,
// alors que le fichier pese pres de sept megaoctets.
//
// Strategie : cache d'abord, reseau en secours. Pour un terminal dont le
// contenu ne change qu'entre deux constructions, aller au reseau a chaque
// ouverture ne servirait qu'a rallonger le demarrage.
//
// Le numero de version force le renouvellement : republier le terminal sans le
// changer laisserait les fenetres installees sur l'ancienne copie.
const VERSION = "dealmarket-1df706b43fff";
const FICHIERS = ["./", "./index.html", "./manifest.webmanifest",
                  "./icone-192.png", "./icone-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(FICHIERS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())   // hors ligne au premier passage : on n'echoue pas
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(noms => Promise.all(noms.filter(n => n !== VERSION).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(reponse => {
      if (reponse) {
        // On rafraichit en arriere-plan : la prochaine ouverture aura la
        // version a jour sans que celle-ci attende le reseau.
        fetch(e.request)
          .then(r => r.ok && caches.open(VERSION).then(c => c.put(e.request, r.clone())))
          .catch(() => {});
        return reponse;
      }
      return fetch(e.request)
        .then(r => {
          if (r.ok) {
            const copie = r.clone();
            caches.open(VERSION).then(c => c.put(e.request, copie));
          }
          return r;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
