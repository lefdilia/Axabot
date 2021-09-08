// Axabot : Install New Axabot Server
//  Created by Lefdili Alaoui Ayoub.
//
const readlineSync = require('readline-sync');

var _options = ['New Server Install ( To setup newly bought servers )', 'Bot Only (Fresh install of Axabot [FILES ONLY])'];
var index = readlineSync.keyInSelect(_options, 'Please choose install type?');

if (!_options[index] || _options[index] == 0) return console.log('Instal Ignored...');

const _argv = process.argv.slice(2);
const _stype = _options[index] || 0;

var _ip = _argv[0] && !/^-{2}/.test(_argv[0]) ? _argv[0] : readlineSync.question('* Ip Address : ');

if (!_ip || _ip == '') {
    return console.log('IP Address is missing...');
}

if (!/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/igm.test(_ip)) {
    return console.log('Wrong IP Address...');
} else {
    _ip = _ip.trim();
}

var _username = _argv[1] && !/^-{2}/.test(_argv[1]) ? _argv[1] : readlineSync.question('* Username : ');
if (!_username || _username == '') {
    return console.log('Username is missing...');
} else {
    _username = _username.trim();
}

var _password = _argv[2] && !/^-{2}/.test(_argv[2]) ? _argv[2] : readlineSync.question('* Password : ', { hideEchoBack: true });
if (!_password || _password == '') {
    return console.log('Password is empty...');
} else {
    _password = _password.trim();
}

const fs = require('fs');
const { NodeSSH } = require('node-ssh')
const path = require('path');
const Rsync = require('rsync');

const _source = path.resolve(__dirname, '..')

//Rsync_pass
if (_password) {
    rsync_pass = '/tmp/rsync_pass';
    var stream = fs.createWriteStream(rsync_pass, { mode: 0o600 });
    stream.write(`${_password}`);
    stream.end();
}

const ssh = new NodeSSH()

if (_stype && /^Bot Only/i.test(_stype)) {

    var _botSource = path.join(_source, 'axabot/');
    var _btDestination = '/opt/axabot/';

    console.log(`Install only Bot on ${_btDestination} `);

    const _rm = `su -c "rm -rf ${_btDestination}*"`;

    async function runRootCommand(command, done) {
        await ssh.connect({
            host: _ip,
            username: _username,
            password: _password
        });

        let shellStream = await ssh.requestShell();
        shellStream.on('data', (data) => {
            let stringData = data.toString().trim();
            if (stringData.toLowerCase().includes("password")) {
                let pass = `${_password}\n`;
                shellStream.write(pass, "utf-8", done)
            }
        });
        shellStream.on('data', (data) => {
            if (data.toString().toLowerCase().includes("cannot remove")) { //rm: cannot remove / Directory not empty
                console.log("Cannot Empty Axabot Folder, Try Again")
                process.exit(0)
            }
        })

        shellStream.write("" + command + "\n")
    }

    ssh.connect({
        host: _ip,
        username: _username,
        password: _password
    }).then(function () {
        console.log('Connected via SSH..', _botSource);

        runRootCommand(_rm, function () {

            const rsync = Rsync.build({
                source: _botSource,
                destination: `${_username}@${_ip}:${_btDestination}`,
                exclude: ['node_modules', '.DS_Store', 'package-lock.json', '_cache/*'],
                flags: 'rvh',
                shell: 'ssh'
            });

            rsync.execute(function (error, code, cmd) {
                process.stdout.write(`\n`);
                console.log("Clearing PM2 Now...")
                ssh.execCommand('pm2 delete all', { cwd: _btDestination, stream: 'both', options: { pty: true }})
                .then(function(){
                    console.log('Running Npm install now .... Please wait');
                     return ssh.exec('npm', ['install'], { cwd: _btDestination, stream: 'both', options: { pty: true }})
                }).then(function () {
                    console.log("Dependencies Installed...")
                    return ssh.exec('npm', ['start'], { cwd: _btDestination, stream: 'both', options: { pty: true } })
                }).then(function () {
                    console.log("Axabot Started.")
                    return ssh.exec('node', ['_process_EXUP.js'], { cwd: _btDestination, stream: 'stdout', options: { pty: true } });
                }).then(function () {
                    console.log('All done...');
                    process.exit(0);
                }).catch(function (_error) {
                    console.log('Install error ', _error)
                })

            }, function () {
                process.stdout.write(`Upload in progress, Please Wait...`);
                process.stdout.cursorTo(0);
            });
        })

    }).catch(function (_error) {
        console.log('SSH Connection Error : ', _error)
    })

} else if (_stype && /^New Server Install/i.test(_stype)) {
    ssh.connect({
        host: _ip,
        username: _username,
        password: _password
    }).then(function () {
        console.log('Connected via SSH..');

        var rsync = Rsync.build({
            source: _source,
            destination: `${_username}@${_ip}:/tmp`,
            exclude: [
                'node_modules',
                '.DS_Store',
                'package-lock.json',
                '_cache/*',
                '_init',
                '__crok'],
            flags: 'av',
            shell: 'ssh'
        });

        rsync.execute(function (error, code, cmd) {
            if (code != 0) {
                console.log("Error uploading config files")
                process.exit(0)
            }

            process.stdout.write(`\n`);
            console.log("- Files are Uploaded to /tmp folder")
            console.log("- On SERVER, Command List to Run : ")
            console.log("")
            console.log("cd /tmp/Axabot/shell/")
            console.log("chmod +x install.sh")
            console.log("./install.sh")
            console.log("")

        }, function (data) {
            process.stdout.write(`Upload in progress, Please Wait...`);
            process.stdout.cursorTo(0);
        });
    }).catch(function (error) {
        console.log('Error SSH Connect...')
    })

}