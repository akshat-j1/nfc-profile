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
    console.log("Fetching userId:", userId);

    const { data, error } = await supabaseClient
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

    console.log("Supabase response:", data, error);

    if (error) throw error;
    if (!data) throw new Error("User not found");

    return data;
}

async function updateSupabaseUser(userId, updatedData) {
    const { data, error } = await supabaseClient
        .from("users")
        .update(updatedData)
        .eq("id", userId);

    if (error) {
        console.error("Update failed:", error);
        alert("Failed to update profile");
        return;
    }

    alert("Profile updated successfully");
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
        loadingEl.style.display = 'none';
        
        const landingEl = document.getElementById('landing-page');
        if (landingEl) {
            landingEl.style.display = 'block';
        } else {
            errorEl.textContent = 'Invalid link. No user ID provided.';
            errorEl.style.display = 'block';
        }
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

    document.getElementById('edit-userId').textContent = userId;

    const authBox = document.getElementById('auth-box');
    const editForm = document.getElementById('edit-form');
    const passwordInput = document.getElementById('passwordInput');
    const unlockBtn = document.getElementById('unlockBtn');
    const authError = document.getElementById('authError');
    const header = document.querySelector('.edit-header');

    const hintEl = document.getElementById('password-hint');
    if (hintEl) {
        if (userId === "demo") {
            hintEl.innerHTML = 'Demo password: <strong>1234</strong>';
        } else {
            hintEl.textContent = "Enter your edit access password";
        }
    }

    const accessKey = "editAccess_" + userId;

    // Helper to setup the form once user is authenticated
    const setupFormForUser = (user) => {
        authBox.style.display = 'none';
        editForm.style.display = 'block';

        console.log("Populating edit form for user:", user);

        // POPULATE form fields
        document.getElementById('name').value = user.name || '';
        document.getElementById('phone').value = user.phone || '';
        document.getElementById('linkedin').value = user.linkedin || '';
        document.getElementById('mainAction').value = user.mainAction || 'profile';

        if (userId === "demo") {
            document.querySelectorAll("#edit-form input, #edit-form select").forEach(el => {
                el.disabled = true;
                el.style.cursor = "not-allowed";
                el.style.opacity = "0.7";
            });

            const saveBtn = document.querySelector("#edit-form button[type='submit']");
            if (saveBtn) saveBtn.disabled = true;

            const warning = document.createElement("p");
            warning.innerText = "Demo profile cannot be edited";
            warning.style.color = "red";
            warning.style.textAlign = "center";
            warning.style.marginTop = "10px";

            const header = document.querySelector('.edit-header');
            if (header) header.appendChild(warning);
        }

        // UPDATE save logic
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('name').value;
            const phone = document.getElementById('phone').value;
            const linkedin = document.getElementById('linkedin').value;
            const mainAction = document.getElementById('mainAction').value;

            const submitBtn = editForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = 'Saving...';
                submitBtn.disabled = true;
                
                await updateSupabaseUser(userId, {
                    name,
                    phone,
                    linkedin,
                    mainAction
                });

                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            } else {
                await updateSupabaseUser(userId, {
                    name,
                    phone,
                    linkedin,
                    mainAction
                });
            }
        });
    };

    // 3. SESSION CHECK
    if (sessionStorage.getItem(accessKey) === "true") {
        try {
            const user = await getSupabaseUser(userId);
            if (!user) {
                alert("User not found");
                return;
            }
            setupFormForUser(user);
        } catch (err) {
            console.error("Error fetching user:", err);
            alert("Database error fetching profile.");
        }
        return;
    }

    // 4. PASSWORD FLOW
    unlockBtn.addEventListener('click', async () => {
        const currentUserId = getUserId();
        const enteredPassword = passwordInput.value.trim();
        console.log("Entered:", enteredPassword);
        
        if (!enteredPassword) {
            authError.textContent = "Please enter a password";
            authError.style.display = 'block';
            return;
        }

        const originalText = unlockBtn.innerHTML;
        unlockBtn.innerHTML = 'Verifying...';
        unlockBtn.disabled = true;
        authError.style.display = 'none';

        if (currentUserId === "demo") {
            if (enteredPassword !== "1234") {
                authError.textContent = "Incorrect password";
                authError.style.display = 'block';
                unlockBtn.innerHTML = originalText;
                unlockBtn.disabled = false;
                return;
            }

            try {
                const user = await getSupabaseUser(currentUserId);
                if (!user) {
                    authError.textContent = "Failed to load demo";
                    authError.style.display = 'block';
                    unlockBtn.innerHTML = originalText;
                    unlockBtn.disabled = false;
                    return;
                }
                
                sessionStorage.setItem(accessKey, "true");
                setupFormForUser(user);
            } catch (err) {
                console.error("Error fetching demo user:", err);
                authError.textContent = "Failed to load demo";
                authError.style.display = 'block';
                unlockBtn.innerHTML = originalText;
                unlockBtn.disabled = false;
            }
            return;
        }

        // Normal user logic
        try {
            const user = await getSupabaseUser(currentUserId);
            if (!user) {
                authError.textContent = "User not found";
                authError.style.display = 'block';
                unlockBtn.innerHTML = originalText;
                unlockBtn.disabled = false;
                return;
            }

            if (user.password !== enteredPassword) {
                authError.textContent = "Incorrect password";
                authError.style.display = 'block';
                unlockBtn.innerHTML = originalText;
                unlockBtn.disabled = false;
                return;
            }

            // Password correct!
            sessionStorage.setItem(accessKey, "true");
            setupFormForUser(user);

        } catch (err) {
            console.error("Error fetching user for auth:", err);
            authError.textContent = "Error fetching user";
            authError.style.display = 'block';
            unlockBtn.innerHTML = originalText;
            unlockBtn.disabled = false;
        }
    });
}

// Make functions globally accessible
window.initProfilePage = initProfilePage;
window.initEditPage = initEditPage;
