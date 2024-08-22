const rulesTable = document.querySelector('#rulesTable tbody');
const addRuleForm = document.getElementById('addRuleForm');
const currentChainElement = document.getElementById('currentChain');
const deleteChainModal = document.getElementById('deleteChainModal');
const createChainModal = document.getElementById('createChainModal');
const deleteRuleModal = document.getElementById('deleteRuleModal');
const DEFAULT_CHAIN = 'false-filter-FORWARD';

let currentChain;
let chains = {};

// Chains
function switchChain(id) {
    currentChain = chains[id];
    updateChainInfo();
    loadRules();
}

function updateChainInfo() {
    document.getElementById('currentTable').innerText = currentChain.table;
    currentChainElement.innerText = currentChain.name;
    currentChainElement.dataset.edit = 'false';
    document.getElementById('currentChainActions').style.display = currentChain.system ? 'none' : null;
}

async function loadChains() {
    for(const element of document.querySelectorAll('#chainSelect [data-table]')) {
        const table = element.dataset.table;
        const ip6 = element.dataset.ip6;
        let html = '';
    
        let res = await fetch(`/api/chain?table=${table}&ip6=${ip6}`);
        if(!res.ok) throw new Error('Request failed with status: '+res.status);
        res = await res.json();
        
        res.forEach(chain => {
            chain.table = table;
            chain.ip6 = ip6;
            const chainId = ip6+'-'+table+'-'+chain.name;
            chains[chainId] = chain;
            html += `<li><div class="dropdown-item curs-pointer ${chain.system ? 'fw-bold' : ''}" onclick="switchChain('${chainId}')">${chain.name}</div></li>`;
        });
    
        html += `<li><div class="dropdown-item curs-pointer" onclick="createChainPopup('${table}', '${ip6}')">[New Chain]</div></li>`;
    
        element.querySelector('.dropdown-menu').innerHTML = html;
    }

    if(!currentChain) switchChain(DEFAULT_CHAIN);
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
        textField.onkeydown = event => {
            if(event.key == 'Enter') {
                currentChainElement.dataset.edit = 'false';
                currentChainElement.innerText = currentChain.name;
                renameCurrentChain(textField.value);
            }
        };
        currentChainElement.appendChild(textField);
    }

});

document.querySelector('#currentChainActions .transparentDeleteBtn').addEventListener('click', () => {
    deleteChainModal.querySelector('.chainName').innerText = currentChain.name;
    new bootstrap.Modal(deleteChainModal).show();
});

async function deleteCurrentChain() {
    let res = await fetch(`/api/chain?table=${currentChain.table}&ip6=${currentChain.ip6}&name=${currentChain.name}`, { method: 'DELETE' });
    if(!res.ok) throw new Error('Request failed with status: '+res.status);

    await loadChains();
    switchChain(DEFAULT_CHAIN);
}

async function renameCurrentChain(newName) {
    if(!newName || newName == currentChain.name) return;

    let res = await fetch(`/api/chain?table=${currentChain.table}&ip6=${currentChain.ip6}&action=rename&name=${currentChain.name}&newName=${newName}`, { method: 'POST'});
    if(!res.ok) throw new Error('Request failed with status: '+res.status);

    await loadChains();
    switchChain(currentChain.ip6+'-'+currentChain.table+'-'+newName);
}

function createChainPopup(table, ip6) {
    createChainModal.querySelector('.createBtn').onclick = () => {
        const nameField = document.getElementById('createChainName');
        if(!nameField.value) return;
        createNewChain(table, ip6, nameField.value);
        nameField.value = '';
    };
    new bootstrap.Modal(createChainModal).show();
}
async function createNewChain(table, ip6, name) {
    let res = await fetch(`/api/chain?table=${table}&ip6=${ip6}&name=${name}`, { method: 'PUT' });
    if(!res.ok) throw new Error('Request failed with status: '+res.status);

    await loadChains();
    switchChain(ip6+'-'+table+'-'+name);
}

// Rules
async function loadRules() {
    let res = await fetch(`/api/rules?chain=${currentChain.name}&table=${currentChain.table}&ip6=${currentChain.ip6}`);
    if(!res.ok) throw new Error('Request failed with status: '+res.status);
    res = await res.json();

    let i = 1;
    rulesTable.innerHTML = '';
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
                    <td class="rule">${rule}</td>
                    <td>
                        <button class="btn-transparent transparentEditBtn" title="Edit" onclick="showEditRuleField(this, ${i})">&nbsp;</button>
                        <button class="btn-transparent transparentDeleteBtn" title="Delete" onclick="showDeleteRuleModal(this, ${i})">&nbsp;</button>
                    </td>
                </tr>`;
           rulesTable.appendChild(tableRow.content.firstChild);
           i++;
        });
    }
    addRuleForm.querySelector('.index').placeholder = i;
    $('#rulesTable').tableDnDUpdate();
}

$(document).ready(() => {
    $('#rulesTable').tableDnD({
        onDrop: (table, draggedRow) => {
            let newIndex, oldIndex = draggedRow.id.replace('rule-', '');
            let i = 1;
            for(const row of rulesTable.children) {
                if(row == draggedRow) newIndex = i;
                i++;
            }
            moveRow(oldIndex, newIndex)
        },
        dragHandle: '.handle',
        onDragClass: 'isDragged'
    });
});
async function moveRow(oldIndex, newIndex) {
    if(oldIndex == newIndex) return;
    let res = await fetch(`/api/rules?table=${currentChain.table}&ip6=${currentChain.ip6}&chain=${currentChain.name}&action=move&index=${oldIndex}&newIndex=${newIndex}`, { method: 'POST' });
    if(!res.ok) throw new Error('Request failed with status: '+res.status);
    await loadRules();
}

function showDeleteRuleModal(button, index) {
    const row = button.parentElement.parentElement;
    deleteRuleModal.querySelector('.rule').innerText = row.dataset.rule;
    deleteRuleModal.querySelector('.deleteBtn').onclick = () => deleteRule(index);
    new bootstrap.Modal(deleteRuleModal).show();
}
async function deleteRule(index) {
    let res = await fetch(`/api/rules?table=${currentChain.table}&ip6=${currentChain.ip6}&chain=${currentChain.name}&index=${index}`, { method: 'DELETE' });
    if(!res.ok) throw new Error('Request failed with status: '+res.status);
    await loadRules();
}

function showEditRuleField(button, index) {
    const row = button.parentElement.parentElement;
    const ruleColumn = row.querySelector('.rule');
    if(row.dataset.edit == 'true') {
        row.dataset.edit = 'false';
        ruleColumn.innerHTML = row.dataset.rule;
    } else {
        row.dataset.edit = 'true';
        const textField = document.createElement('input');
        textField.classList.add('form-control', 'input-sm');
        textField.value = ruleColumn.innerText;
        textField.onkeydown = event => {
            if(event.key == 'Enter') {
                row.dataset.edit = 'false';
                ruleColumn.innerHTML = row.dataset.rule;
                editRule(index, textField.value);
            }
        };
        ruleColumn.innerText = '';
        ruleColumn.appendChild(textField);
    }
}
async function editRule(index, newValue) {
    if(!newValue) return;

    let res = await fetch(`/api/rules?table=${currentChain.table}&ip6=${currentChain.ip6}&chain=${currentChain.name}&action=edit&index=${index}`, {
        method: 'POST',
        headers: new Headers({'Content-Type': 'application/json'}),
        body: JSON.stringify({rule: newValue})
    });
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
    let index = parseInt(indexField.value);
    if(!index || index < 1 || index > parseInt(indexField.placeholder)) index = '';

    await insertRule(index, ruleField.value);
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
    if(!res.ok) throw new Error('Request failed with status: '+res.status);
    await loadRules();
}
