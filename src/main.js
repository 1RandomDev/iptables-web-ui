const Conntrack = require('./lib/conntrack');
const Iptables = require('./lib/iptables');
const Webinterface = require('./lib/webinterface');
const fs = require('fs');
require('dotenv').config({ quiet: true });

class Main {
    async start() {
        this.config = {
            debugMode: process.env.DEBUG_MODE == 'true',
            defaultChain: this.migrateChainId(process.env.DEFAULT_CHAIN || 'ip4-filter-INPUT'),
            flushOnRestore: process.env.FLUSH_ON_RESTORE != 'false',
            dataDirectory: process.env.DATA_DIRECTORY || './data',

            webuiHost: process.env.WEBUI_HOST,
            webuiPort: process.env.WEBUI_PORT || 8585,
            webuiPasswordHash: process.env.WEBUI_PASSWORD_HASH
        };

        if(process.env.WEBUI_PASSWORD && !this.config.webuiPasswordHash) {
            console.error('WEBUI_PASSWORD is no longer supported. Please replace it with WEBUI_PASSWORD_HASH (see README for more details).');
            process.exit(1);
        }

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

            const dynamicChains = this.data.dynamicChains.map(id => this.migrateChainId(id));
            if(dynamicChains.some((id, i) => id != this.data.dynamicChains[i])) {
                this.data.dynamicChains = dynamicChains;
                this.saveData();
            }
        }
        
        this.iptables = new Iptables(this.config.debugMode);
        this.conntrack = new Conntrack(this.config.debugMode);

        this.webinterface = new Webinterface(this.config.webuiHost, this.config.webuiPort, this.config.webuiPasswordHash, this.data.jwtSecret, this);
        this.webinterface.start();
    }

    migrateChainId(id) {
        // convert legacy format <true/false>-<table>-<chain> to <ip4/ip6>-<table>-<chain>
        return id.replace(/^(true|false)-/, (match, ipv6) => ipv6 == 'true' ? 'ip6-' : 'ip4-');
    }

    saveData() {
        fs.writeFileSync(this.config.dataDirectory+'/iptables-web-ui.json', JSON.stringify(this.data, null, 4));
    }
}
new Main().start();
