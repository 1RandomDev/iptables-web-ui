const childProcess = require('child_process');

class CLIWrapper {
    constructor(debug) {
        this.debug = debug;
    }

    executeCommand(cmd, args) {
        return new Promise((resolve, reject) => {
            const arpscan = childProcess.spawn(cmd, args);
            if(this.debug) console.log(cmd+' '+args.join(' '));
           
            let buffer = '', errbuffer = '';
            arpscan.stdout.on('data', data => buffer += data);
            arpscan.stderr.on('data', data => errbuffer += data);
    
            arpscan.on('close', code => {
                if(code != 0) {
                    reject(new Error(errbuffer.trim()));
                    return;
                }
                resolve(buffer);
            });
    
            arpscan.on('error', err => {
                reject(new Error(err));
            });
        });
    }
}
module.exports = CLIWrapper;
