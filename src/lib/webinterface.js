const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class Webinterface {
    constructor(host, port, adminPassword, jwtKey, main) {
        this.host = host;
        this.port = port;
        this.adminPassword = adminPassword;
        this.jwtKey = jwtKey;
        this.main = main;

        if(this.adminPassword && !this.jwtKey) {
            this.jwtKey = this.generateRandomKey();
            console.warn('JWT secret is not set. Generating random key, this will lead to all users being logged out.');
        }
    }

    start() {
        this.app = express();

        this.app.use(express.json());
        this.app.use(cookieParser());
        this.app.use((req, res, next) => {
            const queryParams = Object.keys(req.query);
            req.rawQuery = queryParams.length != 0 ? '?'+queryParams.map(key => key + '=' + req.query[key]).join('&') : '';

            if(!this.adminPassword) {
                // redirect away from login page if authentication diabled
                if(req.path == '/login.html') {
                    res.redirect('/'+req.rawQuery);
                    return;
                }
            } else {
                if(req.path == '/api/login') {
                    // ignore requests to login api
                    next();
                    return;
                }

                let loggedIn = false;
                const token = req.cookies.token;
                if(token) loggedIn = this.checkToken(token);

                if(req.path.startsWith('/api/')) {
                    // require login for api requests
                    if(!loggedIn) {
                        res.status(401).end();
                        return;
                    }
                } else if(req.path == '/login.html') {
                    // redirect away from login page if already logged in
                    if(loggedIn) {
                        res.redirect('/'+req.rawQuery);
                        return;
                    }
                } else if(req.path == '/' || req.path.endsWith('.html')) {
                    // require login for all other pages
                    if(!loggedIn) {
                        res.redirect('/login.html'+req.rawQuery);
                        return;
                    }
                }
            }
            next();
        });
        this.app.use(express.static('./www'));

        // Chains
        this.app.get('/api/chain', async (req, res) => {
            try {
                const chainId = this.getChainId(req.query.ip6, req.query.table, '');
                const chains = await this.main.iptables.listChains(req.query.table, req.query.ip6 == 'true');
                chains.forEach(chain => chain.dynamic = this.main.data.dynamicChains.includes(chainId+chain.name));
                res.json({ defaultChain: this.main.config.defaultChain, chains: chains });
            } catch(err) {
                res.status(500).end(err.message);
            }
        });

        this.app.put('/api/chain', async (req, res) => {
            if(req.query.name) {
                try {
                    await this.main.iptables.addChain(req.query.name, req.query.table, req.query.ip6 == 'true');
                    res.end();
                } catch(err) {
                    res.status(500).end(err.message);
                }
            } else {
                res.status(400).end();
            }
        });

        this.app.delete('/api/chain', async (req, res) => {
            if(req.query.name) {
                try {
                    await this.main.iptables.deleteChain(req.query.name, req.query.table, req.query.ip6 == 'true');
                    res.end()
                } catch(err) {
                    res.status(500).end(err.message);
                }
            } else {
                res.status(400).end();
            }
        });

        this.app.post('/api/chain', async (req, res) => {
            if(!req.query.action || !req.query.name) {
                res.status(400).end('Missing action');
                return;
            }
            try {
                switch(req.query.action) {
                    case 'rename':
                        if(!req.query.newName) {
                            res.status(400).end('Missing parameters for rename');
                            return;
                        }
                        await this.main.iptables.renameChain(req.query.name, req.query.newName, req.query.table, req.query.ip6 == 'true');
                        res.end();
                        break;
                    case 'setDefaultPolicy':
                        if(!req.query.policy) {
                            res.status(400).end('Missing parameters for setDefaultPolicy');
                            return;
                        }
                        await this.main.iptables.setDefaultPolicy(req.query.name, req.query.policy, req.query.table, req.query.ip6 == 'true');
                        res.end();
                        break;
                    case 'setDynamic':
                        const chainId = this.getChainId(req.query.ip6, req.query.table, req.query.name);
                        if(req.query.dynamic == 'true') {
                            if(!this.main.data.dynamicChains.includes(chainId)) {
                                this.main.data.dynamicChains.push(chainId);
                                this.main.saveData();
                            }
                            res.end();
                        } else if(req.query.dynamic == 'false') {
                            if(this.main.data.dynamicChains.includes(chainId)) {
                                this.main.data.dynamicChains = this.main.data.dynamicChains.filter(id => id != chainId);
                                this.main.saveData();
                            }
                            res.end();
                        } else {
                            res.status(400).end('Missing parameters for setDynamic');
                        }
                        break;
                    default:
                        res.status(400).end('Unknown action');
                }
            } catch(err) {
                res.status(500).end(err.message);
            }
        });

        // Rules
        this.app.get('/api/rules', async (req, res) => {
            if(req.query.chain) {
                try {
                    const chains = await this.main.iptables.listRules(req.query.chain, req.query.table, req.query.ip6 == 'true');
                    res.json(chains);
                } catch(err) {
                    res.status(500).end(err.message);
                }
            } else {
                res.status(400).end();
            }
        });

        this.app.put('/api/rules', async (req, res) => {
            if(req.query.chain && req.body.rule) {
                try {
                    if(req.query.index) {
                        await this.main.iptables.insertRule(req.query.chain, req.query.index, req.body.rule, req.query.table, req.query.ip6 == 'true');
                    } else {
                        await this.main.iptables.addRule(req.query.chain, req.body.rule, req.query.table, req.query.ip6 == 'true');
                    }
                    res.end();
                } catch(err) {
                    res.status(500).end(err.message);
                }
            } else {
                res.status(400).end();
            }
        });

        this.app.delete('/api/rules', async (req, res) => {
            if(req.query.chain && req.query.index) {
                try {
                    await this.main.iptables.deleteRule(req.query.chain, req.query.index, req.query.table, req.query.ip6 == 'true');
                    res.end();
                } catch(err) {
                    res.status(500).end(err.message);
                }
            } else {
                res.status(400).end();
            }
        });

        this.app.post('/api/rules', async (req, res) => {
            if(!req.query.chain || !req.query.index || !req.query.action) {
                res.status(400).end('Missing parameters');
                return;
            }
            try {
                switch(req.query.action) {
                    case 'edit':
                        if(!req.body.rule) {
                            res.status(400).end('Missing parameters for edit');
                            return;
                        }
                        await this.main.iptables.editRule(req.query.chain, req.query.index, req.body.rule, req.query.table, req.query.ip6 == 'true');
                        res.end();
                        break;
                    case 'move':
                        if(!req.query.newIndex) {
                            res.status(400).end('Missing parameters for move');
                            return;
                        }
                        await this.main.iptables.moveRule(req.query.chain, req.query.index, req.query.newIndex, req.query.table, req.query.ip6 == 'true');
                        res.end();
                        break;
                    default:
                        res.status(400).end('Unknown action');
                }
            } catch(err) {
                res.status(500).end(err.message);
            }
        });

        // Save & restore
        this.app.post('/api/save', async (req, res) => {
            await this.main.iptables.saveRules(this.main.data.dynamicChains);
            res.end();
        });
        this.app.post('/api/restore', async (req, res) => {
            await this.main.iptables.restoreRules(this.main.config.flushOnRestore);
            res.end();
        });

        // Conntrack
        this.app.get('/api/conntrack', async (req, res) => {
            try {
                const entries = await this.main.conntrack.listEntries();
                res.set('Content-Type', 'application/xml');
                res.end(entries);
            } catch(err) {
                res.status(500).end(err.message);
            }
        });
        this.app.delete('/api/conntrack', async (req, res) => {
            try {
                if(req.query.id) {
                    await this.main.conntrack.deleteEntry(req.query.id);
                    res.end();
                } else if(req.query.flush) {
                    await this.main.conntrack.flushTable();
                    res.end();
                } else {
                    res.status(400).end();
                }
            } catch(err) {
                res.status(500).end(err.message);
            }
        });

        // Login
        this.app.post('/api/login', (req, res) => {
            const data = req.body;
            if(data.password) {
                const token = this.loginUser(data.password);
                if(token) {
                    res.cookie('token', token, {maxAge: 2630000000}).json({success: true});
                } else {
                    res.json({success: false});
                }
            } else {
                res.status(400).end();
            }
        });
        this.app.post('/api/logout', (req, res) => {
            res.clearCookie('token').end();
        });

        this.app.listen(this.port, this.host, () => {
            console.log('Started webinterface on port '+this.port);
        });
    }

    generateRandomKey() {
        return crypto.randomBytes(30).toString('hex');
    }

    loginUser(password) {
        if(password === this.adminPassword) {
            const token = jwt.sign({}, this.jwtKey, {
                expiresIn: '30d'
            });
            return token;
        } else {
            return false;
        }
    }

    checkToken(token) {
        try {
            jwt.verify(token, this.jwtKey);
            return true;
        } catch(err) {
            return false;
        }
    }

    getChainId(ipv6, table, chain) {
        return `${ipv6 == 'true'}-${table || 'filter'}-${chain}`;
    }
}

module.exports = Webinterface;
