#!/usr/bin/bash
FTP_HOST='charitycan.ca'
FTP_USER='mcharters'

webpack -p
rake war
pushd Launch4j
ant -f ../build.xml windows
popd
cp build/tabula.jar build/windows/
pushd build/windows
ftp -n -v $FTP_HOST << EOT
user $FTP_USER $1
cd WebSites/tabula
binary
put tabula.jar
binary
put tabula.exe
quit
EOT
popd
exit 0
