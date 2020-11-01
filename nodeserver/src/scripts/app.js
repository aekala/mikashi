var express = require('express'); // Express web server framework
var request = require('axios');
var path = require('path');
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var dotenv = require('dotenv');

var tokens = require('../scripts/tokens.js');
var utilities = require('../scripts/utilities.js');
var login = require('../routes/login.js');
var callback = require('../routes/callback.js');
var search = require('../routes/search.js');
var spotifyUser = require('../scripts/spotifyUser.js');
var spotify = require('../scripts/spotify.js');
var song = require('../scripts/song.js');

dotenv.config({path: '.env'});
var client_id = process.env.CLIENT_ID;
var client_secret = process.env.CLIENT_SECRET;
var redirect_uri = process.env.REDIRECT_URI;
const lyricSearchOrder = ["SongLyrics", "Genius"];

var stateKey = 'spotify_auth_state';

var app = express();

const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
app.use(awsServerlessExpressMiddleware.eventContext())

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
  utilities.setSpotifyRouteState("spotify");
  req.stateKey = stateKey;
  req.client_id = client_id;
  req.redirect_uri = redirect_uri;
  next();
}, login);

app.use('/callback', function(req, res, next) {
  req.authData = {
    stateKey,
    client_id,
    client_secret,
    redirect_uri
  }
  req.lyricSearchOrder = lyricSearchOrder;
  req.updateStatus = utilities.getSpotifyRouteState();
  next();
}, callback)

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  tokens.setRefreshToken(req.query.refresh_token);
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: tokens.getTokens().refresh_token
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
  var songResponse = await spotify.getCurrentlyPlayingSong(tokens.getTokens().access_token, res);
  utilities.setSpotifyRouteState("update");
  song.getSongData(songResponse, lyricSearchOrder, true, res);
}) 

module.exports = app;