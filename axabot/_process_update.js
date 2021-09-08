const init = require('./config/init');
const unzipper = require('unzipper');
const rimraf = require('rimraf');
const path = require('path');
const fs = require('fs');
const request = require('request');
const pm2 = require('pm2');
const ps = require('ps-node');
const { spawn } = require('child_process');

const _args = process.argv.slice(2);
const _updateCode = init._updateCode;

var _tempZip = '/tmp/_update.zip';
var _projectPath = _args[0];
var _mName = _args[1];
var _app = path.join(_projectPath, 'app.js');

request({
    url: _updateCode,
    headers: {
        'Cache-Control': 'no-cache'
    }
}).pipe(fs.createWriteStream(_tempZip)).on('close', function () {

    fs.access(_tempZip, fs.F_OK, (err) => {
        if (err) return process.exit(0);

        pm2.describe(_mName, function (err, processDescription) {
            if (err) processDescription = [{}];
            processDescription = Array.isArray(processDescription) ? processDescription[0] : processDescription;
            var _b_pid = processDescription ? processDescription.pid : null;

            fs.createReadStream(_tempZip).pipe(unzipper.Extract({ path: _projectPath })).on('close', function () {
                //Remove Zip file downloaded
                rimraf(_tempZip, function (err) {
                    const ls = spawn('npm', ['install'], { cwd: _projectPath });

                    ls.stdout.on('data', (data) => {
                        console.log(`Install Progress : ${data}`);
                    });

                    ls.stderr.on('data', (data) => {
                        console.log(`Install Progress : ${data}`);
                    });

                    ls.on('close', (code) => {
                        //Node Run Code On _Process_EXupdate.js
                        //Start
                        const EXls = spawn('node', ['_process_EXUP.js'], {
                            stdio: 'inherit',
                            detached: true,
                            cwd: _projectPath
                        })
                        //End

                        EXls.on('close', function () {
                            pm2.connect(function (err) {
                                if (err) {
                                    if (_b_pid) {
                                        ps.kill(_b_pid, {
                                            signal: 'SIGKILL',
                                            // will set up a ten seconds timeout if the killing is not successful
                                            timeout: 10,
                                        }, function () { });
                                    }
                                } else {
                                    pm2.restart({
                                        script: _app,
                                        name: _mName
                                    }, function (err, apps) {
                                        if (err) {
                                            if (_b_pid) {
                                                ps.kill(_b_pid, {
                                                    signal: 'SIGKILL',
                                                    timeout: 10,
                                                }, function () { });
                                            }
                                        }
                                        pm2.disconnect();
                                    });
                                }
                            });
                        });
                    });
                })
            }).promise().catch(function (err) {
                ps.kill(_b_pid, {
                    signal: 'SIGKILL',
                    timeout: 10,
                }, function () { });
            })
        })
    })

}).on('error', function (err) {
    return process.exit(0);
})


