var express = require('express');
var router = express.Router();
var querystring = require('querystring');

var utilities = require('../scripts/utilities.js');

router.get('/', function(req, res) {
    var stateKey = req.stateKey;
    var client_id = req.client_id;
    var redirect_uri = req.redirect_uri;

    var state = utilities.generateRandomString(16);
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

module.exports = router;