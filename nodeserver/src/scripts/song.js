var request = require('axios');
var cheerio = require('cheerio');
var spotifyUser = require('./spotifyUser.js');
var utilities = require('./utilities.js');
const { render } = require('./app.js');

var urls = [];

function getSongData(songResponse, lyricFilterOrder, isUpdate, res) {
    const songData = {
          songName: songResponse.data.item.name,
          artist: songResponse.data.item.artists[0].name,
          albumName: songResponse.data.item.album.name, 
          albumArtUrl: songResponse.data.item.album.images[0].url,  
    } 
    songData.songParam = songData.songName.toLowerCase().trim().split(' ').join('-');
    songData.artistParam = songData.artist.toLowerCase().trim().split(' ').join('-');

    getSongLyrics(songData, 0, "Spotify", lyricFilterOrder, isUpdate, res);
}

function filterSongTitle(title, filter) {
  // title is made lowercase before invoking filterSongTitle because indexOf is case-sensitive
  return (title.indexOf(filter) > 0) ? title.substring(0, title.indexOf(filter)) : title;
}

function getSongLyrics(songData, index, source, lyricFilterOrder, isUpdate, res) {
    let lyricsURL;
    switch(lyricFilterOrder[index]) {
      case 'SongLyrics-full':
        lyricsURL = 'http://www.songlyrics.com/' + songData.artistParam + '/' + songData.songParam + '-lyrics/';
        break;
      case 'SongLyrics-feat-filter':
        songData.songParam = filterSongTitle(songData.songName.toLowerCase(), "feat").trim().split(' ').join('-');
        lyricsURL = 'http://www.songlyrics.com/' + songData.artistParam + '/' + songData.songParam + '-lyrics/';
        break;
      case 'SongLyrics-parenthesis-filter':
        songData.songParam = filterSongTitle(songData.songName.toLowerCase(), "(").trim().split(' ').join('-');
        lyricsURL = 'http://www.songlyrics.com/' + songData.artistParam + '/' + songData.songParam + '-lyrics/';
        break;
      case 'SongLyrics-dash-filter':
        songData.songParam = filterSongTitle(songData.songName.toLowerCase(), "-").trim().split(' ').join('-');
        lyricsURL = 'http://www.songlyrics.com/' + songData.artistParam + '/' + songData.songParam + '-lyrics/';
        break;
      case 'Genius-full':
        lyricsURL = 'http://www.genius.com/' + songData.artistParam + '-' + songData.songParam + '-lyrics';
        break;
      case 'Genius-feat-filter':
        songData.songParam = filterSongTitle(songData.songName.toLowerCase(), "feat").trim().split(' ').join('-');
        lyricsURL = 'http://www.genius.com/' + songData.artistParam + '-' + songData.songParam + '-lyrics';
        break;
      case 'Genius-parenthesis-filter':
        songData.songParam = filterSongTitle(songData.songName.toLowerCase(), "(").trim().split(' ').join('-');
        lyricsURL = 'http://www.genius.com/' + songData.artistParam + '-' + songData.songParam + '-lyrics';
        break;
      case 'Genius-dash-filter':
        songData.songParam = filterSongTitle(songData.songName.toLowerCase(), "-").trim().split(' ').join('-');
        lyricsURL = 'http://www.genius.com/' + songData.artistParam + '-' + songData.songParam + '-lyrics';
        break;
    }

    urls[index] = lyricsURL;

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
        switch(lyricFilterOrder[index]) {
          case 'SongLyrics-full':
          case 'SongLyrics-feat-filter':
          case 'SongLyrics-parenthesis-filter':
          case 'SongLyrics-dash-filter':
            var lyrics = $('#songLyricsDiv').html();
            renderData.lyrics = lyrics        
            break;
          case 'Genius-full':
          case 'Genius-feat-filter':
          case 'Genius-parenthesis-filter':
          case 'Genius-dash-filter':
            var lyrics = $('.lyrics').html();
            renderData.lyrics = utilities.parseGeniusLyrics(lyrics)     
            break;
          default:
            renderData.lyrics = "We do not currently have lyrics for: " + renderData.songName;
        }

        // move on to next URL if SongLyrics has this text but no actual lyrics
        if (renderData.lyrics.indexOf("We do not have the lyrics for") == 0) {
          throw new Error('Lyrics Not Found at URL: ' + lyricsURL);
        }

        if (source == "Search") {
          res.render('songSearchResult', renderData)
        } else if (isUpdate) {
          res.render('updatedSong', renderData);
        } else {
          res.render('song', renderData);
        }
    }).catch(function(error) {
      try { 
        if (error.response.status == 404) {  // try next URL or render songNotFound page if the current url request returns a 404 error
          if (index == (lyricFilterOrder.length - 1)) {
            if (source == "Search") {
              res.render('songNotFoundSearch', spotifyUser.getSpotifyUserData());
            } else if (isUpdate) {
              res.render('updatedSongNotFound');
            } else {
              res.render('songNotFound', spotifyUser.getSpotifyUserData());
            }
          } else {
            getSongLyrics(songData, ++index, source, lyricFilterOrder, isUpdate, res);
          }
        } else {
        // } else if (renderData && renderData.lyrics && renderData.lyrics.indexOf("We do not have the lyrics for") == 0) {
          getSongLyrics(songData, ++index, source, lyricFilterOrder, isUpdate, res);
        }
      } catch(error) {  // if a different error is found, just serve the songNotFound page
        if (source == "Search") {
          res.render('songNotFoundSearch');
        } else if (isUpdate) {
          if (index == (lyricFilterOrder.length - 1)) {
            res.render('updatedSongNotFound');
          } else {
            getSongLyrics(songData, ++index, source, lyricFilterOrder, isUpdate, res);
          }
        } else {
          if (index == (lyricFilterOrder.length - 1)) {
            res.render('songNotFound');
          } else {
            getSongLyrics(songData, ++index, source, lyricFilterOrder, isUpdate, res);
          }
        }
      }
    });
}

exports.getSongData = getSongData;
exports.getSongLyrics = getSongLyrics;