// Cart logic - stores cart in localStorage under 'gh_cart'
(function(){
  const KEY = 'gh_cart';
  let cart = [];

  function load(){
    try{ return JSON.parse(localStorage.getItem(KEY)) || [] }catch(e){return []}
  }
  function save(){ localStorage.setItem(KEY, JSON.stringify(cart)) }
  function formatPrice(n){ return `$${Number(n).toFixed(2)}` }

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
    if(existing){ existing.qty = (existing.qty||1) + (item.qty||1) }
    else cart.push(Object.assign({qty:1}, item));
    save(); renderPanel();
  }

  function removeItem(idx){ cart.splice(idx,1); save(); renderPanel(); }
  function clearCart(){ cart = []; save(); renderPanel(); }

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
      // open panel briefly
      openPanel();
      return;
    }

    if(e.target.closest && e.target.closest('#cart-btn')){ openPanel(); return }
    if(e.target.closest && e.target.closest('#cart-close')){ closePanel(); return }
    if(e.target.closest && e.target.closest('#cart-clear')){ if(confirm('Vaciar carrito?')) clearCart(); return }
    if(e.target.closest && e.target.closest('#cart-checkout')){ if(cart.length){ alert('Checkout simulado — total: '+document.getElementById('cart-total').textContent); clearCart(); } else { alert('El carrito está vacío'); } return }
    const rem = e.target.closest && e.target.closest('.cart-remove');
    if(rem){ const idx = Number(rem.dataset.idx); removeItem(idx); return }
  });

  function openPanel(){ const panel = document.getElementById('cart-panel'); if(panel){ panel.classList.add('open'); panel.setAttribute('aria-hidden','false'); renderPanel(); }}
  function closePanel(){ const panel = document.getElementById('cart-panel'); if(panel){ panel.classList.remove('open'); panel.setAttribute('aria-hidden','true'); }}

  // initialize
  cart = load();
  document.addEventListener('DOMContentLoaded', function(){ renderCount(); renderPanel(); });
})();
