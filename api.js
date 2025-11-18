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
async function loginUser(username, password) {
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
    
    saveUserSession({ ...data.user, id: data.user_id });
    showToast('¡Bienvenido ' + data.user.username + '!', 'success');
    setTimeout(() => location.href = 'dashboard.html', 1500);
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
async function checkoutDB() {
  if (!currentUser) {
    showToast('Debes iniciar sesión para comprar', 'error');
    return false;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.id })
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
