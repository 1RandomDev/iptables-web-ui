const Iptables = require('./lib/iptables');
const Webinterface = require('./lib/webinterface');
require('dotenv').config();

class Main {
    async start() {
        this.config = {
            debugMode: process.env.DEBUG_MODE == 'true',
            defaultChain: process.env.DEFAULT_CHAIN || 'false-filter-INPUT',
            excludedChains: process.env.EXCLUDED_CHAINS || [],
            flushOnRestore: process.env.FLUSH_ON_RESTORE == 'true' || true,

            webuiHost: process.env.WEBUI_HOST || '0.0.0.0',
            webuiPort: process.env.WEBUI_PORT || 8585,
            webuiPassword: process.env.WEBUI_PASSWORD,
            webuiJwtKey: process.env.WEBUI_PASSWORD
        };
        
        this.iptables = new Iptables(this.config.debugMode);

        this.webinterface = new Webinterface(this.config.webuiHost, this.config.webuiPort, this.config.webuiPassword, this.config.webuiJwtKey, this);
        this.webinterface.start();
    }
}
new Main().start();
