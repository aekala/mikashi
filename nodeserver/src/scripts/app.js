var express = require('express'); // Express web server framework
var request = require('axios');
var path = require('path');
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var dotenv = require('dotenv');

dotenv.config({path: '.env'});
var client_id = process.env.CLIENT_ID;
var client_secret = process.env.CLIENT_SECRET;
var redirect_uri = process.env.REDIRECT_URI;
var access_token;
var refresh_token;

var login = require('../routes/login.js');
var search = require('../routes/search.js');
var spotifyUser = require('../scripts/spotifyUser.js');
var spotify = require('../scripts/spotify.js');
var song = require('../scripts/song.js');

const lyricSearchOrder = ["SongLyrics", "Genius"];

var stateKey = 'spotify_auth_state';

var app = express();
app.use(cors())
app.use(cookieParser());
app.set('view engine', 'pug')
app.set('views', path.join(__dirname, '../views'))
app.use(express.static(path.join(__dirname, '../')));
app.use(express.urlencoded({
  extended: true
}))

app.get('/', function(req, res) {
  res.render('homepage', spotifyUser.getSpotifyUserData());
})

app.use('/search', function(req, res, next) {
  req.lyricSearchOrder = lyricSearchOrder;
  next();
}, search);

app.get("/contact", function(req, res) {
  res.render('contact', spotifyUser.getSpotifyUserData());
})

app.use('/login', function(req, res, next) {
  req.stateKey = stateKey;
  req.client_id = client_id;
  req.redirect_uri = redirect_uri;
  next();
}, login);
  
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
        spotifyUser.setLoginStatus(true);
        access_token = response.data.access_token,
        refresh_token = response.data.refresh_token;
        
        await spotify.getUserProfile(access_token);
        
        var songResponse = await spotify.getCurrentlyPlayingSong(access_token, res);
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
  var songResponse = await spotify.getCurrentlyPlayingSong(access_token, res);
  song.getSongData(songResponse, lyricSearchOrder, res);
}) 

console.log('Listening on 8080');
app.listen(8080);
