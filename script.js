/*--------------------------------------------------------------------
INITIALIZE MAP
--------------------------------------------------------------------*/

mapboxgl.accessToken =
  "pk.eyJ1IjoiamVzc2ljYWh1YW5nIiwiYSI6ImNtazNjNmdmeTBkN3AzZnEyZHRscHdod28ifQ.Pa9LhzBk1H75KBMwBngDjA";

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/jessicahuang/cmmnx7kte003n01s125302mbb",
  center: [-79.36, 43.73],
  zoom: 10.2,
  bearing: -17,
  pitch: 0,
});

let incidentsData;
let aggregatedIncidents;

/*--------------------------------------------------------------------
LOAD AND AGGREGATE INCIDENT DATA
--------------------------------------------------------------------*/

fetch("data/cleaned/toronto_incidents.geojson")
  .then(res => res.json())
  .then(data => {

    incidentsData = data;

    const locationCounts = {};

    incidentsData.features.forEach(f => {

      const coords = f.geometry.coordinates.join(",");

      if (!locationCounts[coords]) {
        locationCounts[coords] = {
          count: 0,
          types: {}
        };
      }

      locationCounts[coords].count++;

      const type = f.properties.type;

      if (!locationCounts[coords].types[type]) {
        locationCounts[coords].types[type] = 0;
      }

      locationCounts[coords].types[type]++;
    });

    const aggregatedFeatures = Object.entries(locationCounts).map(([coords, data]) => {

      const [lon, lat] = coords.split(",").map(Number);

      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [lon, lat]
        },
        properties: {
          count: data.count,
          types: JSON.stringify(data.types)
        }
      };

    });

    aggregatedIncidents = {
      type: "FeatureCollection",
      features: aggregatedFeatures
    };

    if (map.isStyleLoaded()) {
      map.getSource("incidents").setData(aggregatedIncidents);
    }

  });

/*--------------------------------------------------------------------
ADD DATA SOURCE
--------------------------------------------------------------------*/

map.on("load", () => {

  map.addSource("neighbourhood_crime", {
    type: "geojson",
    data: "https://raw.githubusercontent.com/JessicaCHuang26/GGR472-Project/3ff57eb0b30fbed3c19ab3b774dc0705e91cc974/Neighbourhood_Crime_Rates.geojson",
  });

  map.addLayer({
    id: "neighbourhood_crime",
    type: "fill",
    source: "neighbourhood_crime",
    paint: {
      "fill-color": "blue",
      "fill-opacity": 0.4,
      "fill-outline-color": "#000000",
    },
  });

  /* INCIDENT SOURCE */

  map.addSource("incidents", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: []
    }
  });

  /* INCIDENT CIRCLES */

  map.addLayer({
    id: "incidents",
    type: "circle",
    source: "incidents",
    paint: {

      "circle-radius": [
        "interpolate",
        ["linear"],
        ["get", "count"],
        1, 4,
        5, 8,
        20, 14,
        50, 20
      ],

      "circle-color": "#ff4444",
      "circle-opacity": 0.75,
      "circle-stroke-width": 1,
      "circle-stroke-color": "#ffffff"
    }
  });

  /* COUNT LABELS */

  map.addLayer({
    id: "incident-count-label",
    type: "symbol",
    source: "incidents",
    layout: {
      "text-field": ["get", "count"],
      "text-size": 12
    },
    paint: {
      "text-color": "white"
    }
  });

});

/*--------------------------------------------------------------------
INCIDENT POPUP
--------------------------------------------------------------------*/

map.on("click", "incidents", (e) => {

  const props = e.features[0].properties;
  const types = JSON.parse(props.types);

  let html = "<b>Incidents at this location</b><br><br>";

  Object.entries(types).forEach(([type, count]) => {
    html += `${type}: ${count}<br>`;
  });

  html += `<br><b>Total:</b> ${props.count}`;

  new mapboxgl.Popup()
    .setLngLat(e.lngLat)
    .setHTML(html)
    .addTo(map);

});

/*--------------------------------------------------------------------
GEOCODER (ROUTING)
--------------------------------------------------------------------*/

let startCoords = null;
let endCoords = null;

const startGeocoder = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  placeholder: "Enter start location",
  mapboxgl: mapboxgl,
  countries: "ca",
  bbox: [-79.6393, 43.581, -79.1156, 43.8555],
  types: "address,place",
});

const endGeocoder = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  placeholder: "Enter destination",
  mapboxgl: mapboxgl,
  countries: "ca",
  bbox: [-79.6393, 43.581, -79.1156, 43.8555],
  types: "address,place",
});

document.getElementById("geocoder-start").appendChild(startGeocoder.onAdd(map));
document.getElementById("geocoder-end").appendChild(endGeocoder.onAdd(map));

startGeocoder.on("result", (e) => {
  startCoords = e.result.center;
  getRoute();
});

endGeocoder.on("result", (e) => {
  endCoords = e.result.center;
  getRoute();
});

/*--------------------------------------------------------------------
CLEAR ROUTES
--------------------------------------------------------------------*/

function clearRoutes() {

  for (let i = 0; i < 3; i++) {

    const routeId = "route-" + i;
    const bufferId = "buffer-" + i;

    if (map.getLayer(routeId)) map.removeLayer(routeId);
    if (map.getSource(routeId)) map.removeSource(routeId);

    if (map.getLayer(bufferId)) map.removeLayer(bufferId);
    if (map.getSource(bufferId)) map.removeSource(bufferId);

  }

}

/*--------------------------------------------------------------------
ROUTING
--------------------------------------------------------------------*/

async function getRoute() {

  if (!startCoords || !endCoords) return;

  if (!incidentsData) {
    console.log("Incidents not loaded yet");
    return;
  }

  clearRoutes();

  const url =
`https://api.mapbox.com/directions/v5/mapbox/walking/${startCoords[0]},${startCoords[1]};${endCoords[0]},${endCoords[1]}?alternatives=true&overview=full&geometries=geojson&access_token=${mapboxgl.accessToken}`;

  const res = await fetch(url);
  const data = await res.json();

  const routes = data.routes;

  routes.forEach((route, i) => {

    if (i >= 3) return;

    const routeId = "route-" + i;
    const bufferId = "buffer-" + i;

    const geojson = {
      type: "Feature",
      geometry: route.geometry
    };

    map.addSource(routeId, {
      type: "geojson",
      data: geojson
    });

    map.addLayer({
      id: routeId,
      type: "line",
      source: routeId,
      paint: {
        "line-color":
          i === 0 ? "#ff0000"
          : i === 1 ? "#00bcd4"
          : "#4caf50",
        "line-width": 5
      }
    });

    const buffer = turf.buffer(geojson, 0.05, { units: "kilometers" });

    map.addSource(bufferId, {
      type: "geojson",
      data: buffer
    });

    map.addLayer({
      id: bufferId,
      type: "fill",
      source: bufferId,
      paint: {
        "fill-color": "#ffcc00",
        "fill-opacity": 0.2
      }
    });

    const incidentsNearRoute =
      turf.pointsWithinPolygon(incidentsData, buffer);

    let risk = 0;

    incidentsNearRoute.features.forEach(f => {
      risk += Number(f.properties.weight);
    });

    let score = 100 - risk;

    if (score < 0) score = 0;

    document.getElementById("score" + i).innerText = score;

  });

}
// /*--------------------------------------------------------------------
// INITIALIZE MAP
// --------------------------------------------------------------------*/
// mapboxgl.accessToken =
//   "pk.eyJ1IjoiamVzc2ljYWh1YW5nIiwiYSI6ImNtazNjNmdmeTBkN3AzZnEyZHRscHdod28ifQ.Pa9LhzBk1H75KBMwBngDjA";

// //initialize map
// const map = new mapboxgl.Map({
//   container: "map",
//   style: "mapbox://styles/jessicahuang/cmmnx7kte003n01s125302mbb",
//   center: [-79.36, 43.73],
//   zoom: 10.2, //set starting zoom level
//   bearing: -17, //turn map orientation to upright
//   pitch: 0,
// });

// let incidentsData;

// fetch("data/cleaned/toronto_incidents.geojson")
//   .then(res => res.json())
//   .then(data => {
//     incidentsData = data;
//   });
  
// /*--------------------------------------------------------------------
// ADD DATA SOURCE
// --------------------------------------------------------------------*/
// map.on("load", () => {

//   // Neighbourhood crime polygons
//   map.addSource("neighbourhood_crime", {
//     type: "geojson",
//     data: "https://raw.githubusercontent.com/JessicaCHuang26/GGR472-Project/3ff57eb0b30fbed3c19ab3b774dc0705e91cc974/Neighbourhood_Crime_Rates.geojson",
//   });

//   map.addLayer({
//     id: "neighbourhood_crime",
//     type: "fill",
//     source: "neighbourhood_crime",
//     paint: {
//       "fill-color": "blue",
//       "fill-opacity": 0.4,
//       "fill-outline-color": "#000000",
//     },
//   });

//   /*--------------------------------------------------------------------
//   INCIDENT POINT DATASET (NEW)
//   --------------------------------------------------------------------*/

//   map.addSource("incidents", {
//     type: "geojson",
//     data: "data/cleaned/toronto_incidents.geojson" // your cleaned dataset
//   });

//   map.addLayer({
//     id: "incidents",
//     type: "circle",
//     source: "incidents",
//     paint: {

//       "circle-radius": 4,

//       "circle-color": [
//         "match",
//         ["get", "type"],

//         "shooting", "#ff0000",        // red
//         "robbery", "#ff7f00",         // orange
//         "assault", "#ffd700",         // yellow
//         "pedestrian_ksi", "#8b0000",  // dark red
//         "collision", "#1f78b4",       // blue

//         "#cccccc" // fallback color
//       ],

//       "circle-opacity": 0.7,
//       "circle-stroke-width": 0.2,
//       "circle-stroke-color": "#ffffff"
//     }
//   });
// });

// map.on("click", "incidents", (e) => {

//   const props = e.features[0].properties;

//   new mapboxgl.Popup()
//     .setLngLat(e.lngLat)
//     .setHTML(`
//       <b>Incident:</b> ${props.type}<br>
//       <b>Weight:</b> ${props.weight}
//     `)
//     .addTo(map);

// });

// /*--------------------------------------------------------------------
// GEOCODER (SEARCH BOXES)
// --------------------------------------------------------------------*/
// let startCoords = null;
// let endCoords = null;

// //Start location
// const startGeocoder = new MapboxGeocoder({
//   accessToken: mapboxgl.accessToken,
//   placeholder: "Enter start location",
//   mapboxgl: mapboxgl,
//   countries: "ca",
//   bbox: [-79.6393, 43.581, -79.1156, 43.8555],
//   types: "address,place",
// });

// //End location
// const endGeocoder = new MapboxGeocoder({
//   accessToken: mapboxgl.accessToken,
//   placeholder: "Enter destination",
//   mapboxgl: mapboxgl,
//   countries: "ca",
//   bbox: [-79.6393, 43.581, -79.1156, 43.8555],
//   types: "address,place",
// });

// // Add BOTH geocoders to the page
// document.getElementById("geocoder-start").appendChild(startGeocoder.onAdd(map));

// document.getElementById("geocoder-end").appendChild(endGeocoder.onAdd(map));

// // When user selects start
// startGeocoder.on("result", (e) => {
//   startCoords = e.result.center;
//   getRoute();
// });

// // When user selects end
// endGeocoder.on("result", (e) => {
//   endCoords = e.result.center;
//   getRoute();
// });

// function clearRoutes() {
//   for (let i = 0; i < 3; i++) {
//     const id = "route-" + i;
//     const bufferId = "buffer-" + i;
//     if (map.getLayer(id)) map.removeLayer(id);
//     if (map.getSource(id)) map.removeSource(id);

//     if (map.getLayer(bufferId)) map.removeLayer(bufferId);
//     if (map.getSource(bufferId)) map.removeSource(bufferId);
//   }
// }

// async function getRoute() {

//   if (!startCoords || !endCoords) return;

//   if (!incidentsData) {
//     console.log("Incidents not loaded yet");
//     return;
//   }

//   console.log(incidentsData.type);
//   console.log(incidentsData.features.length);

//   clearRoutes();

//   const url =
// `https://api.mapbox.com/directions/v5/mapbox/walking/${startCoords[0]},${startCoords[1]};${endCoords[0]},${endCoords[1]}?alternatives=true&overview=full&geometries=geojson&access_token=${mapboxgl.accessToken}`;

//   const res = await fetch(url);
//   const data = await res.json();

//   const routes = data.routes;

//   routes.forEach((route, i) => {

//     if (i >= 3) return;

//     const routeId = "route-" + i;
//     const bufferId = "buffer-" + i;

//     const geojson = {
//       type: "Feature",
//       geometry: route.geometry
//     };

//     /* ADD ROUTE */

//     map.addSource(routeId, {
//       type: "geojson",
//       data: geojson
//     });

//     map.addLayer({
//       id: routeId,
//       type: "line",
//       source: routeId,
//       paint: {
//         "line-color":
//           i === 0 ? "#ff0000"
//           : i === 1 ? "#00bcd4"
//           : "#4caf50",
//         "line-width": 5
//       }
//     });

//     /* CREATE BUFFER */

//     const buffer = turf.buffer(geojson, 0.05, { units: "kilometers" });

//     map.addSource(bufferId, {
//       type: "geojson",
//       data: buffer
//     });

//     map.addLayer({
//       id: bufferId,
//       type: "fill",
//       source: bufferId,
//       paint: {
//         "fill-color": "#ffcc00",
//         "fill-opacity": 0.2
//       }
//     });

//     console.log("buffer area", turf.area(buffer));

//     /* INCIDENT ANALYSIS */

//     const incidentsNearRoute =
//       turf.pointsWithinPolygon(incidentsData, buffer);

//     console.log("incidents:", incidentsNearRoute.features.length);

//     console.log("Incidents inside buffer:", incidentsNearRoute.features.length);

//     incidentsNearRoute.features.forEach((f, index) => {
//       console.log(
//         index,
//         f.properties.type,
//         f.geometry.coordinates
//       );
//     });

//     const uniqueCoords = new Set(
//       incidentsNearRoute.features.map(f => f.geometry.coordinates.join(","))
//     );

//     console.log("Total incidents:", incidentsNearRoute.features.length);
//     console.log("Unique coordinates:", uniqueCoords.size);

//     let risk = 0;

//     incidentsNearRoute.features.forEach(f => {
//       risk += Number(f.properties.weight);
//     });

//     let score = 100 - risk;

//     if (score < 0) score = 0;

//     document.getElementById("score" + i).innerText = score;

//   });

// }