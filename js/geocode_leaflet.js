// Create the map
var requestOptions = {
  method: 'GET',
};

var hue = 0;
var searchCounter = 0;
var overlay = [];
var featureSave = [];
var bestDecision = [];
var theBestDecision;
var countrySave = new Array(2);
var country;
var oneFeatureSave;
var secToken = true;
var search;
var firstSearch = true;

var batchResults = [];
var batchProgress = function () {};;
var batchFlag = false;
var timeout = 1000000; // 1000000ms = 1000 seconds

var finalDecisions = new Array();

var featureListElem = document.getElementById("feature-list");

document.getElementById('file-input')
  .addEventListener('change', readInputFile, false);


var map = L.map('map').setView([51.02266810460564, 13.776110978440748], 5);
map.getSize();

// Set up the OSM layer
var baseLayer1 = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    noWrap: true,
    name: "Base layer 1"
  }).addTo(map);

//Dont let user drag out of map (works only if in map bound for now)
var southWest = L.latLng(-89.98155760646617, -180),
  northEast = L.latLng(89.99346179538875, 180);
var bounds = L.latLngBounds(southWest, northEast);

map.setMaxBounds(bounds);
map.on('drag', function () {
  map.panInsideBounds(bounds, {
    animate: false
  });
});

//Fix for Leaflet not loading whole map and sets correct zoom
setInterval(function () {
  map.invalidateSize();
}, 100);

//event for click on map
map.on("click", clickHandler);

var markers = [];
var div = document.getElementById('search-list');
var textToAdd;
const node = document.getElementById("form-input");

//input field to markers
node.addEventListener("keyup", function (event) {
  if (event.key === "Enter") {
    fetch("https://api.geoapify.com/v1/geocode/search?text=" + node.value + "&apiKey=" + api_key, requestOptions)
      .then(response => response.json())
      .then(function (result) {
        

        result.features.forEach(element => {
          element.origin = result.query.text;
          element.matches = result.features.length;
        });

        featureSave[searchCounter] = result;

        if (overlay.length > 0) {
          map.removeLayer(overlay[searchCounter])
        }

        search = sumCosts(evaluateSearches(featureSave));

        if (!firstSearch) {
          for (var feature in search) {
            markers.push(createMarker(search[feature].geometry.coordinates[1], search[feature].geometry.coordinates[0], search[feature]));
          }
        } else {
          markers.push(createMarker(search.geometry.coordinates[1], search.geometry.coordinates[0], search.properties));
          firstSearch = false;
        }
        searchCounter++;
        // create group to hold markers, it will be added as an overlay
        overlay[searchCounter] = L.featureGroup(markers);
        overlay[searchCounter].addTo(map);

        markers = [];

        // show features
        map.fitBounds(overlay[searchCounter].getBounds(), {
          maxZoom: 12,
        })

      })
      .catch(error => console.log('error', error));

    let p = document.createElement("p")

    p.innerHTML = node.value;
    div.append(p);

    node.value = ""
  }
});
// create another layer for shapes or whatever
var circle = L.circle([36.9, -2.45], 2250, {
  color: 'red',
  fillColor: '#f03',
  fillOpacity: 0.5
});
circle.on('click', clickHandler);
circle.properties = {
  type: "circle"
};
