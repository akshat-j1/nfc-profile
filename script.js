// script.js
const SUPABASE_URL = "https://vdfjrltecvvpklybuehq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mPXtNX0OXITxkY1v_OCq2g_Hs3lijxt";

// Use 'var' instead of 'const' to prevent global naming collision with the CDN's window.supabase
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Mock Database
const defaultUsers = {
    user1: {
        name: "Rahul",
        phone: "9876543210",
        linkedin: "https://linkedin.com/in/rahul",
        mainAction: "linkedin"
    },
    user2: {
        name: "Amit",
        phone: "9999999999",
        linkedin: "https://linkedin.com/in/amit",
        mainAction: "profile"
    }
};

// --- DATA ACCESS LAYER (Ready for Supabase) ---

// Initialize localStorage if empty
function initDB() {
    if (!localStorage.getItem('nfc_users')) {
        localStorage.setItem('nfc_users', JSON.stringify(defaultUsers));
    }
}

// --- SUPABASE FETCH FUNCTION (NOT USED YET) ---
async function getSupabaseUser(userId) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (error || !data) {
        throw new Error("User not found");
    }

    return data;
}

// Get user by ID
async function getUser(id) {
    // Supabase implementation later:
    // const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    // return data;

    // Local mock implementation:
    initDB();
    const users = JSON.parse(localStorage.getItem('nfc_users'));
    return users[id] || null;
}

// Update user by ID
async function updateUser(id, data) {
    // Supabase implementation later:
    // const { error } = await supabase.from('users').update(data).eq('id', id);

    // Local mock implementation:
    initDB();
    const users = JSON.parse(localStorage.getItem('nfc_users'));
    if (users[id]) {
        users[id] = { ...users[id], ...data };
        localStorage.setItem('nfc_users', JSON.stringify(users));
        return true;
    }
    return false;
}

// --- CORE UTILS ---

// Extract userId from URL
function getUserId() {
    const path = window.location.pathname;

    // Handle clean URL: /u/user1
    if (path.startsWith('/u/')) {
        return path.split('/u/')[1];
    }

    const params = new URLSearchParams(window.location.search);

    // Support both ?u=user1 and ?user=user1
    return params.get('u') || params.get('user');
}

// Generate and download VCF
function downloadVCF(user) {
    const vcfData = `BEGIN:VCARD
VERSION:3.0
FN:${user.name}
TEL;TYPE=CELL:${user.phone}
URL:${user.linkedin}
END:VCARD`;

    const blob = new Blob([vcfData], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${user.name.replace(/\s+/g, '_')}_contact.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// --- PAGE CONTROLLERS ---

async function initProfilePage() {
    const userId = getUserId();
    const loadingEl = document.getElementById('loading');
    const profileEl = document.getElementById('profile-card');
    const errorEl = document.getElementById('error-message');

    if (!userId) {
        loadingEl.style.display = 'none';
        errorEl.textContent = 'Invalid link. No user ID provided.';
        errorEl.style.display = 'block';
        return;
    }

    const user = await getUser(userId);

    if (!user) {
        loadingEl.style.display = 'none';
        errorEl.textContent = 'User not found.';
        errorEl.style.display = 'block';
        return;
    }

    // Handle Main Action Routing
    if (user.mainAction === 'linkedin' && user.linkedin) {
        window.location.href = user.linkedin;
        return;
    }

    if (user.mainAction === 'phone' && user.phone) {
        window.location.href = `tel:${user.phone}`;
        return;
    }

    // Otherwise show profile
    // Show profile (if mainAction is 'profile' or fallback from tel)
    document.getElementById('display-name').textContent = user.name;

    // Setup action buttons
    const callBtn = document.getElementById('btn-call');
    const linkedinBtn = document.getElementById('btn-linkedin');
    const saveBtn = document.getElementById('btn-save');

    if (user.phone) {
        callBtn.href = `tel:${user.phone}`;
    } else {
        callBtn.style.display = 'none';
    }

    if (user.linkedin) {
        linkedinBtn.href = user.linkedin;
    } else {
        linkedinBtn.style.display = 'none';
    }

    saveBtn.addEventListener('click', () => downloadVCF(user));

    // Show UI
    loadingEl.style.display = 'none';
    profileEl.style.display = 'flex';
}

function initEditPage() {
    const userId = getUserId();

    if (!userId) {
        alert("No user identified to change");
        throw new Error("User ID missing");
    }

    // LOAD user from localStorage safely
    const users = JSON.parse(localStorage.getItem('nfc_users')) || {};
    const user = users[userId];

    if (!user) {
        alert("User not found");
        throw new Error("Invalid user");
    }

    // POPULATE form fields
    document.getElementById('edit-userId').textContent = userId;
    document.getElementById('name').value = user.name || '';
    document.getElementById('phone').value = user.phone || '';
    document.getElementById('linkedin').value = user.linkedin || '';
    document.getElementById('mainAction').value = user.mainAction || 'profile';

    // UPDATE save logic
    document.getElementById('edit-form').addEventListener('submit', (e) => {
        e.preventDefault();

        users[userId] = {
            name: document.getElementById('name').value,
            phone: document.getElementById('phone').value,
            linkedin: document.getElementById('linkedin').value,
            mainAction: document.getElementById('mainAction').value
        };

        localStorage.setItem('nfc_users', JSON.stringify(users));

        alert("Saved successfully!");

        // Optional: redirect to test NFC behavior
        window.location.href = `/u/${userId}`;
    });
}
