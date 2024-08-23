const logoutBtn = document.getElementById('logoutBtn');
const rulesTable = document.querySelector('#rulesTable tbody');
const addRuleForm = document.getElementById('addRuleForm');
const currentChainElement = document.getElementById('currentChain');
const deleteChainModal = document.getElementById('deleteChainModal');
const createChainModal = document.getElementById('createChainModal');
const deleteRuleModal = document.getElementById('deleteRuleModal');
const toastContainer = document.getElementById('toastContainer');
const DEFAULT_CHAIN = 'false-filter-FORWARD';

let currentChain;
let chains = {};
let numRules = 0;

// Chains
async function switchChain(id) {
    currentChain = chains[id];
    updateChainInfo();
    await loadRules();
}

function updateChainInfo() {
    document.getElementById('currentTable').innerText = currentChain.table;
    currentChainElement.innerText = currentChain.name;
    currentChainElement.dataset.edit = 'false';
    document.getElementById('currentChainActions').style.display = currentChain.system ? 'none' : null;
    const defaultPolicyElement = document.getElementById('currentChainDefaultPolicy'), defaultPolicySelect = defaultPolicyElement.querySelector('select');
    defaultPolicyElement.style.display = currentChain.system ? null : 'none';
    defaultPolicySelect.value = currentChain.defaultPolicy;
    defaultPolicySelect.setAttribute('style', `color: rgb(var(--bs-${currentChain.defaultPolicy == 'ACCEPT' ? 'success' : 'danger'}-rgb)) !important`);
}

async function loadChains() {
    for(const element of document.querySelectorAll('#chainSelect [data-table]')) {
        const table = element.dataset.table;
        const ip6 = element.dataset.ip6;
        let html = '';
    
        let res = await fetch(`/api/chain?table=${table}&ip6=${ip6}`);
        if(res.status == 500) throw new Error(await res.text());
        if(!res.ok) throw new Error('Request failed with status: '+res.status);
        res = await res.json();
        
        res.forEach(chain => {
            chain.table = table;
            chain.ip6 = ip6;
            const chainId = ip6+'-'+table+'-'+chain.name;
            chains[chainId] = chain;
            html += `<li><div class="dropdown-item curs-pointer ${chain.system ? 'fw-bold' : ''}" onclick="switchChain('${chainId}')">${chain.name}</div></li>`;
        });
    
        html += `<li><div class="dropdown-item curs-pointer" onclick="showCreateChainModal('${table}', '${ip6}')">[New Chain]</div></li>`;
    
        element.querySelector('.dropdown-menu').innerHTML = html;
    }

    if(!currentChain) await switchChain(DEFAULT_CHAIN);
}
loadChains();

document.querySelector('#currentChainActions .transparentEditBtn').addEventListener('click', () => {
    if(currentChain.system) return;
    if(currentChainElement.dataset.edit == 'true') {
        currentChainElement.dataset.edit = 'false';
        currentChainElement.innerText = currentChain.name;
    } else {
        currentChainElement.dataset.edit = 'true';
        currentChainElement.innerText = '';
        const textField = document.createElement('input');
        textField.classList.add('form-control', 'input-sm');
        textField.value = currentChain.name;
        textField.onkeydown = async event => {
            if(event.key == 'Enter') {
                currentChainElement.dataset.edit = 'false';
                const oldName = currentChain.name;
                if(oldName == textField.value) {
                    currentChainElement.innerText = oldName;
                    return;
                }
                try {
                    await renameCurrentChain(textField.value);
                    showToast({
                        message: `Chain <b>${oldName}</b> renamed to <b>${textField.value}</b>`,
                        type: 'info'
                    });
                } catch(err) {
                    currentChainElement.innerText = oldName;
                    showError(err.message);
                }
            }
        };
        currentChainElement.appendChild(textField);
        setTimeout(() => textField.focus(), 50);
    }
});
async function renameCurrentChain(newName) {
    if(!newName || newName == currentChain.name) return;

    let res = await fetch(`/api/chain?table=${currentChain.table}&ip6=${currentChain.ip6}&action=rename&name=${currentChain.name}&newName=${newName}`, { method: 'POST'});
    if(res.status == 500) throw new Error(await res.text());
    if(!res.ok) throw new Error('Request failed with status: '+res.status);

    await loadChains();
    await switchChain(currentChain.ip6+'-'+currentChain.table+'-'+newName);
}

document.querySelector('#currentChainActions .transparentDeleteBtn').addEventListener('click', event => {
    const clickHandler = async () => {
        try {
            await deleteCurrentChain();
            showToast({
                message: `Chain <b>${currentChain.name}</b> successfully deleted`,
                type: 'danger'
            });
        } catch(err) {
            showError(err.message);
        }
    };
    if(event.shiftKey) {
        clickHandler();
    } else {
        deleteChainModal.querySelector('.chainName').innerText = currentChain.name;
        deleteChainModal.querySelector('.deleteBtn').onclick = clickHandler;
        new bootstrap.Modal(deleteChainModal).show();
    }
});
async function deleteCurrentChain() {
    let res = await fetch(`/api/chain?table=${currentChain.table}&ip6=${currentChain.ip6}&name=${currentChain.name}`, { method: 'DELETE' });
    if(res.status == 500) throw new Error(await res.text());
    if(!res.ok) throw new Error('Request failed with status: '+res.status);

    await loadChains();
    await switchChain(DEFAULT_CHAIN);
}

function showCreateChainModal(table, ip6) {
    const nameField = document.getElementById('createChainName');
    const createBtn = createChainModal.querySelector('.createBtn')
    nameField.value = '';
    setTimeout(() => nameField.focus(), 50);
    nameField.onkeydown = event => {
        if(event.key == 'Enter') createBtn.click();
    };
    createBtn.onclick = async () => {
        if(!nameField.value) return;
        try {
            await createNewChain(table, ip6, nameField.value);
            showToast({
                message: `Chain <b>${nameField.value}</b> successfully created`,
                type: 'success'
            });
        } catch(err) {
            showError(err.message);
        }
    };
    new bootstrap.Modal(createChainModal).show();
}
async function createNewChain(table, ip6, name) {
    let res = await fetch(`/api/chain?table=${table}&ip6=${ip6}&name=${name}`, { method: 'PUT' });
    if(res.status == 500) throw new Error(await res.text());
    if(!res.ok) throw new Error('Request failed with status: '+res.status);

    await loadChains();
    await switchChain(ip6+'-'+table+'-'+name);
}

document.querySelector('#currentChainDefaultPolicy select').addEventListener('change', async event => {
    if(!currentChain.system) return;
    try {
        await setDefaultPolicy(event.target.value);
        currentChain.defaultPolicy = event.target.value;
        event.target.setAttribute('style', `color: rgb(var(--bs-${currentChain.defaultPolicy == 'ACCEPT' ? 'success' : 'danger'}-rgb)) !important`);
    } catch(err) {
        event.target.value = currentChain.defaultPolicy;
        showError(err.message);
    }
});
async function setDefaultPolicy(policy) {
    let res = await fetch(`/api/chain?table=${currentChain.table}&ip6=${currentChain.ip6}&action=setDefaultPolicy&name=${currentChain.name}&policy=${policy}`, { method: 'POST'});
    if(res.status == 500) throw new Error(await res.text());
    if(!res.ok) throw new Error('Request failed with status: '+res.status);
}

// Rules
async function loadRules(forceUpdate = true) {
    let res = await fetch(`/api/rules?chain=${currentChain.name}&table=${currentChain.table}&ip6=${currentChain.ip6}`);
    if(res.status == 500) throw new Error(await res.text());
    if(!res.ok) throw new Error('Request failed with status: '+res.status);
    res = await res.json();

    // Try detecting changes by other applications by quickly comparing chain length
    if(forceUpdate || numRules != res.length) {
        if(!forceUpdate) {
            showToast({
                message: 'Iptables rules were changed by other application',
                type: 'danger'
            })
        }
        let i = 1;
        rulesTable.innerHTML = '';
        numRules = res.length;
        if(res.length == 0) {
            const tableRow = document.createElement('template');
                tableRow.innerHTML =
                    `<tr>
                        <td></td>
                        <td></td>
                        <td class="text-light">Empty chain</td>
                        <td></td>
                    </tr>`;
            rulesTable.appendChild(tableRow.content.firstChild);
        } else {
            res.forEach(rule => {
                const tableRow = document.createElement('template');
                tableRow.innerHTML =
                    `<tr id="rule-${i}" data-rule="${rule}">
                        <td class="handle"></td>
                        <td>${i}</td>
                        <td class="rule">${highlightRuleSyntax(rule)}</td>
                        <td>
                            <button class="btn-transparent transparentEditBtn" title="Edit" onclick="showEditRuleField(this, ${i})">&nbsp;</button>
                            <button class="btn-transparent transparentDeleteBtn" title="Delete" onclick="showDeleteRuleModal(this, event.shiftKey, ${i});">&nbsp;</button>
                        </td>
                    </tr>`;
               rulesTable.appendChild(tableRow.content.firstChild);
               i++;
            });
        }
        addRuleForm.querySelector('.index').placeholder = i;
        $('#rulesTable').tableDnDUpdate();
    }
}
setInterval(() => loadRules(false), 60000);

$(document).ready(() => {
    $('#rulesTable').tableDnD({
        onDrop: async (table, draggedRow) => {
            let newIndex, oldIndex = draggedRow.id.replace('rule-', '');
            let i = 1;
            for(const row of rulesTable.children) {
                if(row == draggedRow) newIndex = i;
                i++;
            }
            try {
                await moveRow(oldIndex, newIndex)
            } catch(err) {
                showError(err.message);
            }
        },
        dragHandle: '.handle',
        onDragClass: 'isDragged'
    });
});
async function moveRow(oldIndex, newIndex) {
    if(oldIndex == newIndex) return;
    let res = await fetch(`/api/rules?table=${currentChain.table}&ip6=${currentChain.ip6}&chain=${currentChain.name}&action=move&index=${oldIndex}&newIndex=${newIndex}`, { method: 'POST' });
    if(res.status == 500) throw new Error(await res.text());
    if(!res.ok) throw new Error('Request failed with status: '+res.status);
    await loadRules();
}

function showDeleteRuleModal(button, skipWarning, index) {
    const clickHandler = async () => {
        try {
            await deleteRule(index);
            showToast({
                message: `Rule <b>${index}</b> successfully deleted`,
                type: 'danger'
            });
        } catch(err) {
            showError(err.message);
        }
    };
    if(skipWarning) {
        clickHandler();
    } else {
        const row = button.parentElement.parentElement;
        deleteRuleModal.querySelector('.rule').innerText = row.dataset.rule;
        deleteRuleModal.querySelector('.deleteBtn').onclick = clickHandler;
        new bootstrap.Modal(deleteRuleModal).show();
    }
}
async function deleteRule(index) {
    let res = await fetch(`/api/rules?table=${currentChain.table}&ip6=${currentChain.ip6}&chain=${currentChain.name}&index=${index}`, { method: 'DELETE' });
    if(res.status == 500) throw new Error(await res.text());
    if(!res.ok) throw new Error('Request failed with status: '+res.status);
    await loadRules();
}

function showEditRuleField(button, index) {
    const row = button.parentElement.parentElement;
    const ruleColumn = row.querySelector('.rule');
    if(row.dataset.edit == 'true') {
        row.dataset.edit = 'false';
        ruleColumn.innerHTML = highlightRuleSyntax(row.dataset.rule);
    } else {
        row.dataset.edit = 'true';
        const textField = document.createElement('input');
        textField.classList.add('form-control', 'input-sm');
        textField.value = ruleColumn.innerText;
        textField.onkeydown = async event => {
            if(event.key == 'Enter') {
                row.dataset.edit = 'false';
                if(!textField.value || textField.value == row.dataset.rule) {
                    ruleColumn.innerHTML = highlightRuleSyntax(row.dataset.rule);
                    return;
                }
                try {
                    await editRule(index, textField.value);
                } catch(err) {
                    ruleColumn.innerHTML = highlightRuleSyntax(row.dataset.rule);
                    showError(err.message);
                }
            }
        };
        ruleColumn.innerText = '';
        ruleColumn.appendChild(textField);
        setTimeout(() => textField.focus(), 50);
    }
}
async function editRule(index, newValue) {
    let res = await fetch(`/api/rules?table=${currentChain.table}&ip6=${currentChain.ip6}&chain=${currentChain.name}&action=edit&index=${index}`, {
        method: 'POST',
        headers: new Headers({'Content-Type': 'application/json'}),
        body: JSON.stringify({rule: newValue})
    });
    if(res.status == 500) throw new Error(await res.text());
    if(!res.ok) throw new Error('Request failed with status: '+res.status);
    await loadRules();
}

addRuleForm.querySelector('.value').addEventListener('keydown', event => {
    if(event.key == 'Enter') addRuleForm.querySelector('.transparentCreateBtn').click();
});
addRuleForm.querySelector('.transparentCreateBtn').addEventListener('click', async () => {
    const indexField = addRuleForm.querySelector('.index');
    const ruleField = addRuleForm.querySelector('.value');
    if(!ruleField.value) return;
    let index = parseInt(indexField.value), lastIndex = parseInt(indexField.placeholder);
    if(!index || index < 1 || index > lastIndex) index = lastIndex;

    try {
        await insertRule(index, ruleField.value);
        showToast({
            message: `Rule <b>${index}</b> successfully created`,
            type: 'success'
        });
    } catch(err) {
        showError(err.message);
    }
    indexField.value = '';
    ruleField.value = '';
});
async function insertRule(index, value) {
    if(!value) return;

    let res = await fetch(`/api/rules?table=${currentChain.table}&ip6=${currentChain.ip6}&chain=${currentChain.name}&index=${index}`, {
        method: 'PUT',
        headers: new Headers({'Content-Type': 'application/json'}),
        body: JSON.stringify({rule: value})
    });
    if(res.status == 500) throw new Error(await res.text());
    if(!res.ok) throw new Error('Request failed with status: '+res.status);
    await loadRules();
}

// Common
function highlightRuleSyntax(rule) {
    // Link to related chains
    const matches = rule.match(/\-j (.+?)$/);
    if(matches) {
        for(const [id, chain] of Object.entries(chains)) {
            if(chain.name == matches[1]) {
                rule = rule.replace(/\-j (.+?)$/, `-j <span class="hl-link" onclick="switchChain('${id}'); return false">$1</span>`);
                break;
            }
        }
    }

    // Colorize common rule elements
    return rule.replace(/!/g, '<span class="hl-color-not">!</span>')
               .replace(/(\-i|\-o) .+?(\s|$)/g, '<span class="hl-color-if">$&</span>')
               .replace(/(\-s|\-d) .+?(\s|$)/g, '<span class="hl-color-ip">$&</span>')
               .replace(/(\-p|\-m) (tcp|udp)/g, '<span class="hl-color-tcp">$&</span>')
               .replace(/--(d|s)port .+?(\s|$)/g, '<span class="hl-color-tcp">$&</span>')
               .replace(/ACCEPT/, '<span class="text-success">ACCEPT</span>')
               .replace(/DROP|REJECT/, '<span class="text-danger">$&</span>')
               .replace(/--reject-with .+?(\s|$)/, '<span class="text-danger">$&</span>');
}

function showError(message) {
    showToast({
        message: '<b>An internal error occoured:</b><br>'+message.replace('\n', '<br>'),
        type: 'danger',
        width: '500px'
    });
}
function showToast(data) {
    let toastElement = document.createElement('template');
    toastElement.innerHTML =
        `<div class="toast align-items-center border-0 mb-2 text-bg-${data.type || 'secondary'}">
            <div class="d-flex">
                <div class="toast-body">
                    ${data.message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>`;
    toastElement = toastElement.content.firstChild;
    if(data.width) toastElement.style.width = data.width;
    toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
    toastContainer.appendChild(toastElement);
    new bootstrap.Toast(toastElement).show();
}

if(document.cookie.includes('token=')) logoutBtn.classList.remove('d-none');
logoutBtn.addEventListener('click', async function(event) {
    event.preventDefault();
    let res = await fetch('/api/logout', { method: 'POST' });
    if(!res.ok) throw new Error('Request failed with status: '+res.status);
    window.location.replace('/login.html');
});
