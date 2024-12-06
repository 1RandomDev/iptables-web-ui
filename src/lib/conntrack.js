const CLIWrapper = require('./cli-wrapper');

class Conntrack extends CLIWrapper {
    constructor(debug) {
        super(debug);
    }

    async listEntries() {
        return this.executeCommand('conntrack', ['-L', '-o', 'xml']);
    }

    async deleteEntry(id) {
        await this.executeCommand('conntrack', ['-D', '-i', id]);
    }

    async flushTable() {
        await this.executeCommand('conntrack', ['-F']);
    }
}
module.exports = Conntrack;