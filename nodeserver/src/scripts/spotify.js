var request = require('axios');
var spotifyUser = require('./spotifyUser.js');

async function getUserProfile(access_token) {
  var options = {
    method: 'get',
    url: 'https://api.spotify.com/v1/me/',
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };

  await request(options)
    .then(function(response) {  
      if (response.status == 403) { // Spotify returns a 403 status code if you don't have authorization to access account
        console.error("Authorization Failed"); 
      } else {
        spotifyUsername = response.data.id;
        spotifyProfileImage = response.data.images[0].url;

        spotifyUser.setSpotifyUsername(spotifyUsername);
        spotifyUser.setSpotifyProfileImage(spotifyProfileImage);
      }
    });
}

async function getCurrentlyPlayingSong(access_token, res) {  
  var options = {
    method: 'get',
    url: 'https://api.spotify.com/v1/me/player/currently-playing',
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };

  var songResponse = await request(options)
                      .then(function(response) {  
                        if (response.status == 204) { // Spotify returns a 204 status code if there is no song currently playing
                          res.render('noSongPlaying', spotifyUser.getSpotifyUserData());
                          return null
                        } else {
                          return response;   
                        }
                      });
  
  return songResponse;
}

exports.getUserProfile = getUserProfile;
exports.getCurrentlyPlayingSong = getCurrentlyPlayingSong;

