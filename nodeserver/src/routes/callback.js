var express = require('express');
var router = express.Router();
var querystring = require('querystring');
var request = require('axios');

var spotify = require('../scripts/spotify.js');
var spotifyUser = require('../scripts/spotifyUser.js');
var song = require('../scripts/song.js');
var tokens = require('../scripts/tokens.js');

router.get('/', function(req, res) {
  // your application requests refresh and access tokens
  // after checking the state parameter

  var stateKey = req.authData.stateKey;
  var client_id = req.authData.client_id;
  var client_secret = req.authData.client_secret;
  var redirect_uri = req.authData.redirect_uri;
  var lyricSearchOrder = req.lyricSearchOrder;

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      params: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      json: true
    };

  request(authOptions)
    .then(async function (response) {
      if (response.status === 200) {
        spotifyUser.setLoginStatus(true);
        tokens.setAccessToken(response.data.access_token),
        tokens.setRefreshToken(response.data.refresh_token);
        
        await spotify.getUserProfile(tokens.getTokens().access_token);
        
        var songResponse = await spotify.getCurrentlyPlayingSong(tokens.getTokens().access_token, res);
        if (songResponse) {
          song.getSongData(songResponse, lyricSearchOrder, res);
        }
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));        
      }
  })
  .catch(function (error) {
    console.log(error);
  });
}
});

module.exports = router;
