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
map.addSource("neighbourhood_crime", {
  type: "geojson",
  data: "Neighbourhood_Crime_Rates.geojson",
});

map.addLayer({
  id: "neighbourhood_crime",
  type: "fill",
  source: "neighbourhood_crime",
  paint: {
    "fill-color": "blue",
    "fill-opacity": 0.7,
    "fill-outline-color": "#8a8a8a",
  },
});
