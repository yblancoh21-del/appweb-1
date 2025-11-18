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
    cart.forEach((item, idx)=>{
      const div = document.createElement('div'); div.className='cart-item';
      div.innerHTML = `<img src="${item.image||'images/01-cover.jpg'}" alt="${escapeHtml(item.title)}"><div class=\"ci-info\"><div class=\"ci-title\">${escapeHtml(item.title)}</div><div class=\"ci-meta\">${item.qty} × ${formatPrice(item.price)}</div></div><div class=\"ci-actions\"><button class=\"btn small cart-remove\" data-idx=\"${idx}\">Eliminar</button></div>`;
      list.appendChild(div);
    });
    const total = cart.reduce((s,i)=> s + (i.qty||1) * Number(i.price),0);
    const totalEl = document.getElementById('cart-total'); if(totalEl) totalEl.textContent = formatPrice(total);
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
    if(e.target.closest && e.target.closest('#cart-checkout')){ 
      if(!cart.length){ showToast('El carrito está vacío', 'error'); return }

      // Show payment modal and process checkout if backend available
      (async function(){
        try {
          const payment = await showPaymentModal();
          if (!payment) { showToast('Pago cancelado', 'info'); return }

          // If checkoutDB exists (api.js loaded), use it
          if (typeof checkoutDB === 'function'){
            // mask payment_info if card
            let payment_info = '';
            if (payment.method !== 'cash' && payment.cardNumber) {
              const num = payment.cardNumber.replace(/\s+/g,'');
              payment_info = 'card_last4:' + num.slice(-4);
            }
            const ok = await checkoutDB(payment.method, payment_info);
            if (ok) clearCart();
            return;
          }

          // Fallback: client-only behavior (old flow)
          const total = document.getElementById('cart-total').textContent;
          showToast(`Pedido completado — Total: ${total}`, 'success');
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
  
  // Payment modal helper
  function showPaymentModal(){
    return new Promise((resolve)=>{
      // Build modal
      const overlay = document.createElement('div'); overlay.style = 'position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:900;';
      const modal = document.createElement('div'); modal.style = 'background:#0f1418;color:#e6eef2;padding:18px;border-radius:10px;max-width:420px;width:100%;box-shadow:0 8px 30px rgba(0,0,0,0.6);';
      modal.innerHTML = `
        <h3 style="margin-top:0">Método de pago</h3>
        <div style="margin-bottom:8px">Seleccione método de pago (en efectivo no requiere más datos)</div>
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <select id="pm-select" style="flex:1;padding:8px;border-radius:6px;background:transparent;border:1px solid rgba(255,255,255,0.05);color:var(--muted);">
            <option value="card">Tarjeta</option>
            <option value="cash">Efectivo</option>
            <option value="paypal">PayPal</option>
          </select>
        </div>
        <div id="pm-card-fields" style="display:block;margin-bottom:8px">
          <input id="pm-card-number" placeholder="Número de tarjeta (solo para demostración)" style="width:100%;padding:8px;border-radius:6px;background:transparent;border:1px solid rgba(255,255,255,0.05);color:var(--muted);margin-bottom:8px">
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button id="pm-cancel" class="btn small" type="button">Cancelar</button>
          <button id="pm-pay" class="btn small" type="button">Pagar</button>
        </div>
      `;
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      const select = modal.querySelector('#pm-select');
      const cardFields = modal.querySelector('#pm-card-fields');
      select.addEventListener('change', function(){ if (this.value === 'cash') cardFields.style.display = 'none'; else cardFields.style.display = 'block'; });
      modal.querySelector('#pm-cancel').addEventListener('click', function(){ overlay.remove(); resolve(null); });
      modal.querySelector('#pm-pay').addEventListener('click', function(){
        const method = select.value;
        const cardNumber = modal.querySelector('#pm-card-number').value || '';
        overlay.remove();
        resolve({ method, cardNumber });
      });
    });
  }
})();
