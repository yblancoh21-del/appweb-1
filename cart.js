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
      if(cart.length){ 
        const total = document.getElementById('cart-total').textContent;
        showToast(`Pedido completado — Total: ${total}`, 'success'); 
        clearCart(); 
      } else { 
        showToast('El carrito está vacío', 'error'); 
      } 
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
})();
