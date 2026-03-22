/*--------------------------------------------------------------------
INITIALIZE MAP
--------------------------------------------------------------------*/
mapboxgl.accessToken =
  "pk.eyJ1IjoiamVzc2ljYWh1YW5nIiwiYSI6ImNtazNjNmdmeTBkN3AzZnEyZHRscHdod28ifQ.Pa9LhzBk1H75KBMwBngDjA";

//initialize map
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/jessicahuang/cmmnx7kte003n01s125302mbb",
  center: [-79.36, 43.73],
  zoom: 10.2, //set starting zoom level
  bearing: -17, //turn map orientation to upright
  pitch: 0,
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
});

/*--------------------------------------------------------------------
GEOCODER (SEARCH BOXES)
--------------------------------------------------------------------*/
let startCoords = null;
let endCoords = null;

//Start location
const startGeocoder = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  placeholder: "Enter start location",
  mapboxgl: mapboxgl,
  countries: "ca",
  bbox: [-79.6393, 43.581, -79.1156, 43.8555],
  types: "address,place",
});

//End location
const endGeocoder = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  placeholder: "Enter destination",
  mapboxgl: mapboxgl,
  countries: "ca",
  bbox: [-79.6393, 43.581, -79.1156, 43.8555],
  types: "address,place",
});

// Add BOTH geocoders to the page
document.getElementById("geocoder-start").appendChild(startGeocoder.onAdd(map));

document.getElementById("geocoder-end").appendChild(endGeocoder.onAdd(map));

// When user selects start
startGeocoder.on("result", (e) => {
  startCoords = e.result.center;
  getRoute();
});

// When user selects end
endGeocoder.on("result", (e) => {
  endCoords = e.result.center;
  getRoute();
});

function clearRoutes() {
  for (let i = 0; i < 3; i++) {
    const id = "route-" + i;
    if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(id)) map.removeSource(id);
  }
}

async function getRoute() {
  if (!startCoords || !endCoords) return;

  clearRoutes();

  const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${startCoords[0]},${startCoords[1]};${endCoords[0]},${endCoords[1]}?geometries=geojson&alternatives=true&access_token=${mapboxgl.accessToken}`;

  const res = await fetch(url);
  const data = await res.json();

  const routes = data.routes;

  routes.forEach((route, i) => {
    if (i >= 3) return; // limit to 3

    const routeId = "route-" + i;

    const geojson = {
      type: "Feature",
      geometry: route.geometry,
    };

    // Add source only if it doesn't exist
    if (!map.getSource(routeId)) {
      map.addSource(routeId, {
        type: "geojson",
        data: geojson,
      });

      map.addLayer({
        id: routeId,
        type: "line",
        source: routeId,
        paint: {
          "line-color": i === 0 ? "#ff0000" : i === 1 ? "#00bcd4" : "#4caf50",
          "line-width": 5,
          "line-opacity": 0.8,
        },
      });
    } else {
      map.getSource(routeId).setData(geojson);
    }
  });
}
