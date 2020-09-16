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

var spotifyUser = require('../scripts/spotifyUser.js');
var spotify = require('../scripts/spotify.js');
var utilities = require('../scripts/utilities.js');


const lyricSearchOrder = ["SongLyrics", "Genius"];

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
app.use(express.static(path.join(__dirname, '../')));
app.use(express.urlencoded({
  extended: true
}))

app.get('/', function(req, res) {
  res.render('homepage', spotifyUser.getSpotifyUserData());
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
        spotifyUser.setLoginStatus(true);
        access_token = response.data.access_token,
        refresh_token = response.data.refresh_token;
        
        await spotify.getUserProfile(access_token);
        
        var songResponse = await spotify.getCurrentlyPlayingSong(access_token, res);
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
  var songResponse = await spotify.getCurrentlyPlayingSong(access_token, res);
  getSongData(songResponse, res);
}) 

app.get("/search", function(req, res) {
  res.render('search', spotifyUser.getSpotifyUserData());
})

//handle data sent from /search form
app.post('/submit-song-search', function(req, res) {
  const songData = {
    songName: req.body.song, 
    artist: req.body.artist
  };
  songData.songParam = songData.songName.toLowerCase().trim().split(' ').join('-');
  songData.artistParam = songData.artist.toLowerCase().trim().split(' ').join('-');
  getSongLyrics(songData, 0, "Search", res)
})

app.get("/contact", function(req, res) {
  res.render('contact', spotifyUser.getSpotifyUserData());
})

function getSongData(songResponse, res) {
  const songData = {
        songName: songResponse.data.item.name,
        artist: songResponse.data.item.artists[0].name,
        albumName: songResponse.data.item.album.name, 
        albumArtUrl: songResponse.data.item.album.images[0].url,  
  } 
  songData.songParam = songData.songName.toLowerCase().trim().split(' ').join('-');
  songData.artistParam = songData.artist.toLowerCase().trim().split(' ').join('-');
  getSongLyrics(songData, 0, "Spotify", res);
}

function getSongLyrics(songData, index, source, res) {
  let lyricsURL;
  switch(lyricSearchOrder[index]) {
    case 'SongLyrics':
      lyricsURL = 'http://www.songlyrics.com/' + songData.artistParam + '/' + songData.songParam + '-lyrics/';
      break;
    case 'Genius':
      lyricsURL = 'http://www.genius.com/' + songData.artistParam + '-' + songData.songParam + '-lyrics';
      break;
  }

  var options = {
    method: 'get',
    url: lyricsURL
  }
  request(options)
    .then(function(response) {
      let $ = cheerio.load(response.data);
      let spotifyUserData = spotifyUser.getSpotifyUserData();
      let renderData = {
        songName: songData.songName,
        artist: songData.artist,      
        loggedIn: spotifyUserData.isLoggedIn,  
        spotifyProfileImage: spotifyUserData.spotifyProfileImage,
        spotifyUsername: spotifyUserData.spotifyUsername
      }
      if (source == "Spotify") {
        renderData.albumName = songData.albumName;
        renderData.albumArtUrl = songData.albumArtUrl;
      }
      switch(lyricSearchOrder[index]) {
        case 'SongLyrics':
          var lyrics = $('#songLyricsDiv').html();
          renderData.lyrics = lyrics        
          break;
        case 'Genius':
          var lyrics = $('.lyrics').html();
          renderData.lyrics = utilities.parseGeniusLyrics(lyrics)     
          break;
      }
      if (source == "Search") {
        res.render('songSearchResult', renderData)
      } else {
        res.render('song', renderData);
      }
  }).catch(function(error) {
    try { 
      if (error.response.status == 404) {  // serve the songNotFound page if the url request returns a 404 error
        if (index == (lyricSearchOrder.length - 1)) {
          if (source == "Search") {
            res.render('songNotFoundSearch', spotifyUser.getSpotifyUserData());
          } else {
            res.render('songNotFound', spotifyUser.getSpotifyUserData());
          }
        } else {
          getSongLyrics(songData, ++index, source, res);
        }
      }
    } catch(error) {  // if a different error is found, just serve the songNotFound page
      if (source == "Search") {
        res.render('songNotFoundSearch')
      } else {
        res.render('songNotFound');
      }
    }
  });
}


console.log('Listening on 8080');
app.listen(8080);
