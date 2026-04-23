// --- Core System State ---
const VENDORS = ["MATLAB", "ANSYS", "AUTOCAD", "CATIA", "SIEMENS", "FLEX", "RLM", "SOLIDWORKS"];
const state = {
    hosts: [],
    pools: [],
    filter: "",
    denials: 0
};

// --- Initial Setup ---
function init() {
    // 1. Generate Infrastructure (90 Servers)
    for (let i = 1; i <= 90; i++) {
        state.hosts.push({
            id: `SRV-${String(i).padStart(3, '0')}`,
            status: 'nominal', // nominal, warning, error
            latency: 2
        });
    }

    // 2. Generate Logical Pools (400)
    for (let i = 0; i < 400; i++) {
        const vendor = VENDORS[Math.floor(Math.random() * VENDORS.length)];
        const isTriad = Math.random() > 0.15; // 85% Triads
        const assignedHosts = [];
        const count = isTriad ? 3 : 1;

        for (let j = 0; j < count; j++) {
            assignedHosts.push(state.hosts[Math.floor(Math.random() * 90)].id);
        }

        state.pools.push({
            id: `${vendor}-${2000 + i}`,
            vendor: vendor,
            isTriad: isTriad,
            hostRefs: assignedHosts,
            status: 'nominal'
        });
    }

    initialRender();
    setupEvents();
    
    // Begin Telemetry Cycle
    setInterval(telemetryTick, 3000);
    updateSystemStates(); // Run once immediately
}

function initialRender() {
    const hostStack = document.getElementById('host-stack');
    const hexGrid = document.getElementById('hex-grid');

    // Permanent DOM Nodes for Hosts
    state.hosts.forEach(h => {
        const div = document.createElement('div');
        div.className = 'host-node nominal';
        div.id = `node-${h.id}`;
        div.innerHTML = `<span class="h-id">${h.id}</span><span class="lat">${h.latency}ms</span>`;
        hostStack.appendChild(div);
    });

    // Permanent DOM Nodes for Pools
    state.pools.forEach(p => {
        const hex = document.createElement('div');
        hex.className = `hex nominal`;
        hex.id = `hex-${p.id}`;
        hex.dataset.search = `${p.id} ${p.vendor}`.toLowerCase();
        hex.innerHTML = `<span>${p.vendor.substring(0,3)}</span>`;
        hex.onclick = () => showDetails(p);
        hexGrid.appendChild(hex);
    });
}

// --- Logic Loop ---
function telemetryTick() {
    // Randomly inject faults into infrastructure
    if (Math.random() > 0.6) {
        const target = state.hosts[Math.floor(Math.random() * 90)];
        const dice = Math.random();
        
        if (dice > 0.8) {
            target.status = 'error';
            target.latency = 999;
            state.denials += Math.floor(Math.random() * 5);
        } else {
            target.status = 'warning';
            target.latency = 45;
        }

        // Auto-resolution simulation
        setTimeout(() => {
            target.status = 'nominal';
            target.latency = 2;
            updateSystemStates();
        }, 7000);
    }
    updateSystemStates();
}

function updateSystemStates() {
    let downCount = 0;
    let riskCount = 0;

    // Update Pool Health
    state.pools.forEach(p => {
        const healthyLegs = p.hostRefs.filter(hId => {
            return state.hosts.find(h => h.id === hId).status === 'nominal';
        }).length;

        const el = document.getElementById(`hex-${p.id}`);
        
        if (p.isTriad) {
            if (healthyLegs === 3) el.className = 'hex nominal';
            else if (healthyLegs === 2) { el.className = 'hex degraded'; riskCount++; }
            else { el.className = 'hex critical'; downCount++; }
        } else {
            if (healthyLegs === 1) el.className = 'hex nominal';
            else { el.className = 'hex critical'; downCount++; }
        }

        // Maintain Search Filter Visibility
        const isMatch = el.dataset.search.includes(state.filter);
        el.style.display = isMatch ? 'flex' : 'none';
    });

    // Update Host Node visuals and priority sorting
    state.hosts.forEach(h => {
        const el = document.getElementById(`node-${h.id}`);
        el.className = `host-node ${h.status}`;
        el.querySelector('.lat').innerText = h.status === 'error' ? 'TIMEOUT' : `${h.latency}ms`;
    });

    // Refresh Global KPIs
    document.getElementById('stat-avail').innerText = `${(((400 - downCount) / 400) * 100).toFixed(2)}%`;
    document.getElementById('stat-risk').innerText = riskCount;
    document.getElementById('stat-host').innerText = `${state.hosts.filter(h => h.status === 'nominal').length}/90`;
    document.getElementById('denial-val').innerText = state.denials;
}

// --- Interactions ---
function setupEvents() {
    const search = document.getElementById('global-search');
    search.addEventListener('input', (e) => {
        state.filter = e.target.value.toLowerCase();
        updateSystemStates();
    });

    // Close overlay on Escape key
    window.addEventListener('keydown', (e) => {
        if (e.key === "Escape") closeDetails();
    });
}

function showDetails(pool) {
    const overlay = document.getElementById('details-overlay');
    document.getElementById('detail-title').innerText = pool.id;
    document.getElementById('detail-vendor').innerText = pool.vendor;
    document.getElementById('detail-type').innerText = pool.isTriad ? "QUORUM TRIAD" : "SINGLE HOST";
    
    const legContainer = document.getElementById('detail-legs');
    legContainer.innerHTML = pool.hostRefs.map(hId => {
        const h = state.hosts.find(host => host.id === hId);
        const statusColor = h.status === 'nominal' ? 'var(--state-ok)' : 'var(--state-fail)';
        return `
            <div class="leg-row">
                <span>${hId}</span>
                <span style="color:${statusColor}">${h.status.toUpperCase()}</span>
            </div>
        `;
    }).join('');
    
    overlay.classList.remove('hidden');
}

function closeDetails() {
    document.getElementById('details-overlay').classList.add('hidden');
}

// Initial Boot
window.onload = init;
