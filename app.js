// WORLDWIDE HQ PORTAL CONSOLE ENGINE
const SUPABASE_URL = "YOUR_SUPABASE_URL"; // <-- REPLACE WITH YOUR LIVE URL
const SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY"; // <-- REPLACE WITH YOUR LIVE ANON KEY

let hqState = {
    parishes: [],
    clergies: []
};
let supaClient = null;

window.onload = function() {
    initSupa();
};

function initSupa() {
    if (SUPABASE_URL !== "YOUR_SUPABASE_URL" && window.supabase) {
        try {
            supaClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        } catch (e) {
            console.error("Initialization of database client failed: ", e);
        }
    } else {
        console.warn("Please configure your live Supabase credentials inside app.js");
    }
}

async function attemptLogin() {
    const pass = document.getElementById("hqPasscode").value.trim();
    if (pass.toLowerCase() === 'pastor') { // Worldwide HQ passcode bypass
        if (!supaClient) {
            alert("Connection error: Ensure you have edited app.js with your actual Supabase URL and Key.");
            return;
        }

        // Interwoven Access Check (Verifies if Super Admin has authorized HQ Portal Access)
        const { data, error } = await supaClient.from('hq_config').select('status').eq('id', '00000000-0000-0000-0000-000000000000');
        if (error) {
            alert(`Database verify error: ${error.message}\nEnsure your RLS policies and table grants are fully active.`);
            return;
        }

        if (data && data[0] && data[0].status !== 'Approved') {
            alert("Access Denied: This Worldwide HQ Command Portal has been suspended by the platform Super Admin.");
            return;
        }

        document.getElementById("loginGate").classList.add("hidden");
        document.getElementById("mainDashboard").classList.remove("hidden");
        loadHQData();
    } else {
        alert("Access Denied: Invalid Master Password.");
    }
}

async function loadHQData() {
    if (!supaClient) return;

    // Retrieve active parishes
    const { data: parishes, error: pErr } = await supaClient.from('parishes').select('*');
    const tbody = document.getElementById("parishHQTable");
    const selectParish = document.getElementById("deployParish");
    
    tbody.innerHTML = "";
    selectParish.innerHTML = "";

    if (pErr) {
        tbody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-rose-400">Failed to sync: ${pErr.message}</td></tr>`;
        return;
    }

    if (parishes && parishes.length > 0) {
        hqState.parishes = parishes;
        parishes.forEach(p => {
            tbody.innerHTML += `
                <tr class="hover:bg-slate-900/40 border-b border-slate-800/40">
                    <td class="p-3 font-bold text-white">${p.name}</td>
                    <td class="p-3 font-mono text-gray-400 text-[11px]">${p.id}</td>
                    <td class="p-3 font-semibold ${p.status === 'Approved' ? 'text-emerald-400' : 'text-rose-500'}">${p.status}</td>
                </tr>
            `;
            if (p.status === 'Approved') {
                selectParish.innerHTML += `<option value="${p.id}">${p.name}</option>`;
            }
        });
    } else {
        tbody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-slate-400">No registered parishes found.</td></tr>`;
    }

    // Retrieve global clergy across all partitioned tables
    const { data: clergies } = await supaClient.from('members').select('*').eq('classification', 'CLERGY');
    const selectClergy = document.getElementById("deployClergy");
    selectClergy.innerHTML = "";

    if (clergies && clergies.length > 0) {
        hqState.clergies = clergies;
        clergies.forEach(c => {
            const curParish = hqState.parishes.find(p => p.id === c.parish_id);
            const parishName = curParish ? curParish.name : "Unassigned";
            selectClergy.innerHTML += `<option value="${c.id}">${c.name} (${c.rank}) [Current: ${parishName}]</option>`;
        });
    } else {
        selectClergy.innerHTML = `<option value="">No clergy profiles registered globally</option>`;
    }
}

async function executeTransfer() {
    if (!supaClient) return;
    const clergyId = document.getElementById("deployClergy").value;
    const targetParishId = document.getElementById("deployParish").value;

    if (!clergyId || !targetParishId) {
        alert("Please select both a clergyman and a target parish destination.");
        return;
    }

    if (confirm("Publish worldwide transfer deployment decree?")) {
        const { error } = await supaClient.from('members').update({ parish_id: targetParishId }).eq('id', clergyId);
        if (!error) {
            alert("The liturgical transfer deployment decree has been successfully updated.");
            loadHQData();
        } else {
            alert(`Transfer query execution failed: ${error.message}`);
        }
    }
}

async function publishCircular() {
    if (!supaClient) return;
    const bodyText = document.getElementById("bulletinBody").value.trim();
    if (!bodyText) return alert("Write text first.");

    const { error } = await supaClient.from('circulars').insert([{ body: bodyText }]);
    if (!error) {
        alert("Circular bulletin successfully published to all active parish dashboards.");
        document.getElementById("bulletinBody").value = "";
    } else {
        alert(`Failed to publish: ${error.message}`);
    }
}

function switchTab(tabId) {
    document.querySelectorAll('main > section').forEach(sec => sec.classList.add('hidden'));
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('bg-slate-800'));
    document.getElementById(`btn-${tabId}`).classList.add('bg-slate-800');
}

function logout() {
    location.reload();
}
