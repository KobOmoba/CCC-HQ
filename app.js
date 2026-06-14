let hqState = {
    supabaseUrl: "https://your-project.supabase.co", // Replace with your master Supabase URL
    supabaseKey: "your-anon-public-key", // Replace with your master Supabase key
    parishes: [],
    clergies: []
};
let supa = null;

window.onload = function() {
    const saved = localStorage.getItem("ccc_hq_app_state");
    if (saved) {
        hqState = JSON.parse(saved);
    }
    initSupa();
};

function initSupa() {
    if (hqState.supabaseUrl && hqState.supabaseKey && window.supabase) {
        supa = window.supabase.createClient(hqState.supabaseUrl, hqState.supabaseKey);
        loadHQGatekeeper();
    }
}

// Interwoven validation step (Verifies with database if Super Admin has approved HQ access)
async function loadHQGatekeeper() {
    if (!supa) return;
    const { data, error } = await supa.from('hq_config').select('status').eq('id', '00000000-0000-0000-0000-000000000000');
    if (data && data[0]) {
        if (data[0].status !== 'Approved') {
            alert("HQ Access suspended by Super Admin.");
            logout();
        } else {
            loadHQData();
        }
    }
}

async function attemptLogin() {
    const pass = document.getElementById("hqPasscode").value.trim();
    if (pass.toLowerCase() === 'pastor') {
        document.getElementById("loginGate").classList.add("hidden");
        document.getElementById("mainDashboard").classList.remove("hidden");
    } else {
        alert("Access Denied: Invalid Master Password.");
    }
}

async function loadHQData() {
    if (!supa) return;
    
    // Retrieve registered parishes
    const { data: parishes } = await supa.from('parishes').select('*');
    if (parishes) {
        hqState.parishes = parishes;
        const tbody = document.getElementById("parishHQTable");
        const selectParish = document.getElementById("deployParish");
        tbody.innerHTML = "";
        selectParish.innerHTML = "";

        parishes.forEach(p => {
            tbody.innerHTML += `
                <tr class="hover:bg-slate-900/40">
                    <td class="p-3 font-bold text-white">${p.name}</td>
                    <td class="p-3 font-mono text-gray-400 text-[11px]">${p.id}</td>
                    <td class="p-3 font-semibold ${p.status === 'Approved' ? 'text-emerald-400' : 'text-rose-500'}">${p.status}</td>
                </tr>
            `;
            if (p.status === 'Approved') {
                selectParish.innerHTML += `<option value="${p.id}">${p.name}</option>`;
            }
        });
    }

    // Retrieve global clergy across all partitioned parishes
    const { data: clergies } = await supa.from('members').select('*').eq('classification', 'CLERGY');
    if (clergies) {
        hqState.clergies = clergies;
        const selectClergy = document.getElementById("deployClergy");
        selectClergy.innerHTML = "";
        clergies.forEach(c => {
            const curParish = hqState.parishes.find(p => p.id === c.parish_id);
            const parishName = curParish ? curParish.name : "Unknown Parish";
            selectClergy.innerHTML += `<option value="${c.id}">${c.name} (${c.rank}) [Current: ${parishName}]</option>`;
        });
    }
}

async function executeTransfer() {
    if (!supa) return;
    const clergyId = document.getElementById("deployClergy").value;
    const targetParishId = document.getElementById("deployParish").value;

    if (!clergyId || !targetParishId) return alert("Select deploy parameters.");

    if (confirm("Deploy Relocation decree?")) {
        const { error } = await supa.from('members').update({ parish_id: targetParishId }).eq('id', clergyId);
        if (!error) {
            alert("Shepherd deployment verified.");
            loadHQData();
        } else {
            alert("Transfer failed.");
        }
    }
}

async function publishCircular() {
    if (!supa) return;
    const bodyText = document.getElementById("bulletinBody").value.trim();
    if (!bodyText) return alert("Write text first.");

    const { error } = await supa.from('circulars').insert([{ body: bodyText }]);
    if (!error) {
        alert("circular broadcast saved.");
        document.getElementById("bulletinBody").value = "";
    } else {
        alert("Publication failed.");
    }
}

function switchTab(tabId) {
    document.querySelectorAll('main > section').forEach(sec => sec.classList.add('hidden'));
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');
}

function logout() {
    location.reload();
}
