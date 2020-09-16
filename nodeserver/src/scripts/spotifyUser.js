var isLoggedIn = false;
var spotifyUsername;
var spotifyProfileImage;

exports.setLoginStatus = function (status) {
    isLoggedIn = status;
}

exports.setSpotifyUsername = function (username) {
    spotifyUsername = username;
}

exports.setSpotifyProfileImage = function (imageUrl) {
    spotifyProfileImage = imageUrl;
}

exports.getSpotifyUserData = function() {
    return {
        isLoggedIn: isLoggedIn,
        spotifyUsername: spotifyUsername,
        spotifyProfileImage: spotifyProfileImage
    }
}