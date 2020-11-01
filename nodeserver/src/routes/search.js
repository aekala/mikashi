var express = require('express');
var router = express.Router();
var spotifyUser = require('../scripts/spotifyUser.js');
var song = require('../scripts/song.js');

router.get('/', function(req, res) {
    res.render('search', spotifyUser.getSpotifyUserData());
})

//handle data sent from /search form
router.post('/submit-song-search', function(req, res) {
    const songData = {
        songName: req.body.song, 
        artist: req.body.artist
    };
    songData.songParam = songData.songName.toLowerCase().trim().split(' ').join('-');
    songData.artistParam = songData.artist.toLowerCase().trim().split(' ').join('-');
    song.getSongLyrics(songData, 0, "Search", req.lyricSearchOrder, false, res);
})

module.exports = router;