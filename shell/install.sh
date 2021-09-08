# Axabot : Install Full Server
# Created by Lefdili Alaoui Ayoub
############################
#!/bin/bash
clear

# Formatting variables
BOLD=$(tput bold)
NORMAL=$(tput sgr0)
BCLEAR=$(tput setaf 44)
RED=$(tput setaf 1)
GREEN=$(tput setaf 2)
LBLUE=$(tput setaf 6)

# The system user rtorrent /flood is going to run as
GROUP_USERS="seedboxusers"
RTORRENT_USER="rtorrent"
FLOOD_USER="flood"
#
#
EMAIL=""
IPLOCAL=""
IPEXTER=""
#
#DEV
BOT_FOLDER='/tmp/Axabot/axabot/'
#
SHELL_FOLDER='/tmp/Axabot/shell/'
#
BANDWIDTH_MAX="21990232555520"
DISK_MAX="1099511627776"
####
#Users
USERNAME="axuser"    #Bot
ND_USERNAME="fxuser" #FTP 
P_USERNAME="rxuser"  #Rutorrent
####
SRV_RTORRENT="/etc/systemd/system/rtorrent.service"
SRV_FLOOD="/etc/systemd/system/flood.service"
#
SMDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )" #/mnt/hgfs/shell

function CHECK_ROOT {
	if [ "$(id -u)" != "0" ]; then
		echo
		echo "This script must be run as root." 1>&2
        echo "${BCLEAR}AxaBot Server Install © 2019"
		echo
		exit 1
	fi
}

while [[ ! $EMAIL =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$ ]]; do
    echo -n "${BOLD}${RED}Please type user Email ${NORMAL}${LBLUE}(*):${NORMAL}"
    read EMAIL
done


function INSTALL_UTILS {
	RTORRENT_CHECK="$(dpkg-query -W -f='${Status}' rtorrent 2>/dev/null | grep -c "ok installed")"
	SCREEN_CHECK="$(dpkg-query -W -f='${Status}' screen 2>/dev/null | grep -c "ok installed")"
	CURL_CHECK="$(dpkg-query -W -f='${Status}' curl 2>/dev/null | grep -c "ok installed")"
	SUDO_CHECK="$(dpkg-query -W -f='${Status}' sudo 2>/dev/null | grep -c "ok installed")"
	MEDIAINFO_CHECK="$(dpkg-query -W -f='${Status}' mediainfo 2>/dev/null | grep -c "ok installed")"
	GIT_CHECK="$(dpkg-query -W -f='${Status}' git 2>/dev/null | grep -c "ok installed")"
	UNRAR_CHECK="$(dpkg-query -W -f='${Status}' unrar 2>/dev/null | grep -c "ok installed")"
	RAR_CHECK="$(dpkg-query -W -f='${Status}' rar 2>/dev/null | grep -c "ok installed")"
	REDIS_SERVER_CHECK="$(dpkg-query -W -f='${Status}' redis-server 2>/dev/null | grep -c "ok installed")"
	PYTHON_PIP_CHECK="$(dpkg-query -W -f='${Status}' python-pip 2>/dev/null | grep -c "ok installed")"
	FFMPEG_CHECK="$(dpkg-query -W -f='${Status}' ffmpeg 2>/dev/null | grep -c "ok installed")"
	DIRMNGR_CHECK="$(dpkg-query -W -f='${Status}' dirmngr 2>/dev/null | grep -c "ok installed")"
	PHP7_CHECK="$(dpkg-query -W -f='${Status}' php7.0 2>/dev/null | grep -c "ok installed")"
	PHP7_FPM_CHECK="$(dpkg-query -W -f='${Status}' php7.0-fpm 2>/dev/null | grep -c "ok installed")"
    UNZIP_CHECK="$(dpkg-query -W -f='${Status}' unzip 2>/dev/null | grep -c "ok installed")"
	AP_UT_CHECK="$(dpkg-query -W -f='${Status}' apache2-utils 2>/dev/null | grep -c "ok installed")"
    VSFTPD_CHECK="$(dpkg-query -W -f='${Status}' vsftpd 2>/dev/null | grep -c "ok installed")"
    VNSTAT_CHECK="$(dpkg-query -W -f='${Status}' vnstat 2>/dev/null | grep -c "ok installed")"
    # 
    SENDMAIL_CHECK="$(dpkg-query -W -f='${Status}' sendmail 2>/dev/null | grep -c "ok installed")"

	if [ "$RTORRENT_CHECK" -ne 1 ] || [ "$SCREEN_CHECK" -ne 1 ] || [ "$CURL_CHECK" -ne 1 ] || [ "$SUDO_CHECK" -ne 1 ] || [ "$MEDIAINFO_CHECK" -ne 1 ] || [ "$GIT_CHECK" -ne 1 ] || [ "$UNRAR_CHECK" -ne 1 ] || [ "$RAR_CHECK" -ne 1 ] || [ "$REDIS_SERVER_CHECK" -ne 1 ] || [ "$PYTHON_PIP_CHECK" -ne 1 ] || [ "$FFMPEG_CHECK" -ne 1 ] || [ "$DIRMNGR_CHECK" -ne 1 ] || [ "$PHP7_CHECK" -ne 1 ] || [ "$PHP7_FPM_CHECK" -ne 1 ] || [ "$UNZIP_CHECK" -ne 1 ] || [ "$AP_UT_CHECK" -ne 1 ] || [ "$VSFTPD_CHECK" -ne 1 ] || [ "$VNSTAT_CHECK" -ne 1 ] || [ "$SENDMAIL_CHECK" -ne 1 ] ; then
		echo " One or more of the packages rtorrent, screen, curl, sudo, mediainfo, git, unrar, rar, redis-server, sox, pwgen, python-pip, ffmpeg, dirmngr, nginx, php7.0, php7.0-fpm, unzip, vsftpd, vnstat, sendmail or apache2-utils is not installed and is needed for the setup."
		read -p " Do you want to install it? [y/n] " -n 1
		if [[ $REPLY =~ [Yy]$ ]]; then
			clear
			apt-get update -y
			apt-get -y install rtorrent screen curl sudo mediainfo git unrar rar redis-server sox pwgen python-pip ffmpeg dirmngr nginx php7.0 php7.0-fpm unzip apache2-utils vsftpd vnstat sendmail-bin sendmail
		else
			clear
			exit
		fi
	fi
}

function GENERATE_PASSWORDS {
ND_PASSWORD=$(pwgen 10 1)
P_PASSWORD=$(pwgen 10 1)
}

function INSTALL_NODEJS {
        "$(which node)" --version | grep "v" &> /dev/null 
        if [ ! $? == 0 ]; then 
        curl -sL https://deb.nodesource.com/setup_12.x | bash -
        apt-get install -y nodejs
        fi

        apt-get install build-essential -y
        npm install -g node-gyp
        npm install -g pm2
}

function CONFIG_RTORRENT {
        #Create user for rtorrent daemon
        cat /etc/passwd | grep ${RTORRENT_USER} >/dev/null 2>&1
        if [ ! $? -eq 0 ] ; then
        adduser --disabled-password --gecos "" rtorrent
        echo "${BCLEAR}Create user for Rtorrent daemon"
            else
        echo "${BCLEAR}Add User for Rtorrent daemon"
        fi

        #Create user for flood interface
        cat /etc/passwd | grep ${FLOOD_USER} >/dev/null 2>&1
        if [ ! $? -eq 0 ] ; then
        adduser --disabled-password --gecos "" flood
        echo "${BCLEAR}Create user for Flood Webui Interface"
            else
        echo "${BCLEAR}Add User for Flood Webui Interface"
        fi

        #Create .session Folder
        if [ ! -d /home/rtorrent/.session ] 
        then 
            mkdir -p /home/rtorrent/.session
            chown rtorrent:rtorrent -R /home/rtorrent/.session
            echo "${BCLEAR}.session Directory is created : /home/rtorrent/.session"
        fi

        #Create and Give the permissions to .rtorrent.rc
        if [ ! -f /home/rtorrent/.rtorrent.rc ]
        then 
            cp "$SMDIR/rtorrent.rc" "/home/rtorrent/.rtorrent.rc"
            chown rtorrent:rtorrent /home/rtorrent/.rtorrent.rc
            echo "${BCLEAR}.rtorrent.rc file is created : /home/rtorrent/.rtorrent.rc"
        fi

        if [ ! -f /home/rtorrent/axxe.js ] 
        then 
    cat > "/home/rtorrent/axxe.js" <<-EOF
    var fs = require('fs');
    const { Console } = require('console');
    const output = fs.createWriteStream('/home/rtorrent/stdout.log');
    const errorOutput = fs.createWriteStream('/home/rtorrent/stderr.log');
    // custom simple logger
    const logger = new Console(output, errorOutput);
    // use it like console
    logger.log('TEST : ', process.argv);
	EOF
        fi

        #Create downloads/.watch/incomplete Folders
        if [ ! -d /srv/seedbox ]
        then 
            mkdir -p /srv/seedbox/{downloads,.watch,incomplete}
            mkdir -p /srv/seedbox/downloads/{Compressed,Samples,Thumbnails,Posts}

            echo "${BCLEAR}Seedbox Directorys are created : /srv/seedbox/(downloads/.watch/incomplete)"
            echo "${BCLEAR}Seedbox Directorys are created : /srv/seedbox/downloads(Compressed/Samples/Thumbnails/Posts)"
        fi

        if [ ! $(getent group seedboxusers) ]; then
            groupadd seedboxusers
        fi

        usermod -a -G seedboxusers rtorrent
        usermod -a -G seedboxusers flood

        chgrp -R seedboxusers /srv/seedbox
        chgrp -R seedboxusers /srv/seedbox/downloads
        chmod -R 777 /srv/seedbox
        chown rtorrent:seedboxusers /srv/seedbox -R

}

function CONFIG_FLOOD {
     if [ ! -d /var/www/flood ]
        then
            cd /var/www
            git clone https://github.com/jfurrow/flood.git 
            cd flood
            cp "$SMDIR/flood.config.js" "/var/www/flood/config.js"
            chown -R flood:flood "/var/www/flood"
        else
            cd /var/www/flood
            if [ -d /var/www/flood/node_modules/ ]
            then
                rm -R /var/www/flood/node_modules/
            fi
        fi

    npm install
    npm run build

    echo "${BCLEAR}Flood Setup : Passed.${NORMAL}"
}

function RUTORRENT_CONFIG {
    if [ ! -d /var/www/rutorrent ]
        then
            cd /var/www
            git clone https://github.com/Novik/ruTorrent.git rutorrent
            cp "$SMDIR/rutorrent.config.php" "/var/www/rutorrent/conf/config.php"
            chown -R www-data:www-data /var/www/rutorrent
            chmod -R 775 /var/www/rutorrent
            echo "${GREEN}Rutorrent created successfully${NORMAL}"
        else
            cd /var/www/rutorrent
    fi

    htpasswd -b -c /var/www/rutorrent/.htpasswd "${P_USERNAME}" "${P_PASSWORD}"
    chown -R www-data:www-data /var/www/rutorrent/.htpasswd
}

function NGINX_CONFIG {
    cp "$SMDIR/nginx.default" "/etc/nginx/sites-available/default"
    
    if nginx -t 2>/dev/null; then echo "Nginx success"; else echo "Nginx fail"; fi
    service nginx restart && service php7.0-fpm restart
    
    cp "$SMDIR/nginx.error" "/var/www/html/error.html"

}

function INSTALL_MONGODB {

    apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 9DA31620334BD75D9DCB49F368818C72E52529D4
    echo "deb http://repo.mongodb.org/apt/debian stretch/mongodb-org/4.0 main" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.0.list

    apt-get update -y
    apt-get install -y mongodb-org
    systemctl enable mongod
    
    ## Chnage storage to /mdb (10 GB of storage)
    ## Edit /etc/mongodb.conf
    ## /!\ this command cause Error on Permission, Mongod fail to start [drwxr-xr-x  mongodb:nogroup  mdb]
    sed -i 's/  dbPath: \/var\/lib\/mongodb/  dbPath: \/mdb/g' /etc/mongod.conf
    chown -R mongodb: /mdb

    ##Add restart to mongod service (/lib/systemd/system/mongod.service )
    sed  -i '/ExecStart/s/$/\nRestart=always\nRestartSec=0/' /lib/systemd/system/mongod.service
    #Reload for change
    systemctl daemon-reload
    systemctl start mongod

    echo "Mongodb Installed successfully."
}
#
# If error on mongodb (small reinstall will fix it) [ Make a backup before ]
# https://askubuntu.com/questions/884541/cant-start-mongodb-service


function INSTALL_MTN {
    if ! [ -x "$(command -v mtn)" ]; then
            cd /tmp
            git clone https://gitlab.com/movie_thumbnailer/mtn.git
            cd mtn/src
            apt-get -y install libgd-dev libavutil-dev libavcodec-dev libavformat-dev libswscale-dev make
            make
            make install
        fi

    if [ -x "$(command -v mtn)" ]; then
    echo "MTN Setup : Passed.${NORMAL}"
    fi
}


function SERVICES_RTORRENT_BOOT {
	cat > "$SRV_RTORRENT" <<-EOF
    [Unit]
    Description=rTorrent
    After=network.target

    [Service]
    User=rtorrent
    Type=forking
    KillMode=none
    ExecStart=/usr/bin/screen -d -m -fa -S rtorrent /usr/bin/rtorrent
    ExecStop=/usr/bin/killall -w -s 2 /usr/bin/rtorrent
    WorkingDirectory=%h
    Restart=always
    RestartSec=0

    [Install]
    WantedBy=default.target
	EOF

    systemctl enable rtorrent
    systemctl start rtorrent

    echo "${BCLEAR}Rtorrent Service enabled successfully : Passed.${NORMAL}"
}

function SERVICES_FLOOD_BOOT {
	cat > "$SRV_FLOOD" <<-EOF
    [Unit]
    Description=Flood rTorrent WebUI
    After=network.target

    [Service]
    WorkingDirectory=/var/www/flood
    ExecStart=/usr/bin/npm start
    User=flood
    Restart=always

    [Install]
    WantedBy=multi-user.target
	EOF

    systemctl enable flood
    systemctl start flood

    echo "${BCLEAR}Flood Service enabled successfully : Passed.${NORMAL}"
}

function CONFIG_REDIS_BOOT {
    systemctl enable redis-server.service
    echo "${BCLEAR}Redis-Server Service enabled successfully : Passed.${NORMAL}"
}

function CONFIG_PYTHONSCC {
    pip install cloudscraper
    echo "${BCLEAR}cloudscraper enabled installed successfully : Passed.${NORMAL}"
}

function INSTALL_BOT {
    #Create Bot Folder
    if [ ! -d /opt/axabot ] 
    then 
        mkdir -p /opt/axabot
        chmod -R 755 /opt
        chmod -R 777 /opt/axabot
        echo "${BCLEAR}Axabot Directory is created : /opt/axabot"
    fi

    #-Help-#
    #Copy Project Todestination
    rsync -a --exclude='node_modules' "$BOT_FOLDER" /opt/axabot
    echo "${BCLEAR}Axabot files are copied to Destination : /opt/axabot"

    #Clear _Cache Folder
    rm -rf /opt/axabot/_cache/*
    echo "${BCLEAR}Cache Directory is empty"

    cd /opt/axabot
    npm install

    #Experimental
    npm start
    pm2 unstartup
    pm2 save
    pm2 startup
    systemctl enable pm2-root

}


function CONFIG_VSFTPD {
    cat /etc/passwd | grep ${ND_USERNAME} >/dev/null 2>&1
    if [ ! $? -eq 0 ] ; then

    adduser --quiet --disabled-password --no-create-home --gecos "" $ND_USERNAME
    echo "$ND_USERNAME:$ND_PASSWORD" | chpasswd
    echo "${BCLEAR}Created username : $ND_USERNAME & password : $ND_PASSWORD for FTP"
    else
    echo "$ND_USERNAME:$ND_PASSWORD" | chpasswd
    echo "${BCLEAR}FTP Password has been changed for $ND_USERNAME, Password : $ND_PASSWORD"
    fi
    
    usermod -a -G seedboxusers "${ND_USERNAME}"
    usermod --home /srv/seedbox/downloads $ND_USERNAME

    FILE=/etc/vsftpd.user_list
    if [ -f "$FILE" ]; then
    echo "${ND_USERNAME}" > /etc/vsftpd.user_list
    else 
    touch "$FILE"
    echo "${ND_USERNAME}" > /etc/vsftpd.user_list
    fi

cat > "/etc/vsftpd.conf" <<-EOF
listen=YES
anonymous_enable=NO
local_enable=YES
write_enable=NO
allow_writeable_chroot=YES

chroot_local_user=YES
local_root=/srv/seedbox/downloads

userlist_enable=YES
userlist_file=/etc/vsftpd.user_list
userlist_deny=NO

ftpd_banner=Welcome to Axabot ftp server
EOF

    systemctl restart vsftpd
}

function CONFIG_BOT_USER {

#We must import db for All hosts 
#We must create default user 
##user : axuser
##password : axuser

mongo <<EOF
use axabot
db.user_access.insert({
    "username": '$USERNAME',
    "email": '$EMAIL',
    "password": '\$2a\$05\$8D4ws4UW3ayQb4rj1kT9OugUd5WhqJwZQJOq34uSKdiND4SfUKAgy',
    "access": true,
    "data": {}
})
EOF


mongo <<EOF
use axabot
db.preferences.insert({
    "torrent_pref": {},
    "feed_pref": {
        "pingInterval": "7"
    },
    "rtorrent_pref": {
        "uploadRate": "15",
        "downloadRate": "50",
        "seedTime": "3600"
    },
    "types": [
        "Movies",
        "Tv",
        "Games",
        "Music",
        "Books",
        "Anime",
        "Applications",
        "Miscellaneous",
        "Other"
    ],
    "extra": {
        "vsftpd": {
            "hostname": "$IPLOCAL",
            "port": "21",
            "username": "$ND_USERNAME",
            "password": "$ND_PASSWORD"
        },
        "rutorrent": {
            "username": "$P_USERNAME",
            "password": "$P_PASSWORD"
        },
        "axabot": {
            "username": "axuser",
            "password": "axuser"
        }
    }
})
EOF

mongo <<EOF
use axabot
db.statistics.insert({
    "bandwidth": {
        "total": "0 GB",
        "upload": "0 GB",
        "download": "0 GB"
    },
    "bandwidth_max": $BANDWIDTH_MAX,
    "disk": {
        "size": "0 GB",
        "used": "0 GB",
        "available": "0 GB",
        "percent": "0%"
    },
    "disk_max": $DISK_MAX,
    "extra": {},
    "update_track": {
        "current_version": "N/A",
        "last_time": {}
    }
})
EOF

}


function IMPORT_JSONS {
    cd "$SHELL_FOLDER/jsons"
    for i in *.json; do
        mongoimport --db axabot --collection ${i/.json/} --file $i --jsonArray
    done
     echo "${BCLEAR}DONE Import VARIABLES & HOSTS.${NORMAL}"
}

function GET_IPS {
	IPLOCAL=$(ip addr | grep 'inet ' | awk '{print $2}' | cut -d/ -f1 | grep -v "127." | head -n 1)
    IPEXTER=$(curl -s http://icanhazip.com)
}

function FIX_LOCALES {
    locale-gen --purge en_US.UTF-8
    localedef -i en_US -c -f UTF-8 en_US.UTF-8

    export LC_ALL="en_US.UTF-8"
    export LANGUAGE="en_US.UTF-8"
    export LANG="en_US.UTF-8"
    locale-gen en_US.UTF-8

    #Test Result
    locale -a    
    #$ cat /etc/default/locale
}


function COMPLETE_INSTALL {

if [[ ! -z "$IPLOCAL" ]] && [[ ! -z "$IPEXTER" ]]; then

echo '
[
   {
      '${LBLUE}'"Access"'${NORMAL}':"VSftpd",
      '${LBLUE}'"Infos"'${NORMAL}':{
         '${LBLUE}'"Server"'${NORMAL}':"'$IPLOCAL'",
         '${LBLUE}'"port"'${NORMAL}':"21",
         '${LBLUE}'"username"'${NORMAL}':"'$ND_USERNAME'",
         '${LBLUE}'"Password"'${NORMAL}':"'$ND_PASSWORD'"
      }
   },
   {
      '${LBLUE}'"Access"'${NORMAL}':"Rutorrent",
     '${LBLUE}'"Infos"'${NORMAL}':{
         '${LBLUE}'"url"'${NORMAL}':"http://'$IPLOCAL'/rutorrent",
         '${LBLUE}'"username"'${NORMAL}':"'$P_USERNAME'",
         '${LBLUE}'"Password"'${NORMAL}':"'$P_PASSWORD'"
      }
   },
   {
      '${LBLUE}'"Access"'${NORMAL}':"Axabot",
      '${LBLUE}'"Infos"'${NORMAL}':{
         '${LBLUE}'"Server"'${NORMAL}':"'$IPLOCAL'",
         '${LBLUE}'"username"'${NORMAL}':"'$USERNAME'",
         '${LBLUE}'"Password"'${NORMAL}':"'$USERNAME'"
      }
   }
]
'
fi

    cd /opt/axabot

    read -p "*Do you want to restart to finish setup ? [y/n] " -n 1
    if [[ $REPLY =~ [Yy]$ ]]; then
        reboot
    else
        echo "${BOLD}Must reboot the server after this.${NORMAL}"
        exit
    fi

}


CHECK_ROOT
FIX_LOCALES
INSTALL_UTILS
GENERATE_PASSWORDS
INSTALL_NODEJS
CONFIG_RTORRENT
#CONFIG_FLOOD
RUTORRENT_CONFIG
NGINX_CONFIG
INSTALL_MONGODB
INSTALL_MTN
SERVICES_RTORRENT_BOOT
#SERVICES_FLOOD_BOOT
GET_IPS
CONFIG_REDIS_BOOT
CONFIG_PYTHONSCC
CONFIG_VSFTPD
CONFIG_BOT_USER
IMPORT_JSONS
INSTALL_BOT

COMPLETE_INSTALL


#################################################################################
#################################################################################
#-> 20 * 1024 * 1024 * 1024 * 1024 ----> 20 TB
#-> 1024 * 1024 * 1024 * 1024 ==> 1099511627776
#Example : 1099511627776 * 20 == 20TB
#Example : 1099511627776 * 1 == 1TB
