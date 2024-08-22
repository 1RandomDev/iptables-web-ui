const rulesTable = document.querySelector('#rulesTable tbody');
const addRuleForm = document.getElementById('addRuleForm');
const currentChainElement = document.getElementById('currentChain');
const deleteChainModal = document.getElementById('deleteChainModal');
const createChainModal = document.getElementById('createChainModal');
const DEFAULT_CHAIN = 'false-filter-INPUT';

let currentChain;
let chains = {};

function insertRule(index, value) {
    console.log('Insert:', index, value)
}

function moveRow(oldIndex, newIndex) {
    console.log('Move: ', oldIndex, newIndex);
}

function switchChain(id) {
    currentChain = chains[id];
    updateChainInfo();
    // loadRules();
}

function updateChainInfo() {
    document.getElementById('currentTable').innerText = currentChain.table;
    currentChainElement.innerText = currentChain.name;
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
        renameCurrentChain(currentChainElement.querySelector('input').value);
    } else {
        currentChainElement.dataset.edit = 'true';
        currentChainElement.innerText = '';
        const textField = document.createElement('input');
        textField.classList.add('form-control', 'input-sm');
        textField.value = currentChain.name;
        textField.onkeydown = event => {
            if(event.key == 'Enter') {
                currentChainElement.dataset.edit = 'false';
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
    let res = await fetch(`/api/chain?table=${currentChain.table}&ip6=${currentChain.ip6}&name=${currentChain.name}`, { method: 'DELETE'});
    if(!res.ok) throw new Error('Request failed with status: '+res.status);

    await loadChains();
    switchChain(DEFAULT_CHAIN);
}

async function renameCurrentChain(newName) {
    if(newName == currentChain.name) {
        updateChainInfo();
        return;
    }

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
    let res = await fetch(`/api/chain?table=${table}&ip6=${ip6}&name=${name}`, { method: 'PUT'});
    if(!res.ok) throw new Error('Request failed with status: '+res.status);

    await loadChains();
    switchChain(ip6+'-'+table+'-'+name);
}
