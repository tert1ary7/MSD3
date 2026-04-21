// --- System Constraints ---
const HOST_COUNT = 90;
const POOL_COUNT = 400;
const VENDORS = ["MATLAB", "ANSYS", "AUTOCAD", "SOLIDWORKS", "CATIA", "SIEMENS", "FLEXLM", "RLM"];

const state = {
    hosts: [],
    pools: [],
    denials: 0
};

// --- Initialization ---
function init() {
    // Generate 90 Hosts
    for (let i = 1; i <= HOST_COUNT; i++) {
        state.hosts.push({
            id: `SRV-${String(i).padStart(3, '0')}`,
            status: 'nominal', // nominal, warning, error
            latency: Math.floor(Math.random() * 5) + 1
        });
    }

    // Generate 400 Pools with Dependency Mapping
    for (let i = 0; i < POOL_COUNT; i++) {
        const vendor = VENDORS[Math.floor(Math.random() * VENDORS.length)];
        const isTriad = Math.random() > 0.3;
        const poolHosts = [];
        
        // Assign 1 or 3 random hosts
        const count = isTriad ? 3 : 1;
        for (let j = 0; j < count; j++) {
            poolHosts.push(state.hosts[Math.floor(Math.random() * HOST_COUNT)].id);
        }

        state.pools.push({
            id: `${vendor}-${i}`,
            vendor: vendor,
            isTriad: isTriad,
            hostRefs: poolHosts,
            status: 'nominal'
        });
    }

    render();
    setupEvents();
    setInterval(tick, 2000); // System heartbeat
}

// --- Logic: Quorum Calculation ---
function updatePoolStates() {
    state.pools.forEach(pool => {
        const activeHosts = pool.hostRefs.filter(hId => {
            const h = state.hosts.find(host => host.id === hId);
            return h.status === 'nominal';
        }).length;

        if (pool.isTriad) {
            if (activeHosts === 3) pool.status = 'nominal';
            else if (activeHosts === 2) pool.status = 'degraded';
            else pool.status = 'critical';
        } else {
            pool.status = activeHosts === 1 ? 'nominal' : 'critical';
        }
    });
}

// --- View: Rendering ---
function render() {
    updatePoolStates();
    const hostStack = document.getElementById('host-stack');
    const hexGrid = document.getElementById('hex-grid');
    
    hostStack.innerHTML = '';
    hexGrid.innerHTML = '';

    // Render Hosts (Infrastructure)
    state.hosts.forEach(h => {
        const el = document.createElement('div');
        el.className = `host-node ${h.status === 'error' ? 'error' : ''} ${h.status === 'warning' ? 'latency' : ''}`;
        el.id = h.id;
        el.innerHTML = `<span>${h.id}</span><span>${h.latency}ms</span>`;
        el.onmouseenter = () => traceHost(h.id);
        el.onmouseleave = clearTrace;
        hostStack.appendChild(el);
    });

    // Render Hexes (Services)
    state.pools.forEach(p => {
        const el = document.createElement('div');
        el.className = `hex ${p.status}`;
        el.id = p.id;
        el.dataset.search = `${p.id} ${p.vendor}`.toLowerCase();
        el.innerHTML = `<span>${p.vendor.substring(0, 3)}</span><span>${p.id.split('-')[1]}</span>`;
        el.onmouseenter = () => tracePool(p);
        el.onmouseleave = clearTrace;
        hexGrid.appendChild(el);
    });
}

// --- Trace Interactions ---
function traceHost(hostId) {
    const affectedPools = state.pools.filter(p => p.hostRefs.includes(hostId));
    document.querySelectorAll('.hex').forEach(el => el.classList.add('dimmed'));
    affectedPools.forEach(p => document.getElementById(p.id).classList.remove('dimmed'));
}

function tracePool(pool) {
    document.querySelectorAll('.host-node').forEach(el => el.classList.add('dimmed'));
    pool.hostRefs.forEach(hId => {
        const el = document.getElementById(hId);
        el.classList.remove('dimmed');
        el.classList.add('active-trace');
    });
}

function clearTrace() {
    document.querySelectorAll('.dimmed, .active-trace').forEach(el => {
        el.classList.remove('dimmed', 'active-trace');
    });
}

// --- Search Filter ---
function setupEvents() {
    document.getElementById('global-search').addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        document.querySelectorAll('.hex').forEach(el => {
            el.style.display = el.dataset.search.includes(val) ? 'flex' : 'none';
        });
    });
}

// --- Heartbeat: Simulating Entropy ---
function tick() {
    // Randomly break a host
    if (Math.random() > 0.7) {
        const h = state.hosts[Math.floor(Math.random() * HOST_COUNT)];
        h.status = Math.random() > 0.5 ? 'error' : 'warning';
        h.latency = h.status === 'error' ? 999 : Math.floor(Math.random() * 50) + 10;
        
        // Auto-heal after some time
        setTimeout(() => {
            h.status = 'nominal';
            h.latency = Math.floor(Math.random() * 5) + 1;
            render();
        }, 8000);
    }
    render();
}

init();
