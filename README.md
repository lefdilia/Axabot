# Axabot File Uploader

Automatic web Application for download **(torrents)** & Upload to file sharing **(Rapidgator, Nitroflare, Uploaded, ...)**

## Axabot File Uploader features :

- Using Rutorrent to Download Torrents
- Parse from RSS feeds 
- Download or Exclude torrents that contain words
- Feed Parse / Download / Upload automatically
- Create Multi Upload Profiles
- Use **NFO** files as image
- Generate images for videos (Thumbnails with Custom Columns and Rows)
- Create Videos Sample
- Upload Sample to multiple Hosts
- Re-upload after failure ( x times )
- Compress / Split & Set password for Big Files 
- Upload Topic Image **(Multiple hosting List)**
- Use Shortnet List **(Tiny.cc, shorte.st...)**
- Generate templates for each Task automatically & Easily
- Custom upload names
- Auto-Post to API 
- Log of all Uploads / Templates
- **FTP** Access to Downloads :fire:

## Requirements
- **VPS / Dedicated**
- **OS:** Debian 9, 64 bits 
- **Ram:** Minimum 1GB RAM 
- **Disk:** 50GB space 
- **CPU:** Intel Atom C2350 - 1.7 GHz - 2 core(s)

* **Tested Configuration** : Intel Atom C2350 - 1.7 GHz - 2 core(s) - 4GB (DDR3) - 1TB (HDD SATA)

<img src="images/setup/Server_OS_Setup.png">

#### <span style="color:red">PS : `/mdb` - 10 Gb  Partition is mandatory before start Axabot Installation </span>.

## Installation
##### -  Open Terminal
- Connect to server via ssh : **`ssh root@163.202.62.11`**
- Get Root access : **`su`**
- Install **rsync** : **`apt-get install rsync`**

##### - In new Terminal Tab
- Open **Terminal** Or **Git** for Windows Users, you can download it from here : [Git-2.33.0.2-32-bit.exe](https://github.com/git-for-windows/git/releases/download/v2.33.0.windows.2/Git-2.33.0.2-32-bit.exe)
- Run `git clone https://github.com/lefdilia/Axabot.git && cd "$(basename "$_" .git)/_init"`
- Run **`npm install`** ( To install dependencies )
- Run **`npm start`** ( To start server setup )

##### `- Options to Choose : [1] New Server Install ( To setup newly bought servers )`

<img src="images/setup/Initialize_Bot_Setup.png">

##### `- Edit Axabot Config File`
- Go to folder : **`cd /Axabot/axabot/config/ini.json`**, and edit **Keys** data :

```javascript

    "keys": {
        "tmdb": { //TMDB : https://www.themoviedb.org/documentation/api
            "key": "0000000000000000000000000000000"
        },
        "tvdb": {  //TVDB : https://thetvdb.com/api-information
            "apikey": "0000000000000000",
            "userkey": "0000000000000000",
            "username": "axabotUser"
        },
        "transport": { // Mailer Username
            "user": "axabot@vpn.tg",
            "pass": "00000000000"
        },
        "OAuth2": { // Google's API console ( OAuth 2.0 )
            "type": "OAuth2",
            "user": "lefdilia@gmail.com",
            "clientId": "0000000000000-00000000000000000000000000000000.apps.googleusercontent.com",
            "clientSecret": "0000000000000000000",
            "refreshToken": "1/0000000000000000000000000000000000000000000"
        }
    }

```



##### `- In first Terminal Tab (SSH)`
- Go to shell folder : **`cd /tmp/Axabot/shell/`**
- Set permissions :  **`chmod +x install.sh`**
- Start Install : **`./install.sh`**

###### - Normal Install process (around ~10 min)

```javascript
[
    {
        "Access" : "VSftpd",
        "Infos"  : {
            "Server": "163.202.62.11",
            "port": "21",
            "username": "sfxuser",
            "Password": "**********",

        }
    },
    {
        "Access" : "Rutorrent",
        "Infos"  : {
            "url": "http://163.202.62.11/rutorrent",
            "username": "rxuser",
            "Password": "**********",
        }
    },
    {
        "Access" : "Axabot",
        "Infos"  : {
            "Server": "http://163.202.62.11",
            "username": "axuser",
            "Password": "**********",
        }
    }
]
```
#### <span style="color:red">PS : Please save your setup data in a text file before reboot (After the installation is finished) </span><br/><br/>


## :tada: Illustrated Setup :tada:
<img src="images/_setup_tutorial.gif">

## Screenshots
<p align="center">
<img src="images/proof/login_.png" width="700"><br/>
<img src="images/proof/Settings_Service.png" width="700"><br/>
<img src="images/proof/Templates.png" width="700"><br/>
<img src="images/proof/Templates_.png" width="700"><br/>
<img src="images/proof/actif_templates_.png" width="700"><br/>
<img src="images/proof/_parser_.png" width="700"><br/>
<img src="images/proof/File_manager.png" width="700"><br/>
<img src="images/proof/add-feed.png" width="700"><br/>
<img src="images/proof/Post_API.png" width="700"><br/>
<img src="images/proof/Profile_Setting.png" width="700"><br/>
<img src="images/proof/upload_tasks.png" width="700"><br/>
<img src="images/proof/context_menu.png" width="700"><br/>
<img src="images/proof/context_menu_2.png" width="700"><br/>
<img src="images/proof/feeds.png" width="700"><br/>
<img src="images/proof/rutorrent_.png" width="700"><br/>
<br/>
<br/>
<img src="images/proof/finished_task.png" width="600">
</p>



