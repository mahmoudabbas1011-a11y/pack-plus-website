/* Pack Plus — نظام سلة الطلب / عرض السعر */
(function () {
  var CART_KEY = 'packplus_cart_v1';
  var WHATSAPP_NUMBER = '201028735709';
  var NTFY_TOPIC = 'packplus-orders-mh2026x9';

  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function saveCart(c) {
    localStorage.setItem(CART_KEY, JSON.stringify(c));
    renderBadge();
  }
  function renderBadge() {
    var c = getCart();
    var count = 0;
    Object.keys(c).forEach(function (k) { count += c[k].qty; });
    document.querySelectorAll('.cart-badge').forEach(function (el) {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  }
  function addToCart(item, qty) {
    var c = getCart();
    if (!c[item.key]) c[item.key] = { key: item.key, name: item.name, image: item.image, price: item.price, unit: item.unit, qty: 0 };
    c[item.key].qty += qty;
    saveCart(c);
  }
  function updateQty(key, qty) {
    var c = getCart();
    if (!c[key]) return;
    if (qty <= 0) delete c[key];
    else c[key].qty = qty;
    saveCart(c);
    renderDrawer();
  }
  function removeItem(key) {
    var c = getCart();
    delete c[key];
    saveCart(c);
    renderDrawer();
  }

  function renderDrawer() {
    var list = document.getElementById('cart-items');
    var totalEl = document.getElementById('cart-total');
    if (!list) return;
    var c = getCart();
    var keys = Object.keys(c);
    if (keys.length === 0) {
      list.innerHTML = '<p class="cart-empty">السلة فاضية دلوقتي — تصفح المنتجات وضيف اللي محتاجه.</p>';
      if (totalEl) totalEl.textContent = '';
      return;
    }
    var total = 0;
    var hasPriced = false;
    list.innerHTML = keys.map(function (k) {
      var it = c[k];
      var lineTotal = (it.price || 0) * it.qty;
      total += lineTotal;
      if (it.price) hasPriced = true;
      return (
        '<div class="cart-line">' +
          '<img src="' + it.image + '" alt="' + it.name + '">' +
          '<div class="cart-line-info">' +
            '<div class="cart-line-name">' + it.name + '</div>' +
            (it.unit ? '<div class="cart-line-unit">' + it.unit + '</div>' : '') +
            '<div class="cart-line-controls">' +
              '<button type="button" data-act="dec" data-key="' + k + '">−</button>' +
              '<span>' + it.qty + '</span>' +
              '<button type="button" data-act="inc" data-key="' + k + '">+</button>' +
              '<button type="button" data-act="del" data-key="' + k + '" class="cart-line-del">حذف</button>' +
            '</div>' +
          '</div>' +
          '<div class="cart-line-price">' + (it.price ? (lineTotal.toFixed(2) + ' ج.م') : '—') + '</div>' +
        '</div>'
      );
    }).join('');
    if (totalEl) totalEl.textContent = hasPriced ? ('الإجمالي التقريبي: ' + total.toFixed(2) + ' ج.م') : '';
  }

  function openDrawer() {
    var d = document.getElementById('cart-drawer');
    var o = document.getElementById('cart-overlay-bg');
    if (d) d.classList.add('open');
    if (o) o.classList.add('open');
    renderDrawer();
  }
  function closeDrawer() {
    var d = document.getElementById('cart-drawer');
    var o = document.getElementById('cart-overlay-bg');
    if (d) d.classList.remove('open');
    if (o) o.classList.remove('open');
  }

  function buildOrderLines() {
    var c = getCart();
    var keys = Object.keys(c);
    if (keys.length === 0) return null;
    var lines = [];
    var total = 0;
    keys.forEach(function (k) {
      var it = c[k];
      var lineTotal = (it.price || 0) * it.qty;
      total += lineTotal;
      lines.push('- ' + it.name + (it.unit ? ' (' + it.unit + ')' : '') + '  ×  ' + it.qty);
    });
    return { lines: lines, total: total };
  }

  function buildWhatsAppMessage() {
    var order = buildOrderLines();
    if (!order) return '';
    var msgLines = ['مرحباً، عايز أطلب عرض سعر للأصناف دي:', ''].concat(order.lines);
    if (order.total > 0) {
      msgLines.push('');
      msgLines.push('الإجمالي التقريبي: ' + order.total.toFixed(2) + ' ج.م');
    }
    return encodeURIComponent(msgLines.join('\n'));
  }

  function notifyNtfy() {
    var order = buildOrderLines();
    if (!order) return;
    var msgLines = order.lines.slice();
    if (order.total > 0) {
      msgLines.push('');
      msgLines.push('الإجمالي التقريبي: ' + order.total.toFixed(2) + ' ج.م');
    }
    var text = msgLines.join('\n');
    fetch('https://ntfy.sh/' + NTFY_TOPIC, {
      method: 'POST',
      headers: {
        'Title': encodeURIComponent('طلب جديد - Pack Plus'),
        'Priority': 'high',
        'Tags': 'bell'
      },
      body: text
    }).catch(function (err) {
      console.warn('تعذر إرسال إشعار ntfy:', err);
    });
  }

  document.addEventListener('click', function (e) {
    var addBtn = e.target.closest('.add-to-cart-btn');
    if (addBtn) {
      var wrap = addBtn.closest('[data-key]');
      if (!wrap) return;
      var qtyInput = wrap.querySelector('.qty-input');
      var qty = parseInt(qtyInput && qtyInput.value, 10) || 1;
      addToCart({
        key: wrap.dataset.key,
        name: wrap.dataset.name,
        image: wrap.dataset.image,
        price: parseFloat(wrap.dataset.price) || 0,
        unit: wrap.dataset.unit || ''
      }, qty);
      var original = addBtn.textContent;
      addBtn.textContent = 'تمت الإضافة ✓';
      setTimeout(function () { addBtn.textContent = original; }, 1200);
      return;
    }

    var stepBtn = e.target.closest('.qty-step');
    if (stepBtn) {
      var w = stepBtn.closest('[data-key]');
      var input = w.querySelector('.qty-input');
      var val = parseInt(input.value, 10) || 1;
      if (stepBtn.dataset.dir === 'inc') val++;
      else val = Math.max(1, val - 1);
      input.value = val;
      return;
    }

    if (e.target.closest('.cart-toggle')) { openDrawer(); return; }
    if (e.target.closest('.cart-close') || e.target.closest('.cart-overlay')) { closeDrawer(); return; }

    var lineAct = e.target.closest('[data-act]');
    if (lineAct) {
      var key = lineAct.dataset.key;
      var c2 = getCart();
      var current = c2[key] ? c2[key].qty : 0;
      if (lineAct.dataset.act === 'inc') updateQty(key, current + 1);
      if (lineAct.dataset.act === 'dec') updateQty(key, current - 1);
      if (lineAct.dataset.act === 'del') removeItem(key);
      return;
    }

    if (e.target.closest('.cart-checkout')) {
      var msg = buildWhatsAppMessage();
      if (!msg) { alert('السلة فاضية — ضيف منتجات الأول'); return; }
      notifyNtfy();
      window.open('https://wa.me/' + WHATSAPP_NUMBER + '?text=' + msg, '_blank');
      return;
    }
  });

  renderBadge();
  document.addEventListener('DOMContentLoaded', renderBadge);
})();
