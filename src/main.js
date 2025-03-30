const Conntrack = require('./lib/conntrack');
const Iptables = require('./lib/iptables');
const Webinterface = require('./lib/webinterface');
const fs = require('fs');
require('dotenv').config();

class Main {
    async start() {
        this.config = {
            debugMode: process.env.DEBUG_MODE == 'true',
            defaultChain: process.env.DEFAULT_CHAIN || 'false-filter-INPUT',
            flushOnRestore: process.env.FLUSH_ON_RESTORE != 'false',
            dataDirectory: process.env.DATA_DIRECTORY || './data',

            webuiHost: process.env.WEBUI_HOST,
            webuiPort: process.env.WEBUI_PORT || 8585,
            webuiPassword: process.env.WEBUI_PASSWORD
        };

        this.data = {
            jwtSecret: '',
            dynamicChains: []
        };
        if(!fs.existsSync(this.config.dataDirectory)) {
            fs.mkdirSync(this.config.dataDirectory);
        }
        if(!fs.existsSync(this.config.dataDirectory+'/iptables-web-ui.json')) {
            this.data.jwtSecret = require('crypto').randomBytes(48).toString('hex');
            fs.writeFileSync(this.config.dataDirectory+'/iptables-web-ui.json', JSON.stringify(this.data, null, 4));
        } else {
            Object.assign(this.data, JSON.parse(fs.readFileSync(this.config.dataDirectory+'/iptables-web-ui.json')));
        }
        
        this.iptables = new Iptables(this.config.debugMode);
        this.conntrack = new Conntrack(this.config.debugMode);

        this.webinterface = new Webinterface(this.config.webuiHost, this.config.webuiPort, this.config.webuiPassword, this.data.jwtSecret, this);
        this.webinterface.start();
    }

    saveData() {
        fs.writeFileSync(this.config.dataDirectory+'/iptables-web-ui.json', JSON.stringify(this.data, null, 4));
    }
}
new Main().start();
