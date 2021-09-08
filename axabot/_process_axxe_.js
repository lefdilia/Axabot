
var { spawn } = require('child_process');
var { resolve } = require('path');

var _args = process.argv; 

_args.splice(0, 2);
var _p = resolve(__dirname, 'axxe.js');
_args.unshift(_p);

const ls = spawn('node', _args, {
  stdio: 'inherit',
  detached: true
})

ls.on('close', function (code) {
  process.stdout.write('spawn axxe finished with code ' + code + '\n');
});