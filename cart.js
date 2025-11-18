// Cart logic - stores cart in localStorage under 'gh_cart'
(function(){
  const KEY = 'gh_cart';
  let cart = [];

  function load(){
    try{ return JSON.parse(localStorage.getItem(KEY)) || [] }catch(e){return []}
  }
  function save(){ localStorage.setItem(KEY, JSON.stringify(cart)) }
  function formatPrice(n){ return `$${Number(n).toFixed(2)}` }

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

  function renderCount(){
    const count = cart.reduce((s,i)=> s + (i.qty||1),0);
    document.querySelectorAll('#cart-count').forEach(el=>el.textContent = count);
  }

  function renderPanel(){
    const panel = document.getElementById('cart-panel');
    if(!panel) return;
    const list = document.getElementById('cart-items');
    list.innerHTML = '';
    
    if (cart.length === 0) {
      list.innerHTML = '<div style="padding:20px;text-align:center;color:#888;">Tu carrito está vacío</div>';
      document.getElementById('cart-total').innerHTML = '<div style="color:#888;">Total: $0.00</div>';
      renderCount();
      return;
    }
    
    cart.forEach((item, idx)=>{
      const itemTotal = (item.qty||1) * Number(item.price);
      const div = document.createElement('div'); 
      div.className='cart-item';
      div.innerHTML = `
        <img src="${item.image||'images/01-cover.jpg'}" alt="${escapeHtml(item.title)}" style="width:60px;height:60px;object-fit:cover;border-radius:4px;">
        <div class="ci-info">
          <div class="ci-title" style="font-weight:600;margin-bottom:4px;">${escapeHtml(item.title)}</div>
          <div class="ci-meta">${item.qty} × ${formatPrice(item.price)} = <strong>${formatPrice(itemTotal)}</strong></div>
        </div>
        <div class="ci-actions" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end;">
          <button class="cart-qty-btn" data-idx="${idx}" data-op="minus" style="padding:4px 8px;border:1px solid #555;border-radius:3px;background:transparent;color:#e6eef2;cursor:pointer;font-size:0.9em;font-weight:bold;">−</button>
          <span style="min-width:25px;text-align:center;font-size:0.9em;">${item.qty}</span>
          <button class="cart-qty-btn" data-idx="${idx}" data-op="plus" style="padding:4px 8px;border:1px solid #555;border-radius:3px;background:transparent;color:#e6eef2;cursor:pointer;font-size:0.9em;font-weight:bold;">+</button>
          <button class="btn small cart-remove" data-idx="${idx}" style="margin-left:6px;padding:4px 10px;font-size:0.85em;">✕</button>
        </div>
      `;
      list.appendChild(div);
    });
    
    const subtotal = cart.reduce((s,i)=> s + (i.qty||1) * Number(i.price),0);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;
    
    const totalEl = document.getElementById('cart-total');
    if(totalEl) {
      totalEl.innerHTML = `
        <div style="font-size:0.9em;color:#ccc;line-height:1.6;">
          <div style="display:flex;justify-content:space-between;border-bottom:1px solid #333;padding-bottom:6px;margin-bottom:6px;">
            <span>Subtotal:</span>
            <span>${formatPrice(subtotal)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span>Impuesto (10%):</span>
            <span>${formatPrice(tax)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;border-top:1px solid #555;padding-top:8px;font-size:1.1em;font-weight:bold;color:#4ade80;">
            <span>Total:</span>
            <span>${formatPrice(total)}</span>
          </div>
        </div>
      `;
    }
    renderCount();
  }

  function escapeHtml(s){ return String(s).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c)) }

  function addItem(item){
    const existing = cart.find(i=>i.id === item.id);
    if(existing){ existing.qty = (existing.qty||1) + (item.qty||1); showToast('Cantidad actualizada en el carrito', 'info'); }
    else { cart.push(Object.assign({qty:1}, item)); showToast(`${item.title} agregado al carrito`, 'success'); }
    save(); renderPanel();
  }

  function removeItem(idx){ 
    const title = cart[idx]?.title;
    cart.splice(idx,1); 
    save(); 
    renderPanel();
    showToast(`${title} removido del carrito`, 'warning');
  }

  function updateQty(idx, op) {
    if (op === 'plus') {
      cart[idx].qty = (cart[idx].qty || 1) + 1;
    } else if (op === 'minus') {
      cart[idx].qty = Math.max(1, (cart[idx].qty || 1) - 1);
    }
    save();
    renderPanel();
  }

  function clearCart(){ cart = []; save(); renderPanel(); showToast('Carrito vaciado', 'info'); }

  // Events
  document.addEventListener('click', function(e){
    const a = e.target.closest && e.target.closest('.add-to-cart');
    if(a){
      const item = {
        id: a.dataset.id,
        title: a.dataset.title,
        price: Number(a.dataset.price || a.getAttribute('data-price') || 0),
        image: a.dataset.image
      };
      addItem(item);
      openPanel();
      return;
    }

    if(e.target.closest && e.target.closest('#cart-btn')){ openPanel(); return }
    if(e.target.closest && e.target.closest('#cart-close')){ closePanel(); return }
    if(e.target.closest && e.target.closest('#cart-clear')){ clearCart(); return }
    
    // Quantity buttons
    const qtyBtn = e.target.closest && e.target.closest('.cart-qty-btn');
    if(qtyBtn){
      const idx = Number(qtyBtn.dataset.idx);
      const op = qtyBtn.dataset.op;
      updateQty(idx, op);
      return;
    }
    
    if(e.target.closest && e.target.closest('#cart-checkout')){ 
      if(!cart.length){ showToast('El carrito está vacío', 'error'); return }

      // Show payment modal and process checkout if backend available
      (async function(){
        try {
          const payment = await showPaymentModal();
          if (!payment) { showToast('Pago cancelado', 'info'); return }

          // If checkoutDB exists (api.js loaded), use it
          if (typeof checkoutDB === 'function'){
            // mask payment_info
            let payment_info = '';
            if (payment.method === 'card' && payment.cardNumber) {
              const num = payment.cardNumber.replace(/\s+/g,'');
              payment_info = 'card_last4:' + num.slice(-4);
            } else if (payment.method === 'paypal') {
              payment_info = 'paypal:' + (payment.email || 'user@example.com');
            }
            const ok = await checkoutDB(payment.method, payment_info);
            if (ok) clearCart();
            return;
          }

          // Fallback: client-only behavior
          showToast('Pedido completado exitosamente', 'success');
          clearCart();
        } catch (err) { console.error(err); showToast('Error en el proceso de pago', 'error'); }
      })();
      return
    }
    const rem = e.target.closest && e.target.closest('.cart-remove');
    if(rem){ const idx = Number(rem.dataset.idx); removeItem(idx); return }
  });

  function openPanel(){ const panel = document.getElementById('cart-panel'); if(panel){ panel.classList.add('open'); panel.setAttribute('aria-hidden','false'); renderPanel(); }}
  function closePanel(){ const panel = document.getElementById('cart-panel'); if(panel){ panel.classList.remove('open'); panel.setAttribute('aria-hidden','true'); }}

  // initialize
  cart = load();
  document.addEventListener('DOMContentLoaded', function(){ renderCount(); renderPanel(); });
  
  // Enhanced payment modal with realistic UI
  function showPaymentModal(){
    return new Promise((resolve)=>{
      const overlay = document.createElement('div');
      overlay.className = 'payment-overlay';
      overlay.style = 'position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(4px);';
      
      const modal = document.createElement('div');
      modal.className = 'payment-modal';
      modal.style = 'background:#1a1f27;color:#e6eef2;padding:0;border-radius:12px;max-width:520px;width:95%;max-height:90vh;box-shadow:0 20px 60px rgba(0,0,0,0.9);border:1px solid rgba(255,255,255,0.1);font-family:inherit;overflow-y:auto;';
      
      const subtotal = cart.reduce((s,i)=> s + (i.qty||1) * Number(i.price),0);
      const tax = subtotal * 0.1;
      const total = subtotal + tax;
      
      modal.innerHTML = `
        <div style="background:linear-gradient(135deg, #2a3f5f 0%, #1a1f27 100%);padding:24px;border-bottom:1px solid rgba(255,255,255,0.1);">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <h2 style="margin:0;font-size:1.5em;font-weight:600;">🛒 Finalizar Compra</h2>
              <p style="margin:8px 0 0 0;color:#aaa;font-size:0.9em;">Completa tu pedido de forma segura</p>
            </div>
            <div style="text-align:right;background:rgba(74,222,128,0.1);padding:12px 16px;border-radius:8px;border:1px solid rgba(74,222,128,0.3);">
              <div style="color:#4ade80;font-weight:600;font-size:1.2em;">${formatPrice(total)}</div>
              <div style="color:#aaa;font-size:0.85em;">Total</div>
            </div>
          </div>
        </div>
        
        <div style="padding:24px;">
          <!-- Order Summary -->
          <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:8px;padding:16px;margin-bottom:24px;">
            <h3 style="margin:0 0 12px 0;font-size:0.95em;color:#aaa;text-transform:uppercase;letter-spacing:0.5px;">Resumen del Pedido</h3>
            <div style="display:flex;justify-content:space-between;font-size:0.9em;margin-bottom:8px;">
              <span>Subtotal:</span>
              <span>${formatPrice(subtotal)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.9em;margin-bottom:8px;color:#aaa;">
              <span>Impuesto (10%):</span>
              <span>${formatPrice(tax)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-weight:600;border-top:1px solid rgba(255,255,255,0.1);padding-top:8px;margin-top:8px;font-size:1em;">
              <span>Total a pagar:</span>
              <span style="color:#4ade80;font-size:1.1em;">${formatPrice(total)}</span>
            </div>
          </div>

          <!-- Payment Methods -->
          <div style="margin-bottom:24px;">
            <label style="display:block;margin-bottom:12px;font-weight:600;font-size:0.95em;color:#e6eef2;">Selecciona método de pago</label>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;">
              <label style="display:flex;align-items:center;cursor:pointer;padding:12px;border:2px solid rgba(255,255,255,0.1);border-radius:8px;background:rgba(255,255,255,0.02);transition:all 0.2s;has(input:checked) {border-color:#4ade80;background:rgba(74,222,128,0.1);}">
                <input type="radio" id="pm-card" name="pm-method" value="card" checked style="margin-right:8px;cursor:pointer;accent-color:#4ade80;">
                <span style="font-size:0.9em;">💳 Tarjeta</span>
              </label>
              <label style="display:flex;align-items:center;cursor:pointer;padding:12px;border:2px solid rgba(255,255,255,0.1);border-radius:8px;background:rgba(255,255,255,0.02);transition:all 0.2s;has(input:checked) {border-color:#4ade80;background:rgba(74,222,128,0.1);}">
                <input type="radio" id="pm-paypal" name="pm-method" value="paypal" style="margin-right:8px;cursor:pointer;accent-color:#4ade80;">
                <span style="font-size:0.9em;">🅿️ PayPal</span>
              </label>
              <label style="display:flex;align-items:center;cursor:pointer;padding:12px;border:2px solid rgba(255,255,255,0.1);border-radius:8px;background:rgba(255,255,255,0.02);transition:all 0.2s;has(input:checked) {border-color:#4ade80;background:rgba(74,222,128,0.1);}">
                <input type="radio" id="pm-cash" name="pm-method" value="cash" style="margin-right:8px;cursor:pointer;accent-color:#4ade80;">
                <span style="font-size:0.9em;">💵 Efectivo</span>
              </label>
            </div>
          </div>
          
          <!-- Card Fields -->
          <div id="pm-card-fields" style="display:block;margin-bottom:24px;background:rgba(255,255,255,0.02);padding:16px;border-radius:8px;border:1px solid rgba(255,255,255,0.05);">
            <label style="display:block;font-weight:600;font-size:0.9em;margin-bottom:8px;color:#e6eef2;">Número de tarjeta</label>
            <input id="pm-card-number" placeholder="4532 1234 5678 9010" style="width:100%;padding:11px 12px;border-radius:6px;background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.1);color:#e6eef2;font-family:monospace;margin-bottom:12px;font-size:1em;" maxlength="19">
            
            <div style="display:flex;gap:12px;margin-bottom:12px;">
              <div style="flex:1;">
                <label style="display:block;font-weight:600;font-size:0.9em;margin-bottom:6px;color:#e6eef2;">Vencimiento</label>
                <input id="pm-expiry" placeholder="MM/YY" style="width:100%;padding:11px 12px;border-radius:6px;background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.1);color:#e6eef2;font-family:monospace;font-size:1em;" maxlength="5">
              </div>
              <div style="flex:1;">
                <label style="display:block;font-weight:600;font-size:0.9em;margin-bottom:6px;color:#e6eef2;">CVV</label>
                <input id="pm-cvv" placeholder="123" type="password" style="width:100%;padding:11px 12px;border-radius:6px;background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.1);color:#e6eef2;font-family:monospace;font-size:1em;" maxlength="4">
              </div>
            </div>
            
            <label style="display:block;font-weight:600;font-size:0.9em;margin-bottom:8px;color:#e6eef2;">Nombre del titular</label>
            <input id="pm-cardholder" placeholder="Nombre Completo" style="width:100%;padding:11px 12px;border-radius:6px;background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.1);color:#e6eef2;margin-bottom:0;font-size:1em;">
          </div>
          
          <!-- PayPal Fields -->
          <div id="pm-paypal-fields" style="display:none;margin-bottom:24px;background:rgba(255,255,255,0.02);padding:16px;border-radius:8px;border:1px solid rgba(255,255,255,0.05);">
            <label style="display:block;font-weight:600;font-size:0.9em;margin-bottom:8px;color:#e6eef2;">Email de PayPal</label>
            <input id="pm-paypal-email" placeholder="tu@email.com" style="width:100%;padding:11px 12px;border-radius:6px;background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.1);color:#e6eef2;margin-bottom:0;font-size:1em;">
          </div>
          
          <!-- Cash Info -->
          <div id="pm-cash-fields" style="display:none;margin-bottom:24px;padding:14px;background:rgba(76,175,80,0.1);border:1px solid rgba(76,175,80,0.3);border-radius:8px;">
            <p style="margin:0;color:#4ade80;font-size:0.95em;line-height:1.5;">✓ <strong>Pago en efectivo al recibir</strong><br><span style="font-size:0.85em;">No se requieren datos de pago. Se cobrarará ${formatPrice(total)} a la entrega.</span></p>
          </div>
          
          <!-- Security Notice -->
          <div style="background:rgba(100,150,200,0.1);padding:12px;border-radius:6px;border-left:3px solid #4ade80;margin-bottom:20px;font-size:0.85em;color:#aaa;">
            🔒 Tu información de pago es procesada de forma segura. Esta es una demostración.
          </div>
          
          <!-- Action Buttons -->
          <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button id="pm-cancel" class="btn small" type="button" style="background:transparent;border:1px solid rgba(255,255,255,0.2);color:#e6eef2;padding:11px 18px;font-weight:500;cursor:pointer;border-radius:6px;transition:all 0.2s;">Cancelar</button>
            <button id="pm-pay" class="btn small" type="button" style="background:#4ade80;color:#000;font-weight:600;padding:11px 24px;cursor:pointer;border-radius:6px;border:none;transition:all 0.2s;">Confirmar Compra</button>
          </div>
        </div>
      `;
      
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // Handle method selection
      const methodRadios = modal.querySelectorAll('input[name="pm-method"]');
      const cardFields = modal.querySelector('#pm-card-fields');
      const paypalFields = modal.querySelector('#pm-paypal-fields');
      const cashFields = modal.querySelector('#pm-cash-fields');
      
      function updatePaymentFields() {
        const selected = modal.querySelector('input[name="pm-method"]:checked').value;
        cardFields.style.display = selected === 'card' ? 'block' : 'none';
        paypalFields.style.display = selected === 'paypal' ? 'block' : 'none';
        cashFields.style.display = selected === 'cash' ? 'block' : 'none';
      }
      
      methodRadios.forEach(radio => {
        radio.addEventListener('change', updatePaymentFields);
      });
      
      modal.querySelector('#pm-cancel').addEventListener('click', function(){ 
        overlay.remove(); 
        resolve(null); 
      });
      
      modal.querySelector('#pm-pay').addEventListener('click', function(){
        const method = modal.querySelector('input[name="pm-method"]:checked').value;
        let email = '';
        let cardNumber = '';
        
        // Validation
        if (method === 'card') {
          cardNumber = modal.querySelector('#pm-card-number').value || '';
          const expiry = modal.querySelector('#pm-expiry').value || '';
          const cvv = modal.querySelector('#pm-cvv').value || '';
          const cardholder = modal.querySelector('#pm-cardholder').value || '';
          
          if (!cardNumber || !expiry || !cvv || !cardholder) {
            showToast('Por favor completa todos los campos de tarjeta', 'error');
            return;
          }
        } else if (method === 'paypal') {
          email = modal.querySelector('#pm-paypal-email').value || '';
          if (!email) {
            showToast('Por favor ingresa tu email de PayPal', 'error');
            return;
          }
        }
        
        overlay.remove();
        resolve({ method, cardNumber, email });
      });
      
      // Close on overlay click (outside modal)
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          overlay.remove();
          resolve(null);
        }
      });
    });
  }
})();
