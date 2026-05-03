// script.js
const SUPABASE_URL = "https://vdfjrltecvvpklybuehq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mPXtNX0OXITxkY1v_OCq2g_Hs3lijxt";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

// --- CORE UTILS ---

// Extract userId from URL
function getUserId() {
    const path = window.location.pathname;
    let id = null;

    // Handle clean URL: /u/user1
    if (path.startsWith('/u/')) {
        id = path.split('/u/')[1];
        if (id) id = id.replace(/\/$/, ""); // Remove trailing slash if any
    }

    if (!id) {
        const params = new URLSearchParams(window.location.search);
        id = params.get('u') || params.get('user');
    }

    // Return decoded and trimmed ID to prevent whitespace/encoding mismatches
    return id ? decodeURIComponent(id).trim() : null;
}

// Generate and download VCF
function downloadVCF(user) {
    const vcfData = `BEGIN:VCARD
VERSION:3.0
FN:${user.name || ''}
TEL;TYPE=CELL:${user.phone || ''}
URL:${user.linkedin || ''}
END:VCARD`;

    const blob = new Blob([vcfData], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(user.name || 'contact').replace(/\s+/g, '_')}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// --- SUPABASE API ---

async function getSupabaseUser(userId) {
    console.log("Fetching ALL users from Supabase");
    
    const { data, error } = await supabaseClient
        .from("users")
        .select("*");

    console.log("Response:", data, error);
    
    if (data && data.length > 0) {
        console.log("First user:", data[0]);
    }

    if (error) {
        console.error("Supabase Error:", error);
        throw error;
    }

    if (!data || data.length === 0) {
        throw new Error("User not found");
    }

    return data[0];
}

async function updateSupabaseUser(userId, data) {
    console.log("Updating user in Supabase:", userId, data);
    const { error } = await supabaseClient
        .from('users')
        .update(data)
        .eq('id', userId);

    if (error) {
        console.error("Supabase Update Error:", error);
        throw error;
    }
    return true;
}

// --- PAGE CONTROLLERS ---

function handleUser(user) {
    console.log("Handling user action:", user.mainAction);
    
    if (user.mainAction === 'linkedin' && user.linkedin) {
        console.log("Redirecting to LinkedIn:", user.linkedin);
        window.location.href = user.linkedin;
        return;
    }

    if (user.mainAction === 'phone' && user.phone) {
        console.log("Redirecting to Phone Dialer:", user.phone);
        window.location.href = `tel:${user.phone}`;
        return;
    }

    console.log("Showing Profile UI");
    // Otherwise show profile
    document.getElementById('display-name').textContent = user.name || '';

    // Setup action buttons
    const callBtn = document.getElementById('btn-call');
    const linkedinBtn = document.getElementById('btn-linkedin');
    const saveBtn = document.getElementById('btn-save');

    if (user.phone) {
        callBtn.href = `tel:${user.phone}`;
        callBtn.style.display = 'inline-flex';
    } else {
        callBtn.style.display = 'none';
    }

    if (user.linkedin) {
        linkedinBtn.href = user.linkedin;
        linkedinBtn.style.display = 'inline-flex';
    } else {
        linkedinBtn.style.display = 'none';
    }

    // Ensure we don't attach multiple event listeners
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    newSaveBtn.addEventListener('click', () => downloadVCF(user));

    // Show UI
    document.getElementById('loading').style.display = 'none';
    document.getElementById('profile-card').style.display = 'flex';
}

async function initProfilePage() {
    const userId = getUserId();
    console.log("initProfilePage - Extracted userId:", userId);
    
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error-message');

    if (!userId) {
        console.warn("Invalid link. No user ID provided.");
        loadingEl.style.display = 'none';
        errorEl.textContent = 'Invalid link. No user ID provided.';
        errorEl.style.display = 'block';
        return;
    }

    try {
        const user = await getSupabaseUser(userId);
        if (!user) {
            loadingEl.style.display = 'none';
            errorEl.textContent = 'User not found.';
            errorEl.style.display = 'block';
            return;
        }
        handleUser(user);
    } catch (err) {
        console.error("Error in initProfilePage:", err);
        loadingEl.style.display = 'none';
        errorEl.textContent = 'User not found.';
        errorEl.style.display = 'block';
    }
}

async function initEditPage() {
    const userId = getUserId();
    console.log("initEditPage - Extracted userId:", userId);

    if (!userId) {
        alert("No user identified to change");
        return;
    }

    try {
        const user = await getSupabaseUser(userId);
        if (!user) {
            alert("User not found");
            return;
        }

        console.log("Populating edit form for user:", user);

        // POPULATE form fields
        document.getElementById('edit-userId').textContent = userId;
        document.getElementById('name').value = user.name || '';
        document.getElementById('phone').value = user.phone || '';
        document.getElementById('linkedin').value = user.linkedin || '';
        document.getElementById('mainAction').value = user.mainAction || 'profile';

        // UPDATE save logic
        document.getElementById('edit-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = 'Saving...';
            submitBtn.disabled = true;

            const newData = {
                name: document.getElementById('name').value,
                phone: document.getElementById('phone').value,
                linkedin: document.getElementById('linkedin').value,
                mainAction: document.getElementById('mainAction').value
            };

            try {
                await updateSupabaseUser(userId, newData);
                alert("Saved successfully!");
                window.location.href = `/u/${userId}`;
            } catch (updateErr) {
                console.error("Error saving profile:", updateErr);
                alert("Failed to save profile. Please try again.");
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    } catch (err) {
        console.error("Error in initEditPage:", err);
        alert("User not found or database error.");
    }
}

// Make functions globally accessible
window.initProfilePage = initProfilePage;
window.initEditPage = initEditPage;
