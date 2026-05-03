// script.js
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
// Supports both path /u/user1 and query param ?u=user1 for local testing
function getUserIdFromURL() {
    const path = window.location.pathname;
    const pathParts = path.split('/');
    
    // Check for /u/{userid} format
    const uIndex = pathParts.indexOf('u');
    if (uIndex !== -1 && pathParts.length > uIndex + 1) {
        return pathParts[uIndex + 1];
    }
    
    // Fallback for query param ?user=user1 (used in edit page mostly, or local testing)
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('user') || urlParams.get('u');
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
    const userId = getUserIdFromURL();
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

async function initEditPage() {
    const userId = getUserIdFromURL();
    if (!userId) {
        alert("No user specified to edit. Use ?user=user1 in URL.");
        return;
    }

    const user = await getUser(userId);
    if (!user) {
        alert("User not found!");
        return;
    }

    // Populate form
    document.getElementById('edit-userId').textContent = userId;
    document.getElementById('input-name').value = user.name || '';
    document.getElementById('input-phone').value = user.phone || '';
    document.getElementById('input-linkedin').value = user.linkedin || '';
    document.getElementById('select-action').value = user.mainAction || 'profile';

    // Handle save
    document.getElementById('edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newData = {
            name: document.getElementById('input-name').value,
            phone: document.getElementById('input-phone').value,
            linkedin: document.getElementById('input-linkedin').value,
            mainAction: document.getElementById('select-action').value
        };

        const success = await updateUser(userId, newData);
        if (success) {
            alert('Profile updated successfully!');
            // Optional: redirect to profile
            // window.location.href = `index.html?u=${userId}`;
        } else {
            alert('Error updating profile.');
        }
    });
}
