var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
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
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {

      access_token = body.access_token,
      refresh_token = body.refresh_token;

      var options = {
        url: 'https://api.spotify.com/v1/me/player/currently-playing',
        headers: { 'Authorization': 'Bearer ' + access_token },
        json: true
      };

      request.get(options, function(error, response, body) {
        songName = body.item.name;
        artist = body.item.artists[0].name;
        albumName = body.item.album.name;   
        albumArtUrl = body.item.album.images[0].url;  
        artistParam = artist.toLowerCase().trim().split(' ').join('-'); 
        songParam = songName.toLowerCase().trim().split(' ').join('-');     
              
        request.get('http://www.songlyrics.com/' + artistParam + '/' + songParam + '-lyrics/', function(error, response, body) {
          let $ = cheerio.load(body);
          let lyrics = $('#songLyricsDiv').html();

          res.render('song', {songName, artist, albumName, albumArtUrl, lyrics})
        })
      });
    } else {
      res.redirect('/#' +
        querystring.stringify({
          error: 'invalid_token'
        }));        
    }
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

app.get("/updateSong", function(req, res) {
  var options = {
    url: 'https://api.spotify.com/v1/me/player/currently-playing',
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };

  request.get(options, function(error, response, body) {
    songName = body.item.name;
    artist = body.item.artists[0].name;
    albumName = body.item.album.name;   
    albumArtUrl = body.item.album.images[0].url;  
    artistParam = artist.toLowerCase().trim().split(' ').join('-'); 
    songParam = songName.toLowerCase().trim().split(' ').join('-');     
          
    request.get('http://www.songlyrics.com/' + artistParam + '/' + songParam + '-lyrics/', function(error, response, body) {
      let $ = cheerio.load(body);
      let lyrics = $('#songLyricsDiv').html();

      res.render('song', {songName, artist, albumName, albumArtUrl, lyrics})
    })
  });
})

console.log('Listening on 8080');
app.listen(8080);
