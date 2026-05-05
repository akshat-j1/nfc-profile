// app-store.js
// Handles Cart, Products, and 3D effects

const PRODUCTS = {
    'matte-black': { name: 'Matte Black Card', price: 299 },
    'gradient-tech': { name: 'Gradient Tech Card', price: 399 },
    'frosted-glass': { name: 'Frosted Glass Card', price: 499 },
    'creator': { name: 'Creator Card', price: 599 }
};

// --- CART LOGIC ---
function getCart() {
    const cart = localStorage.getItem('nfc_cart');
    return cart ? JSON.parse(cart) : [];
}

function saveCart(cart) {
    localStorage.setItem('nfc_cart', JSON.stringify(cart));
}

function addToCart(item) {
    const cart = getCart();
    item.id = Date.now().toString();
    cart.push(item);
    saveCart(cart);
    updateCartCount();
}

function removeFromCart(id) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== id);
    saveCart(cart);
    renderCart();
    updateCartCount();
}

function getCartTotal() {
    const cart = getCart();
    return cart.reduce((sum, item) => sum + item.price, 0);
}

function updateCartCount() {
    const cart = getCart();
    const countElements = document.querySelectorAll('.cart-count');
    countElements.forEach(el => {
        el.textContent = cart.length;
        el.style.display = cart.length > 0 ? 'inline-block' : 'none';
    });
}

// --- 3D TILT EFFECT ---
function initTiltEffect() {
    const cards = document.querySelectorAll('.tilt-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = ((y - centerY) / centerY) * -15; // Max 15deg
            const rotateY = ((x - centerX) / centerX) * 15;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
        });
    });
}

// --- PAGE SPECIFIC INITIALIZERS ---
function initCustomizePage() {
    const params = new URLSearchParams(window.location.search);
    const productKey = params.get('product');
    
    // VALIDATION: Redirect if no product in URL
    if (!productKey || !PRODUCTS[productKey]) {
        window.location.href = '/products.html';
        return;
    }
    
    const product = PRODUCTS[productKey];
    
    document.getElementById('product-name').textContent = product.name;
    document.getElementById('product-price').textContent = `₹${product.price}`;
    
    const previewName = document.getElementById('preview-name');
    const inputName = document.getElementById('input-name');
    const inputPhone = document.getElementById('input-phone');
    const inputLinkedin = document.getElementById('input-linkedin');
    const themeSelect = document.getElementById('input-theme');
    const previewCard = document.getElementById('preview-card');
    
    inputName.addEventListener('input', (e) => {
        previewName.textContent = e.target.value || 'Your Name';
    });
    
    themeSelect.addEventListener('change', (e) => {
        const theme = e.target.value;
        previewCard.className = 'w-full aspect-[1.58/1] rounded-2xl p-6 flex flex-col justify-between shadow-2xl transition-all duration-300 tilt-card text-white border border-white/10';
        
        if (theme === 'dark') previewCard.classList.add('bg-zinc-900');
        if (theme === 'light') previewCard.classList.add('bg-zinc-100', '!text-zinc-900');
        if (theme === 'gradient') previewCard.classList.add('bg-gradient-to-br', 'from-indigo-900', 'via-purple-900', 'to-blue-900');
        if (theme === 'glass') previewCard.classList.add('bg-white/10', 'backdrop-blur-md');
    });
    
    document.getElementById('add-to-cart-btn').addEventListener('click', () => {
        if (!inputName.value) {
            alert('Please enter your name');
            return;
        }
        
        addToCart({
            product: productKey,
            productName: product.name,
            name: inputName.value,
            phone: inputPhone.value,
            linkedin: inputLinkedin.value,
            theme: themeSelect.value,
            price: product.price
        });
        
        window.location.href = '/cart.html';
    });
    
    // Trigger initial theme
    themeSelect.dispatchEvent(new Event('change'));
    initTiltEffect();
}

function renderCart() {
    const cartContainer = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    if (!cartContainer || !totalEl) return;
    
    const cart = getCart();
    cartContainer.innerHTML = '';
    
    if (cart.length === 0) {
        cartContainer.innerHTML = '<p class="text-zinc-500 text-center py-8">Your cart is empty.</p>';
        totalEl.textContent = '₹0';
        document.getElementById('checkout-btn').style.display = 'none';
        return;
    }
    
    document.getElementById('checkout-btn').style.display = 'block';
    
    cart.forEach(item => {
        const div = document.createElement('div');
        div.className = 'bg-surface-container-high rounded-xl p-4 flex justify-between items-center border border-white/5 mb-4';
        div.innerHTML = `
            <div>
                <h4 class="font-bold text-white">${item.productName}</h4>
                <p class="text-sm text-zinc-400">Printed Name: ${item.name}</p>
                <p class="text-sm text-zinc-500 capitalize">Theme: ${item.theme}</p>
            </div>
            <div class="flex items-center gap-4">
                <span class="font-bold text-lg text-white">₹${item.price}</span>
                <button onclick="removeFromCart('${item.id}')" class="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-colors">
                    <span class="material-symbols-outlined text-sm">delete</span>
                </button>
            </div>
        `;
        cartContainer.appendChild(div);
    });
    
    totalEl.textContent = `₹${getCartTotal()}`;
}

function initCheckout() {
    const cart = getCart();
    if (cart.length === 0) {
        window.location.href = '/products.html';
        return;
    }
    
    document.getElementById('checkout-total').textContent = `₹${getCartTotal()}`;
    
    document.getElementById('place-order-btn').addEventListener('click', () => {
        const orderId = 'ORD-' + Math.random().toString(36).substring(2, 10).toUpperCase();
        localStorage.setItem('last_order', JSON.stringify({ id: orderId, total: getCartTotal(), items: cart }));
        localStorage.removeItem('nfc_cart');
        window.location.href = '/success.html';
    });
}

function initSuccess() {
    const orderData = localStorage.getItem('last_order');
    if (!orderData) {
        window.location.href = '/';
        return;
    }
    const order = JSON.parse(orderData);
    document.getElementById('order-id').textContent = order.id;
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    initTiltEffect();
    
    const path = window.location.pathname;
    if (path.includes('customize.html')) initCustomizePage();
    if (path.includes('cart.html')) renderCart();
    if (path.includes('checkout.html')) initCheckout();
    if (path.includes('success.html')) initSuccess();
});
