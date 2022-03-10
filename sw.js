var CACHE_STATIC_NAME = "kiku-static-cache-v2";
var CACHE_DYNAMIC_NAME = "kiku-dynamic-cache-v2";
var urlsToCache = [
  "",
  "/",
  "index.html",
  "manifest.json",
  "favicon.ico",
  "css/images/cancel_@2X.png",
  "css/images/cancel.png",
  "css/images/check_@2X.png",
  "css/images/check.png",
  "css/images/focus_@2X.png",
  "css/images/focus.png",
  "css/images/layers-2x.png",
  "css/images/layers.png",
  "css/images/marker-icon-2x.png",
  "css/images/marker-icon.png",
  "css/images/marker-shadow.png",
  "css/images/measure-control.png",
  "css/images/rulers_@2X.png",
  "css/images/rulers.png",
  "css/images/start_@2X.png",
  "css/images/start.png",
  "css/images/throbber.gif",
  "css/images/trash_@2X.png",
  "css/images/trash.png",
  "css/fontawesome-all.min.css",
  "css/L.Control.Locate.min.css",
  "css/leaflet-control-geocoder.Geocoder.css",
  "css/leaflet.css",
  "css/MarkerCluster.css",
  "css/MarkerCluster.Default.css",
  "css/qgis2web.css",
  "data/kiku2_2.js",
  "data/Route_ORS_1.js",
  "images/icons/app-icon-48x48.png",
  "images/icons/app-icon-96x96.png",
  "images/icons/app-icon-144x144.png",
  "images/icons/app-icon-192x192.png",
  "images/icons/app-icon-256x256.png",
  "images/icons/app-icon-384x384.png",
  "images/icons/app-icon-512x512.png",
  "js/Autolinker.min.js",
  "js/L.Control.Locate.min.js",
  "js/labelgun.min.js",
  "js/labels.js",
  "js/leaflet-control-geocoder.Geocoder.js",
  "js/leaflet-hash.js",
  "js/leaflet-heat.js",
  "js/leaflet-svg-shape-markers.min.js",
  "js/leaflet-tilelayer-wmts.js",
  "js/leaflet.js",
  "js/leaflet.markercluster.js",
  "js/leaflet.pattern.js",
  "js/leaflet.rotatedMarker.js",
  "js/Leaflet.VectorGrid.js",
  "js/leaflet.wms.js",
  "js/multi-style-layer.js",
  "js/OSMBuildings-Leaflet.js",
  "js/qgis2web_expressions.js",
  "js/rbush.min.js",
  "js/zip-full.min.js",
  "legend/kiku2_2.png",
  "legend/Route_ORS_1.png",
  "webfonts/fa-solid-900.ttf",
  "webfonts/fa-solid-900.woff2",
];

self.importScripts("js/zip-full.min.js");

self.addEventListener("install", function (event) {
  // Perform install steps
  console.log("sw install", event);
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME).then(async function (cache) {
      console.log("Opened cache");
      let dataResp = await fetch("tiles/tiles.zip");
      if (dataResp) {
        console.log("2inst", dataResp);
        let blob = await dataResp.blob();
        console.log("3inst", blob);
        zip.configure({
          useWebWorkers: false,
        });
        let br = new zip.BlobReader(blob);
        br.useWebWorkers = false;
        let zr = new zip.ZipReader(br);
        entries = await zr.getEntries();
        for (let entry of entries) {
          if (!entry.filename.endsWith(".png")) continue;
          let exists = await cache.match("/tiles/" + entry.filename);
          if (exists) {
            continue;
          }
          let data = await entry.getData(new zip.BlobWriter());
          caches.open(CACHE_STATIC_NAME).then(async function (cache) {
            let resp = new Response(data, {
              status: 200,
              statusText: "OK",
              headers: { "Content-Type": "image/png" },
            });
            await cache.put("/tiles/" + entry.filename, resp);
          });
        }
      }

      console.log("addAll1");
      await cache.addAll(urlsToCache);
      console.log("addAll2");
    }),
  );
});

self.addEventListener("activate", function (event) {
  console.log("sw activated", event);
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (
            cacheName.startsWith("kiku-") &&
            cacheName !== CACHE_STATIC_NAME &&
            cacheName !== CACHE_DYNAMIC_NAME
          ) {
            console.log("delete cache ", cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
});

self.addEventListener("fetch", function (event) {
  console.log("fetch", event.request.url);
  event.respondWith(
    caches.match(event.request).then(function (response) {
      // Cache hit - return response
      if (response) {
        return response;
      }
      return fetch(event.request)
        .then(function (response) {
          // Check if we received a valid response
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }
          // IMPORTANT: Clone the response. A response is a stream
          // and because we want the browser to consume the response
          // as well as the cache consuming the response, we need
          // to clone it so we have two streams.
          var responseToCache = response.clone();

          caches.open(CACHE_DYNAMIC_NAME).then(function (cache) {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(function (reason) {
          return null;
        });
    }),
  );
});
