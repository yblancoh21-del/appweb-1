// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Store user session
let currentUser = null;

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
  location.href = 'index.html';
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
      alert('Error: ' + data.error);
      return false;
    }
    
    saveUserSession(data.user);
    alert('¡Cuenta creada! Redirigiendo...');
    setTimeout(() => location.href = 'dashboard.html', 1500);
    return true;
  } catch (error) {
    console.error('Register error:', error);
    alert('Error en el registro');
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
      alert('Error: ' + data.error);
      return false;
    }
    
    saveUserSession({ ...data.user, id: data.user_id });
    alert('¡Bienvenido!');
    setTimeout(() => location.href = 'dashboard.html', 1500);
    return true;
  } catch (error) {
    console.error('Login error:', error);
    alert('Error en el login');
    return false;
  }
}

// Add to cart (integrated with cart.js)
async function addToCartDB(productId, title, price, image) {
  if (!currentUser) {
    // Fallback to localStorage if not logged in
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
    
    alert('Agregado al carrito');
    // Also sync with localStorage
    addToCart(productId, title, price, image);
  } catch (error) {
    console.error('Add to cart error:', error);
    // Fallback to localStorage
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
    alert('Debes iniciar sesión para comprar');
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
      alert('Error: ' + data.error);
      return false;
    }
    
    alert('¡Pedido realizado! Total: $' + data.total.toFixed(2));
    localStorage.removeItem('gh_cart');
    renderCount();
    renderPanel();
    return true;
  } catch (error) {
    console.error('Checkout error:', error);
    alert('Error al procesar el pago');
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
