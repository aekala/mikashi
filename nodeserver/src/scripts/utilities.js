var HTMLParser = require('node-html-parser');

function parseGeniusLyrics(lyrics) {  // need to ignore annotations and hyperlinks when getting lyrics from Genius 
    console.log("CAME FROM GENIUSSSS")
    let root = HTMLParser.parse(lyrics);
    return root.text.trim().replace(/\n/g, "<br />");
}

exports.parseGeniusLyrics = parseGeniusLyrics;