const connectionTable = document.querySelector('#connectionTable tbody');
const connectionCount = document.getElementById('connectionCount');

async function loadEntries() {
    const res = await fetch('/api/conntrack');
    if(res.status == 500) throw new Error(await res.text());
    if(!res.ok) throw new Error('Request failed with status: '+res.status);
    const parser = new DOMParser();
    const table = parser.parseFromString(await res.text(), 'application/xml');
    const entries = table.querySelectorAll('conntrack flow');

    connectionCount.innerText = entries.length;
    connectionTable.innerHTML = '';
    entries.forEach(entry => {
        const orig = entry.querySelector('meta[direction="original"]'),
              reply = entry.querySelector('meta[direction="reply"]'),
              independent = entry.querySelector('meta[direction="independent"]');
        const l3Proto = orig.getElementsByTagName('layer3')[0].getAttribute('protoname'),
              l4Proto = orig.getElementsByTagName('layer4')[0].getAttribute('protoname');
        const meta = metaToHTML(independent);

        const tableRow = document.createElement('template');
        tableRow.innerHTML =
            `<tr>
                <td class="text-nowrap">${l3Proto} / <span class="hl-proto-${l4Proto}">${l4Proto}</td>
                <td>${meta.state || '-'}</td>
                <td>${layersToHTML(orig)}</td>
                <td>${layersToHTML(reply)}</td>
                <td>${meta.timeout || '-'}</td>
                <td>${meta.id}</td>
                <td><button class="btn-transparent transparentDeleteBtn" title="Delete" onclick="deleteEntry(${meta.id});">&nbsp;</button></td>
            </tr>`;
        connectionTable.appendChild(tableRow.content.firstChild);
    });
}

async function deleteEntry(id) {
    try {
        const res = await fetch('/api/conntrack?id='+id, { method: 'DELETE' });
        if(res.status == 500) throw new Error(await res.text());
        if(!res.ok) throw new Error('Request failed with status: '+res.status);
        showToast({
            message: `Entry <b>${id}</b> successfully deleted`,
            type: 'danger'
        });
        await loadEntries();
    } catch(err) {
        showError(err.message);
    }
}

async function flushTable() {
    try {
        const res = await fetch('/api/conntrack?flush=1', { method: 'DELETE' });
        if(res.status == 500) throw new Error(await res.text());
        if(!res.ok) throw new Error('Request failed with status: '+res.status);
        showToast({
            message: `Flushed connection table`,
            type: 'danger'
        });
        await loadEntries();
    } catch(err) {
        showError(err.message);
    }
}

function layersToHTML(meta) {
    const layer3 = meta.getElementsByTagName('layer3')[0];
    const layer4 = meta.getElementsByTagName('layer4')[0];
    let html = `src=<span class="hl-proto-l3">${layer3.getElementsByTagName('src')[0].innerHTML}</span> dst=<span class="hl-proto-l3">${layer3.getElementsByTagName('dst')[0].innerHTML}</span>`;
    if(['tcp', 'udp'].includes(layer4.getAttribute('protoname'))) {
        html += `<br>sport=<span class="hl-proto-l4">${layer4.getElementsByTagName('sport')[0].innerHTML}</span> dport=<span class="hl-proto-l4">${layer4.getElementsByTagName('dport')[0].innerHTML}</span>`;
    }
    return html;
}
function metaToHTML(meta) {
    let res = {};
    meta.childNodes.forEach(key => {
        let tag = key.tagName, val = key.innerHTML;
        if(!val) {
            res.state ??= `<span class="hl-state-${key.tagName}">${key.tagName.toUpperCase()}</span>`;
        }
        switch(tag) {
            case 'state':
                res.state = `<span class="hl-state-${val.toLowerCase()}">${val}</span>`;
                break;
            case 'timeout':
                res.timeout = formatDuration(parseInt(val));
                break;
            case 'id':
                res.id = val;
                break;
        }
    });
    return res;
}

function formatDuration(duration) {
    const day = Math.floor(duration / 86400),
          hour = Math.floor(duration / 3600) % 24,
          minute = Math.floor(duration / 60) % 60,
          second = Math.floor(duration) % 60;
    if(day) {
        return `${day}d ${hour}h`;
    } else if(hour) {
        return `${hour}h ${minute}min`;
    } else if(minute) {
        return `${minute}min ${second}s`;
    } else {
        return `${second}s`;
    }
}

(async () => {
    try {
        await loadEntries();
    } catch(err) {
        showError(err.message);
    }
})();

document.getElementById('reloadBtn').addEventListener('click', async event => {
    event.target.animate([{transform: 'rotate(0)'}, {transform: 'rotate(180deg)'}], {duration: 300});
    try {
        await loadEntries();
    } catch(err) {
        showError(err.message);
    }
});
document.getElementById('flushBtn').addEventListener('click', async event => {
    const modalOpts = {
        type: 'danger',
        title: 'Flush connection table',
        body: `Are you sure that you want to delete all recorded connections?`
    };
    if((await showModal(modalOpts)).accept) {
        flushTable();
    }
});

if(document.cookie.includes('token=')) logoutBtn.classList.remove('d-none');
logoutBtn.addEventListener('click', async () => {
    let res = await fetch('/api/logout', { method: 'POST' });
    if(!res.ok) throw new Error('Request failed with status: '+res.status);
    window.location.replace('/login.html');
});
