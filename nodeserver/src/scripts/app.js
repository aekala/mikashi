var express = require('express'); // Express web server framework
var request = require('axios');
var path = require('path');
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var dotenv = require('dotenv');
var cheerio = require('cheerio');
dotenv.config({path: '.env'});

var client_id = process.env.CLIENT_ID;
var client_secret = process.env.CLIENT_SECRET;
var redirect_uri = process.env.REDIRECT_URI;
var access_token;
var refresh_token;

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

var stateKey = 'spotify_auth_state';

var app = express();
app.use(cors())
app.use(cookieParser());
app.set('view engine', 'pug')
app.set('views', path.join(__dirname, '../views'))

app.get('/', function(req, res) {
  res.render('login');
})

app.get('/login', function(req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-currently-playing';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {
  // your application requests refresh and access tokens
  // after checking the state parameter

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

        access_token = response.data.access_token,
        refresh_token = response.data.refresh_token;
        
        var songResponse = await getCurrentlyPlayingSong(res);
        if (songResponse) {
          getSongData(songResponse, res);
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

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

app.get("/updateSong", async function(req, res) {
  var songResponse = await getCurrentlyPlayingSong(res);
  getSongData(songResponse, res);
}) 

async function getCurrentlyPlayingSong(res) {  
  var options = {
    method: 'get',
    url: 'https://api.spotify.com/v1/me/player/currently-playing',
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };

  var songResponse = await request(options)
                      .then(function(response) {  
                        if (response.status == 204) { // Spotify returns a 204 status code if there is no song currently playing
                          res.render('noSongPlaying');
                          return null
                        } else {
                          return response;   
                        }
                      });
  
  return songResponse;
}

function getSongData(songResponse, res) {
  const songData = {
        songName: songResponse.data.item.name,
        artist: songResponse.data.item.artists[0].name,
        albumName: songResponse.data.item.album.name, 
        albumArtUrl: songResponse.data.item.album.images[0].url,  
  } 
  songData.artistParam = songData.artist.toLowerCase().trim().split(' ').join('-');
  songData.songParam = songData.songName.toLowerCase().trim().split(' ').join('-');
  getSongLyrics(songData, res);
}

function getSongLyrics(songData, res) {
  var options = {
    method: 'get',
    url: 'http://www.songlyrics.com/' + songData.artistParam + '/' + songData.songParam + '-lyrics/'
  }
  request(options)
    .then(function(response) {
      let $ = cheerio.load(response.data);
      let lyrics = $('#songLyricsDiv').html();
      renderData = {
        songName: songData.songName,
        artist: songData.artist,
        albumName: songData.albumName,
        albumArtUrl: songData.albumArtUrl,
        lyrics
      }
      res.render('song', renderData);
  }).catch(function(error) {
    if (error.response.status == 404) {   // serve the songNotFound page if the url request returns a 404 error
      res.render('songNotFound');
    }
  });
}

console.log('Listening on 8080');
app.listen(8080);
