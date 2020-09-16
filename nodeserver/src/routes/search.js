var express = require('express');
var router = express.Router();
var spotifyUser = require('../scripts/spotifyUser.js');

router.get('/', function(req, res) {
    res.render('search', spotifyUser.getSpotifyUserData());
})

module.exports = router;