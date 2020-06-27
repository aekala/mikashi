#!/bin/bash
curl http://www.songlyrics.com/kendrick-lamar/humble-lyrics/ > humble.txt
cat humble.txt | sed -ne '/<p id="songLyricsDiv"/,$ p' > temp.txt
cat temp.txt | sed '/<\/div>/,$d' > temp2.txt
