// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Store user session
let currentUser = null;

// Toast notification
function showToast(message, type='info'){
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  loadUserSession();
  initializeCart();
});

// Load user from localStorage
function loadUserSession() {
  const userData = localStorage.getItem('user');
  if (userData) {
    currentUser = JSON.parse(userData);
  }
}

// Save user to localStorage
function saveUserSession(user) {
  currentUser = user;
  localStorage.setItem('user', JSON.stringify(user));
}

// Logout
function logout() {
  currentUser = null;
  localStorage.removeItem('user');
  localStorage.removeItem('gh_cart');
  showToast('Sesión cerrada', 'info');
  setTimeout(() => location.href = 'index.html', 1500);
}

// Register user
async function registerUser(username, email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      showToast('Error: ' + data.error, 'error');
      return false;
    }
    
    saveUserSession(data.user);
    showToast('¡Cuenta creada correctamente!', 'success');
    setTimeout(() => location.href = 'dashboard.html', 1500);
    return true;
  } catch (error) {
    console.error('Register error:', error);
    showToast('Error en el registro', 'error');
    return false;
  }
}

// Login user
async function loginUser(username, password, wantAdmin=false) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      showToast('Error: ' + data.error, 'error');
      return false;
    }
    
    // Save user session
    saveUserSession({ ...data.user, id: data.user_id });
    showToast('¡Bienvenido ' + data.user.username + '!', 'success');

    // If caller requested admin access but user isn't admin, show error
    if (wantAdmin && !data.user.is_admin) {
      showToast('No tienes permisos de administrador', 'error');
      return false;
    }

    // Redirect admins to admin panel, others to dashboard
    if (data.user.is_admin) {
      setTimeout(() => location.href = 'admin.html', 1200);
    } else {
      setTimeout(() => location.href = 'dashboard.html', 1200);
    }
    return true;
  } catch (error) {
    console.error('Login error:', error);
    showToast('Error en el login', 'error');
    return false;
  }
}

// Add to cart (integrated with cart.js)
async function addToCartDB(productId, title, price, image) {
  if (!currentUser) {
    addToCart(productId, title, price, image);
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/cart/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: currentUser.id,
        product_id: productId,
        quantity: 1
      })
    });
    
    if (!response.ok) {
      throw new Error('Error adding to cart');
    }
    
    showToast('Agregado al carrito', 'success');
    addToCart(productId, title, price, image);
  } catch (error) {
    console.error('Add to cart error:', error);
    addToCart(productId, title, price, image);
  }
}

// Get cart from DB
async function getCartDB() {
  if (!currentUser) return [];
  
  try {
    const response = await fetch(`${API_BASE_URL}/cart/${currentUser.id}`);
    if (!response.ok) throw new Error('Error fetching cart');
    
    return await response.json();
  } catch (error) {
    console.error('Fetch cart error:', error);
    return [];
  }
}

// Checkout
async function checkoutDB(payment_method, payment_info) {
  if (!currentUser) {
    showToast('Debes iniciar sesión para comprar', 'error');
    return false;
  }
  
  try {
    const body = { user_id: currentUser.id, payment_method };
    if (payment_info) body.payment_info = payment_info;

    const response = await fetch(`${API_BASE_URL}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      showToast('Error: ' + data.error, 'error');
      return false;
    }
    
    showToast('¡Pedido realizado! Total: $' + data.total.toFixed(2), 'success');
    localStorage.removeItem('gh_cart');
    renderCount();
    renderPanel();
    return true;
  } catch (error) {
    console.error('Checkout error:', error);
    showToast('Error al procesar el pago', 'error');
    return false;
  }
}

// Initialize cart from localStorage (fallback)
function initializeCart() {
  const savedCart = localStorage.getItem('gh_cart');
  if (savedCart) {
    window.cart = JSON.parse(savedCart);
  }
}

// Get all products from database
async function getProducts() {
  try {
    const response = await fetch(`${API_BASE_URL}/products`);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error fetching products:', data.error);
      return [];
    }
    
    return data.products || [];
  } catch (error) {
    console.error('Error getting products:', error);
    return [];
  }
}

// Render products in dashboard
async function renderDashboardProducts() {
  const storeRow = document.querySelector('.store-row');
  if (!storeRow) return;
  
  const products = await getProducts();
  
  if (products.length === 0) {
    storeRow.innerHTML = '<p class="muted">No hay productos disponibles</p>';
    return;
  }
  
  storeRow.innerHTML = products.map(product => `
    <article class="store-card" data-id="${product.product_id}" data-title="${product.title}" data-price="${product.price}" data-image="${product.image_url}">
      <div class="card-art">
        <img src="${product.image_url}" alt="${product.title}" onerror="this.src='images/placeholder.jpg'">
      </div>
      <h4>${product.title}</h4>
      <p class="muted">${product.category || 'Juego'}</p>
      <div class="card-bottom">
        <div class="price">$${product.price.toFixed(2)}</div>
        <a class="btn small" href="index.html">Ver</a>
      </div>
      <div style="margin-top:8px">
        <button class="btn small add-to-cart" data-id="${product.product_id}" data-title="${product.title}" data-price="${product.price}" data-image="${product.image_url}">Agregar al carrito</button>
      </div>
    </article>
  `).join('');
  
  // Re-attach event listeners for add to cart buttons
  attachAddToCartListeners();
}

// Attach event listeners to add to cart buttons
function attachAddToCartListeners() {
  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const item = {
        id: this.dataset.id,
        title: this.dataset.title,
        price: parseFloat(this.dataset.price),
        image: this.dataset.image
      };
      addItem(item);
    });
  });
}
