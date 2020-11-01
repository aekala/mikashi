var HTMLParser = require('node-html-parser');

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
    for (var i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};
  

function parseGeniusLyrics(lyrics) {  // need to ignore annotations and hyperlinks when getting lyrics from Genius 
    let root = HTMLParser.parse(lyrics);
    return root.text.trim().replace(/\n/g, "<br />");
}


var isUpdate = "spotify";
exports.getSpotifyRouteState = function() {
  return {
    spotifyRouteState
  }
}

exports.setSpotifyRouteState = function (state) {
  spotifyRouteState = state;
}

exports.generateRandomString = generateRandomString;
exports.parseGeniusLyrics = parseGeniusLyrics;