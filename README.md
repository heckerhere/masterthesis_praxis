## Master thesis by Marcel Hecker

Repository with the coding part of the master thesis from Marcel Hecker. Created for HTW Dresden.

### Functions:

**Import** - You can import a file with different citys, streets or other sort of geographic features to geocode them. The file should be .txt format and every line contains one search query item. The following  shows an example:

```
Dresden
Hamburg
91325 Adelsdorf, Germany
```

For a quick start you can use import.txt

**Adjust** - After a short loading time, depending on the amount of search querys, you will see markers pop-up at the map. The markers are calculated though a function and they are compared with batch-geocoding results of Geoapify. The color indicates a certainty of right matches. You now can click on markers to change their position and the match. The markers indicate certainty after following visual variables:

**Color**:
**Red** - There is a difference between the matches of 10 or more kilometers
**Orange** - There is a difference between the matches from a range between 1 to 9 kilometers
**Blue** - The algorithm and the batch-geocoding of geoapify have no difference in the match
**Yellow** - This point isnt included in the batch-geocoding response

**Transparancy**: The more transparent a markers is, the more possible matches are found for this marker.

You can also add additional searches with the input field in the top left of the application. !IMPORTANT: If you make adjustments before, this will overwrite your changes because its recalculates the matches based on their distance.

**Export** - You can export your result als .CSV file. The export can be changed in the downloadMarkers() function.
 You can find the export structure below with example data. The results are separated by ;
| City | Country | Zip-Code | Adress | Longitude | Latitude | Uncertainty (1 is best) |
| ----------- | ----------- | ----------- | ----------- | ----------- | ----------- | ----------- |


**Reload** - This reloads the page if you want to reset the application and start a new query

----------------------------
**IMPORTANT**: To make this application running you need to set the api key variable in geocode_leaflet.js. [More info](https://www.geoapify.com/get-started-with-maps-api). 