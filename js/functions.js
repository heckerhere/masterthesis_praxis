/** @global */
var api_key = ""

/**
 * Get the contents of an imported file 
 * @param {event} e - get event when import file is selected
 */
function readInputFile(e) {
  var file = e.target.files[0];
  if (!file) {
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    var contents = e.target.result;
    testSearch = contents.split(/\r?\n/);
    batchSearch(testSearch)
  };
  reader.readAsText(file);
}

/**
 * Get a distance between two points. Source: https://stackoverflow.com/questions/43167417/calculate-distance-between-two-points-in-leaflet; Opened: 08.05.2022
 * @param {float} origin - origin destination [lat1, lon1]
 * @param {float} destination - target destination [lat2, lon2]
 * @returns {number} - distance between input points in km
 */
function getDistance(origin, destination) {
  // return distance in km
  var lon1 = toRadian(origin[1]),
    lat1 = toRadian(origin[0]),
    lon2 = toRadian(destination[1]),
    lat2 = toRadian(destination[0]);

  var deltaLat = lat2 - lat1;
  var deltaLon = lon2 - lon1;

  var a = Math.pow(Math.sin(deltaLat / 2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(deltaLon / 2), 2);
  var c = 2 * Math.asin(Math.sqrt(a));
  var EARTH_RADIUS = 6371;
  return c * EARTH_RADIUS;
}

/**
 * Turn degree to radian.
 * @param {float} origin - input degree
 * @returns {number} - returns radian
 */
function toRadian(degree) {
  return degree * Math.PI / 180;
}

/**
 * Download all Markers in global search array as csv file
 */
function downloadMarkers() {

  var csvContent = "data:text/csv;charset=utf-8,";
  var index = 0;

  for (var feature in search) {
    dataString = search[feature].properties.city + ";" + search[feature].properties.country + ";" + search[feature].properties.postcode + ";" + search[feature].properties.address_line1 + ";" + search[feature].geometry.coordinates.join(";") + ";" + search[feature].uncertainty;
    csvContent += dataString + "\n";
    index++;
  }
  var encodedUri = encodeURI(csvContent);

  window.open(encodedUri);
}

/**
 * Turn a value to a normalized value
 * @param {float} val - value to change
 * @param {int} max - maximum range
 * @param {int} min - minimum range
 * @returns {number} - returns normalized value
 */
function normalizeValue(val, max, min) {
  return (val - min) / (max - min);
}

/**
 * Handle Checkboxes for Language Selection.
 * @param {e} event - clicked checkbox
 */
function checkboxHandler(e) {
  if (this.checked) {
    map.addLayer(overlay[1]);

  } else {
    map.removeLayer(overlay[1]);
  }
}

/**
 * Function to calculate the weight of the current search
 * @param {array} currentStack - stack to process
 * @param {array} doneDecisions - processed decisions
 * @returns {number} - old rank
 */
function rankSearch(currentStack, doneDecisions) {
  //TODO: calculate the rank and the distance to a value for comparing
  return (((normalizeValue(currentStack.properties.rank.popularity, 10, 0)) + currentStack.properties.rank.importance) / 2) - (getDistance([currentStack.geometry.coordinates[1], currentStack.geometry.coordinates[0]], [doneDecisions.geometry.coordinates[1], doneDecisions.geometry.coordinates[0]]) / 1000)
}

/**
 * New function to rank features
 * @param {array} feature - contains geojson of one feature
 * @param {array} feature2 - contains geojson of another feature to compare to
 * @returns {object} - returns the rank for a feature constellation
 */
function getRank(feature, feature2) {
  //TODO: calculate the rank and the distance to a value for comparing
  var rank = {
    value: 0,
    feature: []
  };
  var dist = getDistance([feature.geometry.coordinates[0], feature.geometry.coordinates[1]], [feature2.geometry.coordinates[0], feature2.geometry.coordinates[1]]);
  var tresh = 4000;

  if (feature2.properties.rank.importance === undefined) {
    feature2.properties.rank.importance = 0.1
  }
  if (dist < tresh) {
    rank.value = (((normalizeValue(feature2.properties.rank.popularity, 10, 0)) + feature2.properties.rank.importance) / 2) * (1 - normalizeValue(dist, tresh, 0));
  } else {
    rank.value = (((normalizeValue(feature2.properties.rank.popularity, 10, 0)) + feature2.properties.rank.importance) / 2) * 0.1;
  }
  rank.feature = feature;
  return rank;
}

/**
 * New function to rank features for the first search
 * @param {array} feature - contains geojson of one feature
 * @returns {object} - returns best rank for the first item
 */
function getRankForFirst(searches) {
  var rank = {
    value: 0,
    feature: []
  };
  var bestRank = {
    value: 0,
    feature: []
  };

  for (var feature in searches[0].features) {
    rank.value = (((normalizeValue(searches[0].features[feature].properties.rank.popularity, 10, 0)) + searches[0].features[feature].properties.rank.importance) / 2);
    rank.feature = searches[0].features[feature];

    if (rank.value > bestRank.value) {
      bestRank.value = rank.value
      bestRank.feature = rank.feature
    }
  }

  return bestRank;
}

/**
 * Entry Function to evaluate the rank for each feature and select the current feature map
 * @param {array} searches - contains all geojsons of all searches including current
 * @returns {object} - contains all calculated ranks
 */
function evaluateSearches(searches) {
  var rank;
  var defaultRank = {
    value: 0,
    feature: []
  };
  var bestRank = [];
  var index = 0

  if (!firstSearch) {
    searches.forEach(group => {
      group.features.forEach(feature => {
        searches.forEach(group2 => {
          if (group != group2) {
            group2.features.forEach(feature2 => {
              if (bestRank[group.query.text] === undefined) {
                bestRank[group.query.text] = [];
              }
              if (bestRank[group.query.text][feature.properties.place_id] === undefined) {
                bestRank[group.query.text][feature.properties.place_id] = [];
              }
              if (bestRank[group.query.text][feature.properties.place_id][group2.query.text] === undefined) {
                bestRank[group.query.text][feature.properties.place_id][group2.query.text] = defaultRank;
              }
              rank = getRank(feature, feature2);
              if (rank.value > bestRank[group.query.text][feature.properties.place_id][group2.query.text].value) {
                bestRank[group.query.text][feature.properties.place_id][group2.query.text] = rank;
              }

            });
          }
        });
      });
      index++
    });
    return bestRank;
  } else {
    return getRankForFirst(searches);
  }
}

/**
 * Sum up costs and evaluate each best Feature
 * @param {array} bestRank - contains all Rankvalues of the whole search
 * @returns {object} - returns array of objects containing the final decisions made
 */
function sumCosts(bestRank) {
  var costPerFeature = new Array();
  var sum = 0;

  if (!firstSearch) {

    for (var group in bestRank) {
      for (var feature in bestRank[group]) {
        if (!costPerFeature[group]) {
          costPerFeature[group] = 0;
        }
        for (var group2 in bestRank[group][feature]) {
          sum = sum + bestRank[group][feature][group2].value;
        }
        if (costPerFeature[group] < sum) {
          costPerFeature[group] = sum;
          finalDecisions[group] = bestRank[group][feature][group2].feature;
        }
        sum = 0;
      }
    }

    return finalDecisions;
  } else {
    return finalDecisions[0] = bestRank.feature;
  }
}


/**
 * Decission function for best match selection OUTDATED
 * @param {array} currentStack - stack to process
 * @param {array} doneDecisions - allready made decisions
 * @returns {object} - array of best matches
 */
function deciderFunction(currentStack, doneDecisions) {
  var bestMatch;
  var bestImp = 0;
  var currentRank = 0;
  var bestRank = 0;

  for (var i = 0; i < currentStack.features.length; i++) {
    if (doneDecisions.length > 0) {
      currentRank = rankSearch(currentStack.features[i], doneDecisions[0]);
      if (bestRank < currentRank) {
        bestRank = currentRank;
        bestMatch = currentStack.features[i];
      }
    } else {
      if (bestImp < currentStack.features[i].properties.rank.importance) {
        bestImp = currentStack.features[i].properties.rank.importance;
        bestMatch = currentStack.features[i];
      }
    };

  }
  return bestMatch;
}

/**
 * function to handle click on markers, comes from leaflet
 * @param {event} e - gets click event
 */
function clickHandler(e) {
  var clickBounds = L.latLngBounds(e.latlng, e.latlng);
  var intersectingFeatures = [];

  for (var l in map._layers) {
    var overlay = map._layers[l];
    if (overlay._layers) {
      for (var f in overlay._layers) {
        var feature = overlay._layers[f];
        var bounds;
        if (feature.getBounds) bounds = feature.getBounds();
        else if (feature._latlng) {
          bounds = L.latLngBounds(feature._latlng, feature._latlng);
        }
        if (bounds && clickBounds.intersects(bounds)) {
          intersectingFeatures.push(feature);
        }
      }
    }
  }
  // if at least one feature found, show it
  if (intersectingFeatures.length) {
    var html = "Found Features: " + intersectingFeatures.length + "<br/>" + intersectingFeatures.map(function (o) {
      return o.properties.type
    }).join('<br/>');

    map.openPopup(html, e.latlng, {
      offset: L.point(0, -24)
    });
  }
}

/**
 * function to wait for batch-geocoding to finish.. than resolves and code continues
 * @param {int} timeout - sets the timeout to wait for next try
 */
function waitForBatch(timeout) {
  var start = Date.now();
  return new Promise(waitForFoo); // set the promise object within the waitForBatch object

  // waitForFoo makes the decision whether the condition is met
  // or not met or the timeout has been exceeded which means
  // this promise will be rejected
  function waitForFoo(resolve, reject) {
    if (window.batchProgress && window.batchProgress.isFinished) {
      resolve(window.batchProgress.isFinished);
    } else if (timeout && (Date.now() - start) >= timeout)
      reject(new Error("timeout"));
    else
      setTimeout(waitForFoo.bind(this, resolve, reject), 30);
  }
}

/**
 * Create Leaflet Marker for a feature 
 * @param {float} lat - latidude for marker to create
 * @param {float} lng - longitude for marker to create
 * @param {array} feature - processed feature
 * @returns {marker} - returns leaflet marker
 */
function createMarker(lat, lng, feature) {

  var orangeIcon = new L.Icon({
    iconUrl: 'img/marker-icon-orange.png',
    shadowUrl: 'img/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  var redIcon = new L.Icon({
    iconUrl: 'img/marker-icon-red.png',
    shadowUrl: 'img/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  var goldIcon = new L.Icon({
    iconUrl: 'img/marker-icon-gold.png',
    shadowUrl: 'img/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  var marker = L.marker([lat, lng]);
  //event for click on Marker
  marker.on("click", clickHandler);

  const found = batchResults.find(element => element.query.text == feature.origin);

  if (found) {
    var dist = getDistance([feature.geometry.coordinates[0], feature.geometry.coordinates[1]], [found.lon, found.lat]);

    if (dist > 10) {
      marker.setIcon(redIcon);
      feature.uncertainty = 0.5;
    } else if (dist > 1) {
      marker.setIcon(orangeIcon);
      feature.uncertainty = 0.8;
    }
    else {
      feature.uncertainty = 0.9;
    }
  }
  if (!found) {
    marker.setIcon(goldIcon);
    feature.uncertainty = 0.5;
  }

  if (feature.matches >= 2) {
    marker.setOpacity(.9)
  }
  if (feature.matches > 3) {
    marker.setOpacity(.7)
  }

  marker.properties = {
    type: `${feature.properties.city} | ${feature.properties.country} <br> ${feature.properties.result_type} <br> <a href="#" data-target="modal-example" onclick="toggleModal(event, '${feature.origin}')">Change Marker</a>`,
  };

  //add to checkbox
  //TODO: Foreachloop ??ber alle inputs, sobald country gleich value abbrechen und weitermachen
  var div = document.createElement("div");
  var newCheckbox = document.createElement("input");
  newCheckbox.classList.add("checkbox");
  newCheckbox.type = "checkbox";
  newCheckbox.value = feature.properties.country;
  newCheckbox.checked = true;
  newCheckbox.addEventListener('change', checkboxHandler);

  var label = document.createElement("label");
  label.htmlFor = feature.properties.country;
  label.innerHTML = feature.properties.country;

  var checkboxes = document.getElementsByClassName("checkbox")

  if (checkboxes.length != 0) {

    Array.from(checkboxes).forEach(function (element) {

      if (!element.value.localeCompare(feature.properties.country)) {

        secToken = true;
      } else if (!secToken) {
        secToken = false;
      }
    });
  } else if (checkboxes.length == 0) {
    secToken = false;
  }

  //if country not there yet, create it
  if (!secToken) {
    div.appendChild(newCheckbox);
    div.appendChild(label);
    document.getElementById("result-form").appendChild(div);
  }
  secToken = false;

  return marker;
}

/**
 * Entry point for the whole search process, gets called after import of values
 * @param {array} searchQuery - contains all therms to search for and geocode them
 */
function batchSearch(searchQuery) {

  batchGeocode();

  firstSearch = false;

  //delete prev markers but not actual
  if (overlay.length > 0) {
    map.removeLayer(overlay[searchCounter - 1])
  }

  searchQuery.forEach(element => {
    fetch("https://api.geoapify.com/v1/geocode/search?text=" + element + "&apiKey=" + api_key, requestOptions)
      .then(response => response.json())
      .then(function (result) {
        featureSave[searchCounter] = result;
        result.features.forEach(element => {
          element.origin = result.query.text;
          element.matches = result.features.length;
        });
        if (searchQuery.length == featureSave.length) {
          search = sumCosts(evaluateSearches(featureSave));
          waitForBatch(timeout).then(function () {
            for (var feature in search) {
              if (search[feature].geometry) {
                markers.push(createMarker(search[feature].geometry.coordinates[1], search[feature].geometry.coordinates[0], search[feature]));
              }
            }

            overlay[searchCounter] = L.featureGroup(markers);
            overlay[searchCounter].addTo(map);

            markers = [];

            map.fitBounds(overlay[searchCounter].getBounds(), {
              maxZoom: 12,
            })

          });
        }
        searchCounter++;

      })
      .catch(error => console.log('error', error));
  });
}

/**
 * Performs the batch geocode and sets the flag for promise to be true if done
 * @returns {object} - array of the search results if done, else it returns reject state for promise
 */
function batchGeocode() {
  const url = "https://api.geoapify.com/v1/batch/geocode/search?apiKey=" + api_key;

  fetch(url, {
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testSearch) //useTestsearch Array
    })
    .then(getBodyAndStatus)
    .then((result) => {
      if (result.status !== 202) {
        return Promise.reject(result)
      } else {
        console.log("Job ID: " + result.body.id);
        console.log("Job URL: " + result.body.url);

        // get results asynchronously
        return getAsyncResult(`${url}&id=${result.body.id}`, 3 * 1000 /*check every minute*/ , 10 /*max number of attempts*/ ).then(queryResult => {
          console.log(queryResult);
          batchResults = queryResult;
          if (!batchFlag) {
            batchProgress.isFinished = "set";
            batchFlag = true;
          }

          return queryResult;
        });
      }
    })
    .catch(err => console.log(err));

}

/**
 * Create Leaflet Marker for a feature within the batch Function - DEV-CODE
 * @param {float} lat - latidude for marker to create
 * @param {float} lng - longitude for marker to create
 * @param {array} feature - processed feature
 * @returns {marker} - returns leaflet marker
 */
function createMarkerForBatch(lat, lng, feature) {
  var marker = L.marker([lat, lng]);
  //event for click on Marker
  marker.on("click", clickHandler);
  marker.properties = {
    type: `${feature.city} | ${feature.country} <br> ${feature.result_type} <br> <a href="#" data-target="modal-example" onclick="toggleModal(event, '${feature.origin}')">Change Marker</a>`,
  };

  //add to checkbox
  var div = document.createElement("div");
  var newCheckbox = document.createElement("input");
  newCheckbox.classList.add("checkbox");
  newCheckbox.type = "checkbox";
  newCheckbox.value = feature.country;
  newCheckbox.checked = true;
  newCheckbox.addEventListener('change', checkboxHandler);

  var label = document.createElement("label");
  label.htmlFor = feature.country;
  label.innerHTML = feature.country;

  var checkboxes = document.getElementsByClassName("checkbox")

  if (checkboxes.length != 0) {

    Array.from(checkboxes).forEach(function (element) {

      if (!element.value.localeCompare(feature.country)) {

        secToken = true;
      } else if (!secToken) {
        secToken = false;
      }
    });
  } else if (checkboxes.length == 0) {
    secToken = false;
  }

  //if country not there yet, create it
  if (!secToken) {
    div.appendChild(newCheckbox);
    div.appendChild(label);
    document.getElementById("result-form").appendChild(div);
  }
  secToken = false;

  return marker;
}

/**
 * get results async for batch geocode - comes from geoapify https://apidocs.geoapify.com/docs/geocoding/batch/#about; accessed: 08.05.2022
 * @param {string} url - url for the job
 * @param {int} timeout - how long to wait for one attempt
 * @param {int} maxAttempt - how often try
 * @returns {status} - return response status and body
 */
function getAsyncResult(url, timeout, maxAttempt) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      repeatUntilSuccess(resolve, reject, 0)
    }, timeout);
  });

  function repeatUntilSuccess(resolve, reject, attempt) {
    console.log("Attempt: " + attempt);
    fetch(url)
      .then(getBodyAndStatus)
      .then(result => {
        if (result.status === 200) {
          resolve(result.body);
        } else if (attempt >= maxAttempt) {
          reject("Max amount of attempts achived");
        } else if (result.status === 202) {
          // Check again after timeout
          setTimeout(() => {
            repeatUntilSuccess(resolve, reject, attempt + 1)
          }, timeout);
        } else {
          // Something went wrong
          reject(result.body)
        }
      })
      .catch(err => reject(err));
  };
}

/**
 * get body and status from response - comes from geoapify https://apidocs.geoapify.com/docs/geocoding/batch/#about; accessed: 08.05.2022
 * @param {object} response - contains response from geoapify
 * @returns {status} - return response status and body
 */
function getBodyAndStatus(response) {
  return response.json().then(responceBody => {
    return {
      status: response.status,
      body: responceBody
    }
  });
}

/**
 * change features by user selection through pop-up
 * @param {object} feature - feature to switch
 * @param {object} modal - contains the modal where the change was selected from
 */
function changeFeature(feature, modal) {

  for (key in finalDecisions) {
    if (finalDecisions[key].origin === feature.origin) {
      finalDecisions[key] = feature;
    }
  }

  if (overlay.length > 0) {
    map.removeLayer(overlay[searchCounter])
  }
  for (var newM in finalDecisions) {
    markers.push(createMarker(finalDecisions[newM].geometry.coordinates[1], finalDecisions[newM].geometry.coordinates[0], finalDecisions[newM]));
  }

  overlay[searchCounter] = L.featureGroup(markers);
  overlay[searchCounter].addTo(map);
  markers = [];
  map.fitBounds(overlay[searchCounter].getBounds(), {
    maxZoom: 12,
  })
  if (typeof (modal) != 'undefined' && modal != null) {
    closeModal(modal);
    map.closePopup();
  }

}