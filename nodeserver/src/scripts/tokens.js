var access_token;
var refresh_token;

exports.setAccessToken = function (token) {
    access_token = token;
}

exports.setRefreshToken = function (token) {
    refresh_token = token;
}

exports.getTokens = function() {
    return {
        access_token: access_token,
        refresh_token: refresh_token
    }
}