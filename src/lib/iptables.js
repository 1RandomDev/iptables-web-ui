const childProcess = require('child_process');

class Iptables {
    // Chains
    async listChains(table = 'filter', ip6 = false) {
        const output = await this.execute(['-t', table, '-S'], ip6);
        const chains = [];
        loop: for(const line of output.split('\n')) {
            const parts = line.split(' ');
            switch(parts[0]) {
                case '-P':
                    chains.push({
                        name: parts[1],
                        system: true,
                        defaultPolicy: parts[2]
                    });
                    break;
                case '-N':
                    chains.push({
                        name: parts[1],
                        system: false
                    });
                    break;
                default:
                    break loop;
            }
        }
        return chains;
    }
    async addChain(name, table = 'filter', ip6 = false) {
        await this.execute(['-t', table, '-N', name], ip6);
    }
    async deleteChain(name, table = 'filter', ip6 = false) {
        await this.execute(['-t', table, '-X', name], ip6);
    }
    async renameChain(oldName, newName, table = 'filter', ip6 = false) {
        await this.execute(['-t', table, '-E', oldName, newName], ip6);
    }
    async setDefaultPolicy(chainName, value, table = 'filter', ip6 = false) {
        await this.execute(['-t', table, '-P', chainName, value], ip6);
    }

    // Rules
    async listRules(chain, table = 'filter', ip6 = false) {
        const output = await this.execute(['-t', table, '-S', chain], ip6);
        const rules = [];
        for(const line of output.split('\n')) {
            const parts = line.split(' ');
            if(parts[0] == '-A') {
                parts.shift();
                parts.shift();
                rules.push(parts.join(' '));
            }
        }
        return rules;
    }
    async getRule(chain, index, table = 'filter', ip6 = false) {
        const output = await this.execute(['-t', table, '-S', chain, index], ip6);
        const parts = output.trim().split(' ');
        parts.shift();
        parts.shift();
        return parts.join(' ');
    }
    async addRule(chain, value, table = 'filter', ip6 = false) {
        await this.execute(['-t', table, '-A', chain, ...value.split(' ')], ip6);
    }
    async insertRule(chain, index, value, table = 'filter', ip6 = false) {
        await this.execute(['-t', table, '-I', chain, index, ...value.split(' ')], ip6);
    }
    async deleteRule(chain, index, table = 'filter', ip6 = false) {
        await this.execute(['-t', table, '-D', chain, index], ip6);
    }
    async editRule(chain, index, newValue, table = 'filter', ip6 = false) {
        await this.execute(['-t', table, '-R', chain, index, ...newValue.split(' ')], ip6);
    }
    async moveRule(chain, oldIndex, newIndex, table = 'filter', ip6 = false) {
        if(oldIndex == newIndex) return;
        const rule = await this.getRule(chain, oldIndex, table, ip6);
        await this.deleteRule(chain, oldIndex, table, ip6);
        await this.insertRule(chain, newIndex, rule, table, ip6);
    }

    execute(args, ip6) {
        return new Promise((resolve, reject) => {
            const arpscan = childProcess.spawn(ip6 ? 'ip6tables' : 'iptables', args);
           
            let buffer = '', errbuffer = '';
            arpscan.stdout.on('data', data => buffer += data);
            arpscan.stderr.on('data', data => errbuffer += data);
    
            arpscan.on('close', code => {
                if(code != 0) {
                    reject(errbuffer.trim());
                    return;
                }
                resolve(buffer);
            });
    
            arpscan.on('error', err => {
                reject(err);
            });
        });
    }
}
module.exports = Iptables;
