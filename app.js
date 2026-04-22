// --- System Constraints ---
const VENDORS = ["MATLAB", "ANSYS", "AUTOCAD", "CATIA", "SIEMENS", "FLEX", "RLM"];
const state = { hosts: [], pools: [], filter: "", denials: 0 };

function init() {
    // 1. Generate Infrastructure
    for (let i = 1; i <= 90; i++) {
        state.hosts.push({ id: `SRV-${String(i).padStart(3, '0')}`, status: 'nominal', latency: 2 });
    }

    // 2. Generate Pools
    for (let i = 0; i < 400; i++) {
        const vendor = VENDORS[Math.floor(Math.random() * VENDORS.length)];
        const isTriad = Math.random() > 0.2;
        state.pools.push({
            id: `${vendor}-${1000 + i}`,
            vendor: vendor,
            isTriad: isTriad,
            hostRefs: Array.from({length: isTriad ? 3 : 1}, () => state.hosts[Math.floor(Math.random() * 90)].id),
            status: 'nominal'
        });
    }

    initialRender();
    setupEvents();
    setInterval(tick, 2000);
}

function initialRender() {
    const hostStack = document.getElementById('host-stack');
    const hexGrid = document.getElementById('hex-grid');

    state.hosts.forEach(h => {
        const div = document.createElement('div');
        div.className = 'host-node nominal';
        div.id = `node-${h.id}`;
        div.innerHTML = `<span>${h.id}</span><span class="lat">${h.latency}ms</span>`;
        hostStack.appendChild(div);
    });

    state.pools.forEach(p => {
        const hex = document.createElement('div');
        hex.className = `hex nominal`;
        hex.id = `hex-${p.id}`;
        hex.innerHTML = `<span>${p.vendor.substring(0,3)}</span>`;
        hex.onclick = () => showDetails(p);
        hexGrid.appendChild(hex);
    });
}

function tick() {
    // Inject Entropy
    if (Math.random() > 0.6) {
        const h = state.hosts[Math.floor(Math.random() * 90)];
        h.status = Math.random() > 0.8 ? 'error' : 'warning';
        h.latency = h.status === 'error' ? 999 : 45;
        setTimeout(() => { h.status = 'nominal'; h.latency = 2; }, 6000);
    }

    // Update States without rebuilding DOM
    updateLogic();
}

function updateLogic() {
    let downServices = 0;
    let riskServices = 0;

    state.pools.forEach(p => {
        const activeCount = p.hostRefs.filter(hId => state.hosts.find(h => h.id === hId).status === 'nominal').length;
        const el = document.getElementById(`hex-${p.id}`);
        
        if (p.isTriad) {
            if (activeCount === 3) el.className = 'hex nominal';
            else if (activeCount === 2) { el.className = 'hex degraded'; riskServices++; }
            else { el.className = 'hex critical'; downServices++; }
        } else {
            if (activeCount === 1) el.className = 'hex nominal';
            else { el.className = 'hex critical'; downServices++; }
        }

        // Apply Search Persistence
        const isMatch = p.id.toLowerCase().includes(state.filter);
        el.style.display = isMatch ? 'flex' : 'none';
    });

    // Update Host Nodes
    state.hosts.forEach(h => {
        const el = document.getElementById(`node-${h.id}`);
        el.className = `host-node ${h.status}`;
        el.querySelector('.lat').innerText = `${h.latency}ms`;
    });

    // Update KPIs
    document.getElementById('stat-avail').innerText = `${(((400 - downServices) / 400) * 100).toFixed(2)}%`;
    document.getElementById('stat-risk').innerText = riskServices;
    document.getElementById('stat-host').innerText = `${state.hosts.filter(h => h.status === 'nominal').length}/90`;
}

function setupEvents() {
    document.getElementById('global-search').addEventListener('input', (e) => {
        state.filter = e.target.value.toLowerCase();
        updateLogic();
    });
}

function showDetails(pool) {
    const overlay = document.getElementById('details-overlay');
    const title = document.getElementById('detail-title');
    const legs = document.getElementById('detail-legs');
    
    title.innerText = pool.id;
    legs.innerHTML = pool.hostRefs.map(hId => {
        const host = state.hosts.find(h => h.id === hId);
        return `<div class="leg-row"><span>${hId}</span><span style="color:${host.status === 'nominal' ? 'var(--state-ok)' : 'var(--state-fail)'}">${host.status.toUpperCase()}</span></div>`;
    }).join('');
    
    overlay.classList.remove('hidden');
}

function closeDetails() {
    document.getElementById('details-overlay').classList.add('hidden');
}

init();
