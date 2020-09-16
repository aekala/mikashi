var request = require('axios');
var cheerio = require('cheerio');
var spotifyUser = require('./spotifyUser.js');
var utilities = require('./utilities.js');

function getSongLyrics(songData, index, source, lyricSearchOrder, res) {
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
        console.log(error.response);
        if (error.response.status == 404) {  // serve the songNotFound page if the url request returns a 404 error
          if (index == (lyricSearchOrder.length - 1)) {
            if (source == "Search") {
              res.render('songNotFoundSearch', spotifyUser.getSpotifyUserData());
            } else {
              res.render('songNotFound', spotifyUser.getSpotifyUserData());
            }
          } else {
            getSongLyrics(songData, ++index, source, lyricSearchOrder, res);
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

  exports.getSongLyrics = getSongLyrics;