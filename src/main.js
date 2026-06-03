// AY GABZ - Modern Retail Suite (v5.0 Crystal)
const API_URL = '/api';
let user = JSON.parse(localStorage.getItem('ay_gabz_user')) || null;
// User-partitioned cart storage for multi-user privacy
const getCartKey = () => user ? `ay_gabz_cart_${user.id}` : 'ay_gabz_cart_guest';
let cart = JSON.parse(localStorage.getItem(getCartKey())) || [];

const views = {
  // --- AUTH VIEWS (SPLIT SCREEN) ---
  login: {
    title: '',
    render: async () => {
      return `
        <div class="split-page">
          <div class="brand-panel">
            <div class="brand-content">
              <h2>AY GABZ</h2>
              <p>Gestiona tu inventario y ventas con la plataforma más robusta del mercado.</p>
            </div>
          </div>
          <div class="form-panel">
            <div class="auth-brand-mobile">AY GABZ</div>
            <div class="auth-card">
              <div class="auth-header">
                <h1>Bienvenido</h1>
                <p>Ingresa a tu cuenta para continuar</p>
              </div>
              <form id="login-form">
                <div class="form-group"><label>Correo Electrónico</label><input type="email" id="l_email" required></div>
                <div class="form-group"><label>Contraseña</label><input type="password" id="l_pass" required></div>
                <button type="submit" class="btn-primary">Iniciar Sesión</button>
              </form>
              <p class="auth-subtitle">
                ¿No tienes cuenta? <span class="auth-link" id="linkToRegister">Regístrate</span>
              </p>
            </div>
          </div>
        </div>
      `;
    },
    afterRender: () => {
      document.getElementById('linkToRegister').onclick = () => window.navigate('register');
      document.getElementById('login-form').onsubmit = async (e) => {
        e.preventDefault();
        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: document.getElementById('l_email').value,
            password: document.getElementById('l_pass').value
          })
        });
        if (res.ok) {
          const userData = await res.json();
          window.loginSuccess(userData);
        } else {
          try {
            const err = await res.json();
            showToast(err.error || 'Credenciales inválidas', 'error');
          } catch (e) {
            showToast('Error de conexión o servidor no disponible', 'error');
          }
        }
      };
    }
  },

  register: {
    title: '',
    render: async () => {
      return `
        <div class="form-panel centered">
          <div class="auth-brand-mobile">AY GABZ</div>
          <div class="auth-card ultra-wide">
            <div class="auth-header">
              <h1>Crea tu Perfil</h1>
              <p>Únete a la red estratégica de AY GABZ</p>
            </div>
            <form id="reg-form">
              <div class="role-selector">
                  <div class="role-box-mini active" data-role="Cliente">Cliente</div>
                  <div class="role-box-mini" data-role="Tecnico">Técnico Instalador</div>
                  <div class="role-box-mini" data-role="Admin">Admin</div>
              </div>
              <input type="hidden" id="r_rol" value="Cliente">
              
              <div class="form-grid-horizontal">
                <div class="form-group"><label>Nombre(s)</label><input type="text" id="r_nombre" required></div>
                <div class="form-group"><label>Apellidos</label><input type="text" id="r_apellidos" required></div>
                <div class="form-group"><label>Email</label><input type="email" id="r_email" required></div>
                <div class="form-group"><label>Contraseña</label><input type="password" id="r_pass" required></div>
                
                <div id="cliente-fields-grid" style="display: contents;">
                    <div class="form-group">
                        <label>Tipo de Cliente</label>
                        <select id="r_tipo" onchange="window.toggleRFC()">
                            <option value="Residencial">Residencial</option>
                            <option value="Industrial">Industrial</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Teléfono</label>
                        <input type="text" id="r_tel" maxlength="10" pattern="[0-9]{10}" title="Debe contener 10 números exactamente" placeholder="Ej. 5512345678" required>
                    </div>
                </div>
                
                <div id="tecnico-fields-grid" style="display: none;">
                    <div class="form-group">
                        <label>Tipo de Instalador</label>
                        <select id="r_tipo_instalador">
                            <option value="Residencial">Instalador Residencial</option>
                            <option value="Industrial">Instalador Industrial</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Teléfono</label>
                        <input type="text" id="r_tel_tec" maxlength="10" placeholder="Ej. 5512345678">
                    </div>
                    <div class="form-group">
                        <label>Número de ID (Identificación)</label>
                        <input type="text" id="r_numero_id" placeholder="Ej. TEC-001">
                    </div>
                    <div class="form-group">
                        <label>RFC</label>
                        <input type="text" id="r_rfc_tec" placeholder="RFC del técnico">
                    </div>
                </div>
                
                <div class="form-group" id="rfc-container">
                    <label id="rfc-label">RFC (Opcional)</label>
                    <input type="text" id="r_rfc">
                </div>
              </div>

              <div class="form-actions-horizontal">
                <button type="submit" class="btn-primary">Registrarme Ahora</button>
              </div>
            </form>
            <p class="auth-subtitle">
              ¿Ya tienes cuenta? <span class="auth-link" id="linkToLogin">Entra aquí</span>
            </p>
          </div>
        </div>
      `;
    },
    afterRender: () => {
      document.getElementById('linkToLogin').onclick = () => window.navigate('login');
      document.querySelectorAll('.role-box-mini').forEach(box => {
        box.onclick = () => {
          document.querySelectorAll('.role-box-mini').forEach(b => b.classList.remove('active'));
          box.classList.add('active');
          const role = box.dataset.role;
          document.getElementById('r_rol').value = role;
          const isCliente = role === 'Cliente';
          const isTecnico = role === 'Tecnico';
          document.getElementById('cliente-fields-grid').style.display = isCliente ? 'contents' : 'none';
          document.getElementById('tecnico-fields-grid').style.display = isTecnico ? 'contents' : 'none';
          document.getElementById('rfc-container').style.display = isCliente ? 'block' : 'none';
          const telInput = document.getElementById('r_tel');
          if (telInput) telInput.required = isCliente;
        };
      });
      document.getElementById('reg-form').onsubmit = async (e) => {
        e.preventDefault();
        const rol = document.getElementById('r_rol').value;
        const data = {
          nombre: document.getElementById('r_nombre').value.trim(),
          apellido: document.getElementById('r_apellidos').value.trim(),
          email: document.getElementById('r_email').value,
          password: document.getElementById('r_pass').value,
          rol
        };
        if (rol === 'Cliente') {
          data.tipo_cliente = document.getElementById('r_tipo')?.value || 'Residencial';
          data.rfc = document.getElementById('r_rfc')?.value;
          data.telefono = document.getElementById('r_tel')?.value;
        } else if (rol === 'Tecnico') {
          data.tipo_instalador = document.getElementById('r_tipo_instalador')?.value || 'Residencial';
          data.telefono = document.getElementById('r_tel_tec')?.value;
          data.numero_id = document.getElementById('r_numero_id')?.value;
          data.rfc = document.getElementById('r_rfc_tec')?.value;
        }
        const res = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (res.ok) {
          showToast('¡Registro exitoso! Ya puedes iniciar sesión.', 'success');
          setTimeout(() => window.navigate('login'), 1500);
        } else {
          try {
            const err = await res.json();
            const displayMsg = typeof err.error === 'string' ? err.error : (Array.isArray(err.error) ? err.error[0].message : 'Error en el servidor');
            showToast(displayMsg, 'error');
          } catch (e) {
            showToast('Error de conexión o servidor no disponible', 'error');
          }
        }
      };
    }
  },

  // --- DASHBOARD VIEWS (FLUID) ---
  dashboard: {
    title: 'Dashboard Operativo',
    render: async () => {
      const stats = await fetch(`${API_URL}/stats`).then(r => r.json());
      const tecnicos = await fetch(`${API_URL}/tecnicos/disponibles`).then(r => r.json());
      const instStats = stats.instalaciones || { pendientes: 0, realizadas: 0, canceladas: 0, reprogramadas: 0 };
      return `
        <div class="stats-grid">
          <div class="card"><label>Ingresos Totales</label><div class="price-tag">$${stats.totalVentas.toLocaleString()}</div></div>
          <div class="card"><label>Productos Vendidos</label><div class="price-tag" style="color: var(--text-main)">${stats.numVentas}</div></div>
          <div class="card"><label>Clientes Activos</label><div class="price-tag" style="color: var(--text-main)">${stats.numClientes}</div></div>
          <div class="card"><label>Producto Estrella</label><div class="price-tag" style="color: var(--primary); font-size: 1.1rem">${stats.topProducto || 'N/A'}</div></div>
        </div>

        <div class="card" style="margin-bottom: 2.5rem">
          <h2 style="margin-bottom: 1.5rem">📋 Resumen de Instalaciones</h2>
          <div class="install-stats-grid">
            <div class="install-stat-card stat-pendiente"><div class="stat-number">${instStats.pendientes}</div><div class="stat-label">Pendientes</div></div>
            <div class="install-stat-card stat-realizada"><div class="stat-number">${instStats.realizadas}</div><div class="stat-label">Realizadas</div></div>
            <div class="install-stat-card stat-cancelada"><div class="stat-number">${instStats.canceladas}</div><div class="stat-label">Canceladas</div></div>
            <div class="install-stat-card stat-reprogramada"><div class="stat-number">${instStats.reprogramadas}</div><div class="stat-label">Reprogramadas</div></div>
          </div>

          <h3 style="margin-bottom: 1rem; font-size: 1rem; color: var(--text-muted)">Técnicos — Disponibilidad Hoy</h3>
          <div class="tecnico-list">
            ${tecnicos.length === 0 ? '<p style="color:var(--text-muted)">No hay técnicos registrados aún.</p>' :
          tecnicos.map(t => {
            const maxSlots = 9; // 10AM-6PM = 9 slots
            const isBusy = t.instalaciones_hoy >= maxSlots;
            return `<div class="tecnico-card">
                  <div class="tecnico-indicator ${isBusy ? 'busy' : 'available'}"></div>
                  <div>
                    <div class="tecnico-name ${isBusy ? 'name-busy' : 'name-available'}">${escape(t.nombre_completo)}</div>
                    <div class="tecnico-type">${escape(t.tipo_instalador)} — ${t.instalaciones_hoy} instalación(es) hoy</div>
                  </div>
                </div>`;
          }).join('')}
          </div>
        </div>

        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem">
            <h2>Actividad Reciente</h2>
            <button class="btn-primary" style="width: auto; padding: 0.6rem 1.2rem" id="btnExpDash">📊 Exportar Excel</button>
          </div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Referencia</th><th>Fecha</th><th>Importe</th><th>Acción</th></tr></thead>
              <tbody>
                ${stats.ventasRecientes.map(v => `
                  <tr>
                    <td><strong>${escape(v.cliente)}</strong></td>
                    <td>${new Date(v.fecha_venta).toLocaleDateString()}</td>
                    <td style="font-weight: 800">$${v.total.toFixed(2)}</td>
                    <td><span style="font-size: 0.8rem; color: var(--text-muted)">REGISTRADO</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    },
    afterRender: () => {
      const btn = document.getElementById('btnExpDash');
      if (btn) btn.onclick = () => window.exportSalesExcel();
    }
  },

  productos: {
    title: 'Gestión de Inventario',
    render: async () => {
      const prods = await fetch(`${API_URL}/productos`).then(r => r.json());
      return `
        <div style="margin-bottom: 2.5rem; display: flex; justify-content: flex-end">
          <button class="btn-primary" style="width: auto" id="btnAddProdInvite">+ Nuevo Producto</button>
        </div>
        <div class="card">
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Imagen</th><th>Nombre</th><th>Precio</th><th>Stock</th><th>Gestión</th></tr></thead>
              <tbody>
                ${prods.map(p => {
        const imgs = JSON.parse(p.imagenes_json || '[]');
        const mainImg = imgs.length > 0 ? imgs[0] : 'https://placehold.co/400x400/1e293b/0ea5e9?text=Sin+Imagen';
        return `
                  <tr>
                    <td><img src="${mainImg}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border-glass)"></td>
                    <td><strong>${escape(p.nombre)}</strong></td>
                    <td><span class="category-badge">${escape(p.categoria || 'Industrial')}</span></td>
                    <td><span class="price-tag">$${p.precio.toFixed(2)}</span></td>
                    <td><span class="stock-badge ${p.stock <= 0 ? 'empty' : (p.stock < 5 ? 'low' : '')}">${p.stock} unidades</span></td>
                    <td>
                      <button class="action-btn btn-edit-prod" data-id="${p.id}">✏️</button>
                      <button class="action-btn btn-delete-prod" data-id="${p.id}">🗑️</button>
                    </td>
                  </tr>
                `}).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    },
    afterRender: () => {
      const btnAdd = document.getElementById('btnAddProdInvite');
      if (btnAdd) btnAdd.onclick = () => window.openModal('producto');

      document.querySelectorAll('.btn-edit-prod').forEach(btn => {
        btn.onclick = () => window.editItem('producto', btn.getAttribute('data-id'));
      });

      document.querySelectorAll('.btn-delete-prod').forEach(btn => {
        btn.onclick = () => window.deleteItem('productos', btn.getAttribute('data-id'));
      });
    }
  },

  ventas: {
    title: 'Historial de Ventas',
    render: async () => {
      const ventas = await fetch(`${API_URL}/ventas`).then(r => r.json());
      return `
        <div class="card">
          <div style="display: flex; justify-content: flex-end; margin-bottom: 2rem">
            <button class="btn-primary" style="width: auto; padding: 0.6rem 1.2rem" id="btnExpSales">📊 Exportar Excel</button>
          </div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>ID</th><th>Cliente</th><th>Producto</th><th>Total</th><th>Fecha</th><th>Estatus</th></tr></thead>
              <tbody>
                ${ventas.map(v => `
                  <tr>
                    <td>#${v.id}</td>
                    <td><strong>${escape(v.cliente_nombre)}</strong></td>
                    <td>${escape(v.producto_nombre)}</td>
                    <td class="price-tag">$${v.total.toFixed(2)}</td>
                    <td>${new Date(v.fecha_venta).toLocaleDateString()}</td>
                    <td><span style="font-size: 0.8rem; color: var(--text-muted)">COMPLETADO 🚛</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    },
    afterRender: () => {
      const btn = document.getElementById('btnExpSales');
      if (btn) btn.onclick = () => window.exportSalesExcel();
    }
  },

  clientes: {
    title: 'Directorio de Clientes',
    render: async () => {
      const clientes = await fetch(`${API_URL}/clientes`).then(r => r.json());
      return `
        <div class="card">
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Nombre</th><th>Email</th><th>Tipo</th><th>RFC</th></tr></thead>
              <tbody>
                ${clientes.map(c => `
                  <tr>
                    <td><strong>${escape(c.nombre)} ${escape(c.apellido)}</strong></td>
                    <td>${escape(c.email)}</td>
                    <td><span class="stock-badge">${escape(c.tipo_cliente)}</span></td>
                    <td>${escape(c.rfc || 'N/A')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
  },

  cliente_catalog: {
    title: 'Catálogo de Compras',
    render: async () => {
      const prods = await fetch(`${API_URL}/productos`).then(r => r.json());
      return `
        <div class="search-panel card">
            <input type="text" id="catalogSearch" placeholder="🔍 Buscar por nombre, sector o SKU (ej: GABZ-001)...">
        </div>
        <div class="product-grid" id="catalogGrid">
          ${prods.map(p => {
        const isOut = p.stock <= 0;
        const imgs = JSON.parse(p.imagenes_json || '[]');
        const mainImg = imgs.length > 0 ? imgs[0] : 'https://placehold.co/400x400/1e293b/0ea5e9?text=Sin+Imagen';
        return `
                <div class="card product-card clickable-card" data-id="${p.id}">
                  <div class="product-media">
                    <img src="${mainImg}" alt="${p.nombre}">
                    ${imgs.length > 1 ? `<div class="gallery-count">+${imgs.length - 1} fotos</div>` : ''}
                  </div>
                  <h3>${escape(p.nombre)}</h3>
                  <div class="product-sector">${escape(p.categoria || 'TECNOLOGÍA INDUSTRIAL')}</div>
                  <p style="font-size: 0.95rem; color: var(--text-muted); margin: 1rem 0; height: 3em; overflow: hidden">${escape(p.descripcion || '')}</p>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; margin-bottom: 2rem">
                    <div class="price-tag" style="font-size: 1.5rem">$${p.precio.toFixed(2)}</div>
                    <span class="stock-badge ${isOut ? 'empty' : ''}">${isOut ? 'Agotado' : `Stock: ${p.stock}`}</span>
                  </div>
                  <button class="btn-primary buy-now-btn ${isOut ? 'disabled-style' : ''}" 
                          data-id="${p.id}" data-name="${escape(p.nombre)}" data-price="${p.precio}" data-stock="${p.stock}">
                    Comprar ahora
                  </button>
                </div>
              `;
      }).join('')}
        </div>
      `;
    },
    afterRender: () => {
      const search = document.getElementById('catalogSearch');
      const grid = document.getElementById('catalogGrid');

      const filterProds = () => {
        const query = search.value.toLowerCase();
        const cards = grid.querySelectorAll('.product-card');
        cards.forEach(card => {
          const text = card.innerText.toLowerCase();
          const id = card.getAttribute('data-id');
          card.style.display = text.includes(query) ? 'flex' : 'none';
        });
      };
      search.oninput = filterProds;

      // Product Detail Navigation
      document.querySelectorAll('.clickable-card').forEach(card => {
        card.onclick = (e) => {
          if (e.target.closest('.buy-now-btn')) return; // Don't trigger if buying
          window.navigate('product_detail', card.getAttribute('data-id'));
        };
      });
      // Buy Now Buttons
      document.querySelectorAll('.buy-now-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          window.buyProduct(btn.dataset.id, btn.dataset.name, btn.dataset.price, Number(btn.dataset.stock));
        };
      });
    }
  },

  cliente_orders: {
    title: 'Mis Compras',
    render: async () => {
      // Use client-specific endpoint for data privacy
      const ventas = await fetch(`${API_URL}/ventas/cliente/${user.cliente_id}`).then(r => r.json());
      if (ventas.length === 0) return `<div class="card"><p style="color: var(--text-muted); text-align: center; padding: 3rem">No has realizado ninguna compra aún.</p></div>`;
      return `
        <div class="card">
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Ticket</th><th>Producto</th><th>Cantidad</th><th>Importe</th><th>Fecha</th><th>Estado</th><th>Acción</th></tr></thead>
              <tbody>
                ${ventas.map(v => {
                  const isCancelled = v.estado === 'Cancelada';
                  return `
                  <tr class="${isCancelled ? 'venta-cancelada' : ''}">
                    <td>#${v.id}</td>
                    <td><strong>${escape(v.producto_nombre)}</strong></td>
                    <td>${v.cantidad}</td>
                    <td class="price-tag">$${v.total.toFixed(2)}</td>
                    <td>${new Date(v.fecha_venta).toLocaleDateString()}</td>
                    <td>${isCancelled 
                      ? '<span class="status-cancelado">❌ CANCELADO</span>' 
                      : '<span class="status-completado">✅ COMPLETADO</span>'}</td>
                    <td>${!isCancelled 
                      ? `<button class="btn-cancel-venta" data-id="${v.id}" data-nombre="${escape(v.producto_nombre)}" data-total="${v.total.toFixed(2)}">Cancelar pedido</button>` 
                      : '<span style="font-size:0.75rem;color:var(--text-muted)">Devuelto</span>'}</td>
                  </tr>
                `}).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    },
    afterRender: () => {
      document.querySelectorAll('.btn-cancel-venta').forEach(btn => {
        btn.onclick = async () => {
          const nombre = btn.dataset.nombre;
          const total = btn.dataset.total;
          if (!confirm(`¿Estás seguro de cancelar el pedido de "${nombre}"?\n\nSe te devolverán $${total} y el stock será repuesto.\n\nSi hay una instalación asociada, también será cancelada.\n\nEsta acción no se puede deshacer.`)) return;
          try {
            const res = await fetch(`${API_URL}/ventas/${btn.dataset.id}/cancelar`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
              const data = await res.json();
              showToast(`✅ Pedido cancelado. Devolución: $${data.total_devuelto?.toFixed(2) || total}`, 'success');
              navigate('cliente_orders');
            } else {
              const err = await res.json();
              showToast(err.error || 'Error al cancelar', 'error');
            }
          } catch (e) { showToast('Error de conexión', 'error'); }
        };
      });
    }
  },

  product_detail: {
    title: 'Detalle del Producto',
    render: async (id) => {
      const p = await fetch(`${API_URL}/productos/${id}`).then(r => r.json());
      const imgs = JSON.parse(p.imagenes_json || '[]');
      const mainImg = imgs.length > 0 ? imgs[0] : 'https://placehold.co/800x800/1e293b/0ea5e9?text=Sin+Imagen';
      const isOut = p.stock <= 0;

      return `
        <div class="product-detail-layout">
          <div class="detail-media-panel">
            <div class="main-display-card card">
               <img src="${mainImg}" class="detail-main-img" id="detailMainImg" data-imgs='${JSON.stringify(imgs).replace(/'/g, "&apos;")}'>
               <div class="thumb-strip">
                 ${imgs.map((img, i) => `
                   <img src="${img}" class="thumb-item" data-src="${img}">
                 `).join('')}
               </div>
            </div>
          </div>
          <div class="detail-info-panel">
            <div class="card" style="height: 100%">
              <div class="detail-header">
                <button class="btn-back" id="btnBackToCatalog">← Volver al Catálogo</button>
                <div style="display: flex; flex-direction: column; align-items: flex-end">
                    <span class="category-pill">${escape(p.categoria || 'Industrial')}</span>
                    <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 5px">SKU: ${escape(p.sku || 'N/A')}</span>
                </div>
              </div>
              <h1 class="detail-title">${escape(p.nombre)}</h1>
              
              <div class="specs-box card-inner">
                <label>ESPECIFICACIONES TÉCNICAS</label>
                <p>${escape(p.especificaciones || 'No hay especificaciones técnicas disponibles para este modelo.')}</p>
              </div>

              <div class="price-strip">
                <span class="detail-price">$${p.precio.toFixed(2)}</span>
                <span class="stock-badge ${isOut ? 'empty' : ''}">${isOut ? 'FUERA DE STOCK' : `STOCK DISPONIBLE: ${p.stock}`}</span>
              </div>
              <div class="detail-description">
                <h3>Información General</h3>
                <p>${escape(p.descripcion || 'Sin descripción técnica disponible para este modelo.')}</p>
              </div>
              <div class="detail-actions">
                <div style="display: flex; gap: 1rem; align-items: center">
                   <div class="qty-control">
                      <button class="qty-btn" id="qtyMinus">-</button>
                      <span class="qty-val" id="qtyDisplay">1</span>
                      <button class="qty-btn" id="qtyPlus">+</button>
                   </div>
                    <button class="btn-primary buy-now-btn" id="btnAddToCart" style="flex: 1">
                       🛒 Añadir al Carrito
                    </button>
                </div>
                <div class="guarantee-box">
                  <span>🛡️ Garantía AY GABZ de 1 año</span>
                  <span>🚚 Envío express nacional</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    },
    afterRender: (id) => {
      // Back button
      const backBtn = document.getElementById('btnBackToCatalog');
      if (backBtn) backBtn.onclick = () => window.navigate('cliente_catalog');

      // Add to Cart
      let currentQty = 1;
      const qtyDisplay = document.getElementById('qtyDisplay');
      const minus = document.getElementById('qtyMinus');
      const plus = document.getElementById('qtyPlus');

      if (minus) minus.onclick = () => { if (currentQty > 1) { currentQty--; qtyDisplay.textContent = currentQty; } };
      if (plus) plus.onclick = () => { currentQty++; qtyDisplay.textContent = currentQty; };

      const addBtn = document.getElementById('btnAddToCart');
      if (addBtn) {
        addBtn.onclick = async () => {
          const p = await fetch(`${API_URL}/productos/${id}`).then(r => r.json());
          window.addToCart(p, currentQty);
        };
      }

      // Main image lightbox
      const mainImg = document.getElementById('detailMainImg');
      if (mainImg) {
        const imgs = JSON.parse(mainImg.getAttribute('data-imgs') || '[]');
        mainImg.onclick = () => window.openLightbox(imgs, 0);
      }

      // Thumbnails
      document.querySelectorAll('.thumb-item').forEach(thumb => {
        thumb.onclick = () => {
          const main = document.getElementById('detailMainImg');
          if (main) main.src = thumb.getAttribute('data-src');
        };
      });
    }
  },

  // --- TÉCNICO VIEWS ---
  tecnico_calendario: {
    title: 'Mi Calendario de Instalaciones',
    render: async () => {
      return `
        <div class="calendar-container" id="tecCalendar"></div>
        <div class="card" style="margin-top: 2rem" id="dayDetail">
          <h3 style="color: var(--text-muted)">Selecciona un día para ver las instalaciones</h3>
        </div>
      `;
    },
    afterRender: async () => {
      const tecnico = await fetch(`${API_URL}/instalaciones/tecnico/${user.tecnico_id}`).then(r => r.json());
      window._tecInstalaciones = tecnico;
      window._calMonth = new Date().getMonth();
      window._calYear = new Date().getFullYear();
      window.renderTecCalendar();
    }
  },

  tecnico_lista: {
    title: 'Mis Instalaciones',
    render: async () => {
      const instalaciones = await fetch(`${API_URL}/instalaciones/tecnico/${user.tecnico_id}`).then(r => r.json());
      const counts = { Todas: instalaciones.length, Pendiente: 0, Realizada: 0, Cancelada: 0, Reprogramada: 0 };
      instalaciones.forEach(i => { if (counts[i.estado] !== undefined) counts[i.estado]++; });

      return `
        <div class="filter-tabs" id="installFilterTabs">
          ${Object.entries(counts).map(([k, v]) => `<button class="filter-tab ${k === 'Todas' ? 'active' : ''}" data-filter="${k}">${k} (${v})</button>`).join('')}
        </div>
        <div id="installList">
          ${instalaciones.map(i => window.renderInstallCard(i, true)).join('')}
          ${instalaciones.length === 0 ? '<div class="card"><p style="text-align:center;color:var(--text-muted);padding:2rem">No tienes instalaciones asignadas aún.</p></div>' : ''}
        </div>
      `;
    },
    afterRender: () => {
      document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.onclick = () => {
          document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          const filter = tab.dataset.filter;
          document.querySelectorAll('.install-card').forEach(card => {
            card.style.display = filter === 'Todas' || card.dataset.estado === filter ? 'block' : 'none';
          });
        };
      });
      window.bindInstallActions();
    }
  },

  // --- CLIENTE INSTALACIONES VIEW ---
  cliente_instalaciones: {
    title: 'Mis Instalaciones',
    render: async () => {
      const instalaciones = await fetch(`${API_URL}/instalaciones/cliente/${user.cliente_id}`).then(r => r.json());
      // Load notifications for client
      let notifs = [];
      try { notifs = await fetch(`${API_URL}/notificaciones/${user.id}`).then(r => r.json()); } catch (e) { }
      const pendingNotifs = notifs.filter(n => n.estado === 'Pendiente' || !n.leida);

      let notifsHtml = '';
      if (pendingNotifs.length > 0) {
        notifsHtml = `<div class="card" style="margin-bottom:1.5rem">
          <h3 style="margin-bottom:1rem">🔔 Notificaciones</h3>
          ${pendingNotifs.map(n => `
            <div class="notif-card ${n.leida ? '' : 'unread'}">
              <div class="notif-header"><span>${n.emisor_nombre || 'Sistema'}</span><span>${new Date(n.fecha_creacion).toLocaleString('es-MX')}</span></div>
              <div class="notif-body">${escape(n.mensaje)}</div>
              ${n.tipo === 'respuesta_tecnico' && n.mensaje.includes('❌') ? `
                <div class="notif-actions">
                  <button class="notif-btn notif-btn-accept btn-client-retry" data-inst-id="${n.instalacion_id}">📅 Elegir otra fecha</button>
                  <button class="notif-btn notif-btn-reject btn-client-cancel-notif" data-inst-id="${n.instalacion_id}">❌ Cancelar instalación</button>
                </div>
              ` : ''}
              ${!n.leida ? `<button class="notif-btn notif-btn-secondary btn-mark-read" data-id="${n.id}" style="margin-top:0.5rem">Marcar como leída</button>` : ''}
            </div>
          `).join('')}
        </div>`;
      }

      if (instalaciones.length === 0 && pendingNotifs.length === 0) return `<div class="card"><p style="color: var(--text-muted); text-align: center; padding: 3rem">No tienes instalaciones programadas.</p></div>`;
      return `
        ${notifsHtml}
        <div id="clientInstList">
          ${instalaciones.map(i => {
        const canAct = i.estado === 'Pendiente' || i.estado === 'Reprogramada';
        return `
            <div class="install-card card-${i.estado.toLowerCase()}" data-estado="${i.estado}">
              <div class="install-card-header">
                <strong style="font-size:1.1rem">${escape(i.producto_nombre)}</strong>
                <span class="status-badge status-${i.estado.toLowerCase()}">${i.estado === 'Realizada' ? '✅ ' : i.estado === 'Cancelada' ? '❌ ' : i.estado === 'Reprogramada' ? '📅 ' : '🕐 '}${i.estado}</span>
              </div>
              <div class="install-card-body">
                <div><span class="field-label">Fecha</span><div class="field-value">${new Date(i.fecha_instalacion).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div></div>
                <div><span class="field-label">Hora</span><div class="field-value">${i.hora_instalacion}</div></div>
                <div><span class="field-label">Técnico</span><div class="field-value">${escape(i.tecnico_nombre || 'Por asignar')}</div></div>
                <div><span class="field-label">Dirección</span><div class="field-value">${escape(i.direccion || 'N/A')}</div></div>
              </div>
              ${canAct ? `
              <div class="install-client-actions">
                <button class="install-action-btn btn-reschedule btn-client-reschedule" data-id="${i.id}" data-nombre="${escape(i.producto_nombre)}">📅 Cambiar fecha/hora</button>
                <button class="install-action-btn btn-cancel-inst btn-client-cancel" data-id="${i.id}">❌ Cancelar instalación</button>
                ${i.tecnico_nombre ? `<button class="btn-chat-install btn-chat-tecnico" data-inst-id="${i.id}" data-tec-uid="${i.tecnico_usuario_id || ''}">💬 Chat con técnico</button>` : ''}
              </div>
              ` : ''}
              ${i.estado !== 'Cancelada' && i.tecnico_nombre && !canAct ? `
              <div class="install-client-actions">
                <button class="btn-chat-install btn-chat-tecnico" data-inst-id="${i.id}" data-tec-uid="${i.tecnico_usuario_id || ''}">💬 Chat con técnico</button>
              </div>
              ` : ''}
            </div>`;
      }).join('')}
        </div>
      `;
    },
    afterRender: () => {
      // Reschedule buttons
      document.querySelectorAll('.btn-client-reschedule').forEach(btn => {
        btn.onclick = () => window.openClientRescheduleModal(btn.dataset.id, btn.dataset.nombre);
      });
      // Cancel buttons
      document.querySelectorAll('.btn-client-cancel').forEach(btn => {
        btn.onclick = async () => {
          if (confirm('¿Estás seguro de cancelar esta instalación? Esta acción no se puede deshacer.')) {
            const res = await fetch(`${API_URL}/instalaciones/${btn.dataset.id}/cancelar-cliente`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emisor_id: user.id }) });
            if (res.ok) { showToast('Instalación cancelada', 'success'); navigate('cliente_instalaciones'); }
            else showToast('Error al cancelar', 'error');
          }
        };
      });
      // Retry reschedule from notification
      document.querySelectorAll('.btn-client-retry').forEach(btn => {
        btn.onclick = () => window.openClientRescheduleModal(btn.dataset.instId, '');
      });
      // Cancel from notification
      document.querySelectorAll('.btn-client-cancel-notif').forEach(btn => {
        btn.onclick = async () => {
          if (confirm('¿Cancelar esta instalación?')) {
            await fetch(`${API_URL}/instalaciones/${btn.dataset.instId}/cancelar-cliente`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emisor_id: user.id }) });
            showToast('Instalación cancelada', 'success');
            navigate('cliente_instalaciones');
          }
        };
      });
      // Mark notification as read
      document.querySelectorAll('.btn-mark-read').forEach(btn => {
        btn.onclick = async () => {
          await fetch(`${API_URL}/notificaciones/${btn.dataset.id}/leida`, { method: 'PUT' });
          navigate('cliente_instalaciones');
        };
      });
      // Chat with technician
      document.querySelectorAll('.btn-chat-tecnico').forEach(btn => {
        btn.onclick = () => {
          const instId = parseInt(btn.dataset.instId);
          const tecUid = parseInt(btn.dataset.tecUid);
          if (tecUid) window.startChatWithTecnico(instId, tecUid);
          else showToast('No hay técnico asignado aún', 'error');
        };
      });
    }
  },

  // --- TECNICO NOTIFICACIONES VIEW ---
  tecnico_notificaciones: {
    title: 'Mis Notificaciones',
    render: async () => {
      let notifs = [];
      try { notifs = await fetch(`${API_URL}/notificaciones/${user.id}`).then(r => r.json()); } catch (e) { }

      if (notifs.length === 0) return `<div class="card"><p style="color: var(--text-muted); text-align: center; padding: 3rem">No tienes notificaciones.</p></div>`;

      return `
        <div id="tecNotifList">
          ${notifs.map(n => `
            <div class="notif-card ${n.leida ? '' : 'unread'}">
              <div class="notif-header">
                <span>De: ${n.emisor_nombre || 'Sistema'}</span>
                <span>${new Date(n.fecha_creacion).toLocaleString('es-MX')}</span>
              </div>
              <div class="notif-body">
                <p>${escape(n.mensaje)}</p>
                ${n.instalacion_id ? `<p style="font-size:0.85rem;color:var(--text-muted);margin-top:0.3rem">Instalación: ${escape(n.producto_nombre)}</p>` : ''}
              </div>
              
              ${n.tipo === 'solicitud_reprogramacion' && n.estado === 'Pendiente' ? `
                <div class="notif-actions">
                  <button class="notif-btn notif-btn-accept btn-tec-action" data-id="${n.id}" data-inst="${n.instalacion_id}" data-fecha="${n.nueva_fecha || ''}" data-hora="${n.nueva_hora || ''}" data-tipo="${n.tipo}" data-estado="Aceptada">✅ Aceptar cambio</button>
                  <button class="notif-btn notif-btn-reject btn-tec-action" data-id="${n.id}" data-inst="${n.instalacion_id}" data-fecha="${n.nueva_fecha || ''}" data-hora="${n.nueva_hora || ''}" data-tipo="${n.tipo}" data-estado="Rechazada">❌ No puedo ese día</button>
                </div>
              ` : ''}

              ${(n.tipo === 'reasignacion' || n.tipo === 'nueva_instalacion') && n.estado === 'Pendiente' ? `
                <div class="notif-actions">
                  <button class="notif-btn notif-btn-accept btn-tec-action" data-id="${n.id}" data-inst="${n.instalacion_id}" data-fecha="${n.nueva_fecha || ''}" data-hora="${n.nueva_hora || ''}" data-tipo="${n.tipo}" data-estado="Aceptada">✅ Aceptar instalación</button>
                  <button class="notif-btn notif-btn-reject btn-tec-action" data-id="${n.id}" data-inst="${n.instalacion_id}" data-fecha="${n.nueva_fecha || ''}" data-hora="${n.nueva_hora || ''}" data-tipo="${n.tipo}" data-estado="Rechazada">❌ Rechazar</button>
                </div>
              ` : ''}

              ${!n.leida && n.tipo !== 'solicitud_reprogramacion' && n.tipo !== 'reasignacion' && n.tipo !== 'nueva_instalacion' ? `
                <button class="notif-btn notif-btn-secondary btn-mark-read-tec" data-id="${n.id}" style="margin-top:0.5rem">Marcar como leída</button>
              ` : ''}
              
              ${n.estado !== 'Pendiente' && (n.tipo === 'solicitud_reprogramacion' || n.tipo === 'reasignacion' || n.tipo === 'nueva_instalacion') ? `
                <span style="font-size:0.8rem; font-weight:bold; color: var(--text-muted);">
                  Estado: ${n.estado === 'Aceptada' ? '✅ Aceptada' : (n.estado === 'Atendida' ? '⚠️ Tomada por otro técnico' : '❌ Rechazada')}
                </span>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `;
    },
    afterRender: () => {
      // Respond to all actionable notifications (reschedules, reassignments, new installations)
      document.querySelectorAll('.btn-tec-action').forEach(btn => {
        btn.onclick = async () => {
          const estado = btn.dataset.estado;
          const tipo = btn.dataset.tipo;
          let msg = '';
          if (estado === 'Aceptada') {
            msg = tipo === 'solicitud_reprogramacion' ? '¿Aceptar esta solicitud y reprogramar la instalación?' : '¿Aceptar esta instalación y agregarla a tu calendario?';
          } else {
            msg = '¿Estás seguro de rechazar esta solicitud?';
          }

          if (confirm(msg)) {
            const res = await fetch(`${API_URL}/notificaciones/${btn.dataset.id}/responder`, {
              method: 'PUT', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                estado,
                instalacion_id: btn.dataset.inst,
                nueva_fecha: btn.dataset.fecha || null,
                nueva_hora: btn.dataset.hora || null,
                tipo,
                tecnico_usuario_id: user.id,
                tecnico_id: user.tecnico_id
              })
            });
            if (res.ok) {
              const data = await res.json();
              if (data.success === false && data.error === 'already_taken') {
                showToast(data.message || 'La instalación ya fue tomada por otro técnico.', 'warning');
              } else if (data.resultado === 'aceptada') {
                showToast('¡Instalación aceptada y agregada a tu calendario!', 'success');
              } else if (data.resultado === 'reasignado') {
                showToast(`Solicitud rechazada. Reasignada a ${data.notificados} técnico(s) más.`, 'info');
              } else if (data.resultado === 'sin_disponibilidad') {
                showToast('Solicitud rechazada. No hay técnicos disponibles, el cliente fue notificado.', 'warning');
              } else if (data.resultado === 'rechazada') {
                showToast('Instalación rechazada.', 'info');
              }

              navigate('tecnico_notificaciones');
              window.updateNotifBadge();
            } else {
              showToast('Error al procesar solicitud', 'error');
            }
          }
        };
      });

      // Mark generic notification as read
      document.querySelectorAll('.btn-mark-read-tec').forEach(btn => {
        btn.onclick = async () => {
          await fetch(`${API_URL}/notificaciones/${btn.dataset.id}/leida`, { method: 'PUT' });
          navigate('tecnico_notificaciones');
          window.updateNotifBadge();
        };
      });
    }
  },

  // --- CHAT VIEWS ---
  cliente_soporte: {
    title: '💬 Soporte',
    render: async () => {
      const chats = await fetch(`${API_URL}/chats/${user.id}`).then(r => r.json());
      const myChats = chats.filter(c => c.mi_estado !== 'eliminado');
      // Get installations that might be overdue for complaint button
      let instalaciones = [];
      try { instalaciones = await fetch(`${API_URL}/instalaciones/cliente/${user.cliente_id}`).then(r => r.json()); } catch(e) {}
      const overdue = instalaciones.filter(i => (i.estado === 'Pendiente' || i.estado === 'Reprogramada') && new Date(i.fecha_instalacion) < new Date());

      return `
        ${overdue.length > 0 ? `
        <div class="card" style="margin-bottom:1.5rem;border-color:rgba(239,68,68,0.3)">
          <h3 style="color:#f87171;margin-bottom:1rem">⚠️ Instalaciones pendientes vencidas</h3>
          <p style="color:var(--text-muted);margin-bottom:1rem;font-size:0.9rem">Las siguientes instalaciones no se realizaron en la fecha programada. Puedes contactar al administrador para pedir una explicación.</p>
          ${overdue.map(i => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:0.8rem;background:rgba(239,68,68,0.06);border-radius:10px;margin-bottom:0.5rem">
              <div>
                <strong>${escape(i.producto_nombre)}</strong>
                <div style="font-size:0.8rem;color:var(--text-muted)">Fecha: ${new Date(i.fecha_instalacion).toLocaleDateString('es-MX')} — ${i.hora_instalacion}</div>
              </div>
              <button class="btn-chat-install btn-report-overdue" data-inst-id="${i.id}" data-producto="${escape(i.producto_nombre)}" data-fecha="${i.fecha_instalacion}">📩 Reportar al Admin</button>
            </div>
          `).join('')}
        </div>
        ` : ''}

        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
            <h2>Mis Conversaciones</h2>
            <button class="btn-primary" style="width:auto;padding:0.6rem 1.2rem" id="btnNewChatAdmin">💬 Nuevo mensaje al Admin</button>
          </div>
          ${myChats.length === 0 ? `
            <div class="chat-empty">
              <div class="chat-empty-icon">💬</div>
              <h3>Sin conversaciones</h3>
              <p>Inicia una conversación con el administrador o un técnico.</p>
            </div>
          ` : `
            <div class="chat-list">
              ${myChats.map(c => {
                const otherName = c.usuario1_id === user.id ? c.nombre_u2 : c.nombre_u1;
                const otherRole = c.usuario1_id === user.id ? c.rol_u2 : c.rol_u1;
                const avatarClass = otherRole === 'Admin' ? 'admin-avatar' : 'tecnico-avatar';
                return `
                <div class="chat-list-item ${c.no_leidos > 0 ? 'has-unread' : ''}" data-chat-id="${c.id}">
                  <div class="chat-avatar ${avatarClass}">${(otherName || 'U')[0]}</div>
                  <div class="chat-item-info">
                    <div class="chat-item-name">${escape(otherName)} <span style="font-size:0.7rem;color:var(--text-muted)">(${otherRole})</span></div>
                    <div class="chat-item-preview">${c.inst_producto ? '🔧 ' + escape(c.inst_producto) + ' — ' : ''}${escape(c.ultimo_msg || 'Sin mensajes')}</div>
                  </div>
                  <div class="chat-item-meta">
                    <span class="chat-item-time">${new Date(c.ultimo_mensaje).toLocaleDateString('es-MX')}</span>
                    ${c.no_leidos > 0 ? `<span class="chat-unread-badge">${c.no_leidos}</span>` : ''}
                  </div>
                </div>`;
              }).join('')}
            </div>
          `}
        </div>
      `;
    },
    afterRender: () => {
      document.querySelectorAll('.chat-list-item').forEach(item => {
        item.onclick = () => navigate('chat_view', item.dataset.chatId);
      });
      const btnNew = document.getElementById('btnNewChatAdmin');
      if (btnNew) btnNew.onclick = () => window.startChatWithAdmin();
      document.querySelectorAll('.btn-report-overdue').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          window.reportOverdueToAdmin(btn.dataset.instId, btn.dataset.producto, btn.dataset.fecha);
        };
      });
    }
  },

  admin_chats: {
    title: '💬 Mensajes',
    render: async () => {
      const chats = await fetch(`${API_URL}/chats/${user.id}`).then(r => r.json());
      const activos = chats.filter(c => c.mi_estado === 'activo');
      const silenciados = chats.filter(c => c.mi_estado === 'silenciado');
      const archivados = chats.filter(c => c.mi_estado === 'archivado');

      const renderList = (list, showActions = true) => list.length === 0 
        ? '<p style="color:var(--text-muted);text-align:center;padding:1rem">No hay conversaciones en esta sección.</p>'
        : `<div class="chat-list">${list.map(c => {
          const otherName = c.usuario1_id === user.id ? c.nombre_u2 : c.nombre_u1;
          const otherRole = c.usuario1_id === user.id ? c.rol_u2 : c.rol_u1;
          const avatarClass = otherRole === 'Cliente' ? '' : 'tecnico-avatar';
          const isMuted = c.mi_estado === 'silenciado';
          const isArchived = c.mi_estado === 'archivado';
          return `
          <div class="chat-list-item ${c.no_leidos > 0 ? 'has-unread' : ''} ${isMuted ? 'silenciado' : ''} ${isArchived ? 'archivado' : ''}">
            <div class="chat-avatar ${avatarClass}" style="cursor:pointer" data-chat-id="${c.id}" data-goto="chat">${(otherName || 'U')[0]}</div>
            <div class="chat-item-info" style="cursor:pointer" data-chat-id="${c.id}" data-goto="chat">
              <div class="chat-item-name">${escape(otherName)} <span style="font-size:0.7rem;color:var(--text-muted)">(${otherRole})</span> ${isMuted ? '🔇' : ''}</div>
              <div class="chat-item-preview">${c.inst_producto ? '🔧 ' + escape(c.inst_producto) + ' — ' : ''}${escape(c.ultimo_msg || 'Sin mensajes')}</div>
            </div>
            <div class="chat-item-meta">
              <span class="chat-item-time">${new Date(c.ultimo_mensaje).toLocaleDateString('es-MX')}</span>
              ${c.no_leidos > 0 ? `<span class="chat-unread-badge">${c.no_leidos}</span>` : ''}
            </div>
            ${showActions ? `
            <div class="chat-actions-bar">
              ${isMuted 
                ? `<button class="chat-action-btn btn-mute" data-chat-id="${c.id}" data-action="activo" title="Activar notificaciones">🔔</button>`
                : `<button class="chat-action-btn btn-mute" data-chat-id="${c.id}" data-action="silenciado" title="Silenciar">🔇</button>`
              }
              ${isArchived
                ? `<button class="chat-action-btn btn-archive" data-chat-id="${c.id}" data-action="activo" title="Desarchivar">📤</button>`
                : `<button class="chat-action-btn btn-archive" data-chat-id="${c.id}" data-action="archivado" title="Archivar">📦</button>`
              }
              <button class="chat-action-btn btn-delete-chat" data-chat-id="${c.id}" data-action="eliminado" title="Eliminar">🗑️</button>
            </div>` : ''}
          </div>`;
        }).join('')}</div>`;

      return `
        <div class="card">
          <div class="chat-filter-tabs" id="adminChatFilters">
            <button class="chat-filter-tab active" data-filter="activos">💬 Activos (${activos.length})</button>
            <button class="chat-filter-tab" data-filter="silenciados">🔇 Silenciados (${silenciados.length})</button>
            <button class="chat-filter-tab" data-filter="archivados">📦 Archivados (${archivados.length})</button>
          </div>
          <div id="chatSection_activos">${renderList(activos)}</div>
          <div id="chatSection_silenciados" style="display:none">${renderList(silenciados)}</div>
          <div id="chatSection_archivados" style="display:none">${renderList(archivados)}</div>
        </div>
      `;
    },
    afterRender: () => {
      // Filter tabs
      document.querySelectorAll('.chat-filter-tab').forEach(tab => {
        tab.onclick = () => {
          document.querySelectorAll('.chat-filter-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          document.querySelectorAll('[id^="chatSection_"]').forEach(s => s.style.display = 'none');
          document.getElementById(`chatSection_${tab.dataset.filter}`).style.display = 'block';
        };
      });
      // Navigate to chat
      document.querySelectorAll('[data-goto="chat"]').forEach(el => {
        el.onclick = () => navigate('chat_view', el.dataset.chatId);
      });
      // Chat actions
      document.querySelectorAll('.chat-action-btn').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;
          if (action === 'eliminado' && !confirm('¿Eliminar esta conversación? El otro usuario no lo sabrá.')) return;
          await fetch(`${API_URL}/chats/${btn.dataset.chatId}/estado`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_id: user.id, estado: action })
          });
          showToast(action === 'silenciado' ? '🔇 Chat silenciado' : action === 'archivado' ? '📦 Chat archivado' : action === 'eliminado' ? '🗑️ Chat eliminado' : '✅ Chat activado', 'success');
          navigate('admin_chats');
        };
      });
    }
  },

  tecnico_chats: {
    title: '💬 Mis Chats',
    render: async () => {
      const chats = await fetch(`${API_URL}/chats/${user.id}`).then(r => r.json());
      const myChats = chats.filter(c => c.mi_estado !== 'eliminado');
      const activos = myChats.filter(c => c.mi_estado === 'activo');
      const silenciados = myChats.filter(c => c.mi_estado === 'silenciado');
      const archivados = myChats.filter(c => c.mi_estado === 'archivado');

      const renderList = (list) => list.length === 0
        ? '<p style="color:var(--text-muted);text-align:center;padding:1rem">No hay chats en esta sección.</p>'
        : `<div class="chat-list">${list.map(c => {
          const otherName = c.usuario1_id === user.id ? c.nombre_u2 : c.nombre_u1;
          const otherRole = c.usuario1_id === user.id ? c.rol_u2 : c.rol_u1;
          const avatarClass = otherRole === 'Admin' ? 'admin-avatar' : '';
          const isMuted = c.mi_estado === 'silenciado';
          return `
          <div class="chat-list-item ${c.no_leidos > 0 ? 'has-unread' : ''} ${isMuted ? 'silenciado' : ''}">
            <div class="chat-avatar ${avatarClass}" style="cursor:pointer" data-chat-id="${c.id}" data-goto="chat">${(otherName || 'U')[0]}</div>
            <div class="chat-item-info" style="cursor:pointer" data-chat-id="${c.id}" data-goto="chat">
              <div class="chat-item-name">${escape(otherName)} <span style="font-size:0.7rem;color:var(--text-muted)">(${otherRole})</span> ${isMuted ? '🔇' : ''}</div>
              <div class="chat-item-preview">${c.inst_producto ? '🔧 ' + escape(c.inst_producto) + ' — ' : ''}${escape(c.ultimo_msg || 'Sin mensajes')}</div>
            </div>
            <div class="chat-item-meta">
              <span class="chat-item-time">${new Date(c.ultimo_mensaje).toLocaleDateString('es-MX')}</span>
              ${c.no_leidos > 0 ? `<span class="chat-unread-badge">${c.no_leidos}</span>` : ''}
            </div>
            <div class="chat-actions-bar">
              ${isMuted 
                ? `<button class="chat-action-btn btn-mute" data-chat-id="${c.id}" data-action="activo" title="Activar">🔔</button>`
                : `<button class="chat-action-btn btn-mute" data-chat-id="${c.id}" data-action="silenciado" title="Silenciar">🔇</button>`
              }
              <button class="chat-action-btn btn-archive" data-chat-id="${c.id}" data-action="archivado" title="Archivar">📦</button>
              ${c.inst_estado === 'Realizada' || !c.instalacion_id 
                ? `<button class="chat-action-btn btn-delete-chat" data-chat-id="${c.id}" data-action="eliminado" title="Eliminar">🗑️</button>`
                : ''}
            </div>
          </div>`;
        }).join('')}</div>`;

      return `
        <div class="card">
          <div class="chat-filter-tabs">
            <button class="chat-filter-tab active" data-filter="tec_activos">💬 Activos (${activos.length})</button>
            <button class="chat-filter-tab" data-filter="tec_silenciados">🔇 Silenciados (${silenciados.length})</button>
            <button class="chat-filter-tab" data-filter="tec_archivados">📦 Archivados (${archivados.length})</button>
          </div>
          <div id="chatSection_tec_activos">${renderList(activos)}</div>
          <div id="chatSection_tec_silenciados" style="display:none">${renderList(silenciados)}</div>
          <div id="chatSection_tec_archivados" style="display:none">${renderList(archivados)}</div>
        </div>
      `;
    },
    afterRender: () => {
      document.querySelectorAll('.chat-filter-tab').forEach(tab => {
        tab.onclick = () => {
          document.querySelectorAll('.chat-filter-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          document.querySelectorAll('[id^="chatSection_tec_"]').forEach(s => s.style.display = 'none');
          document.getElementById(`chatSection_${tab.dataset.filter}`).style.display = 'block';
        };
      });
      document.querySelectorAll('[data-goto="chat"]').forEach(el => {
        el.onclick = () => navigate('chat_view', el.dataset.chatId);
      });
      document.querySelectorAll('.chat-action-btn').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;
          if (action === 'eliminado' && !confirm('¿Eliminar este chat?')) return;
          const res = await fetch(`${API_URL}/chats/${btn.dataset.chatId}/estado`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_id: user.id, estado: action })
          });
          if (res.ok) {
            showToast(action === 'silenciado' ? '🔇 Chat silenciado' : action === 'archivado' ? '📦 Chat archivado' : action === 'eliminado' ? '🗑️ Chat eliminado' : '✅ Chat activado', 'success');
            navigate('tecnico_chats');
          } else {
            const err = await res.json();
            showToast(err.error || 'Error', 'error');
          }
        };
      });
    }
  },

  chat_view: {
    title: '',
    render: async (chatId) => {
      const chat = await fetch(`${API_URL}/chats/detail/${chatId}`).then(r => r.json());
      const mensajes = await fetch(`${API_URL}/chats/${chatId}/mensajes`).then(r => r.json());
      // Mark as read
      await fetch(`${API_URL}/chats/${chatId}/leer`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: user.id })
      });
      window.updateChatBadge();

      const otherName = chat.usuario1_id === user.id ? chat.nombre_u2 : chat.nombre_u1;
      const otherRole = chat.usuario1_id === user.id ? chat.rol_u2 : chat.rol_u1;
      const backView = user.rol === 'Admin' ? 'admin_chats' : user.rol === 'Tecnico' ? 'tecnico_chats' : 'cliente_soporte';

      return `
        <div class="chat-container" id="chatContainer" data-chat-id="${chatId}">
          <div class="chat-header">
            <button class="btn-back" id="btnBackChat" style="margin-right:0.5rem">←</button>
            <div class="chat-avatar ${otherRole === 'Admin' ? 'admin-avatar' : otherRole === 'Tecnico' ? 'tecnico-avatar' : ''}">${(otherName || 'U')[0]}</div>
            <div class="chat-header-info">
              <div class="chat-header-name">${escape(otherName)}</div>
              <div class="chat-header-context">${otherRole}${chat.inst_producto ? ' — 🔧 ' + escape(chat.inst_producto) : ''}</div>
            </div>
          </div>
          ${chat.inst_producto ? `
            <div class="chat-context-card">
              📋 Instalación: <strong>${escape(chat.inst_producto)}</strong>
              ${chat.inst_fecha ? ` — Fecha: ${new Date(chat.inst_fecha).toLocaleDateString('es-MX')}` : ''}
              ${chat.inst_estado ? ` — Estado: ${chat.inst_estado}` : ''}
            </div>
          ` : ''}
          <div class="chat-messages" id="chatMessages">
            ${mensajes.length === 0 ? '<div class="chat-system-msg">Inicio de la conversación</div>' : ''}
            ${mensajes.map(m => `
              <div class="chat-msg ${m.emisor_id === user.id ? 'sent' : 'received'}">
                ${m.emisor_id !== user.id ? `<div class="chat-msg-sender">${escape(m.emisor_nombre)}</div>` : ''}
                <div>${escape(m.contenido)}</div>
                <div class="chat-msg-time">${new Date(m.fecha_creacion).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</div>
              </div>
            `).join('')}
          </div>
          <div class="chat-input-bar">
            <input class="chat-input" id="chatInput" placeholder="Escribe un mensaje..." autocomplete="off">
            <button class="chat-send-btn" id="btnSendMsg">➤</button>
          </div>
        </div>
      `;
    },
    afterRender: (chatId) => {
      const backView = user.rol === 'Admin' ? 'admin_chats' : user.rol === 'Tecnico' ? 'tecnico_chats' : 'cliente_soporte';
      document.getElementById('btnBackChat').onclick = () => navigate(backView);

      // Scroll to bottom
      const msgContainer = document.getElementById('chatMessages');
      if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;

      const input = document.getElementById('chatInput');
      const sendBtn = document.getElementById('btnSendMsg');

      const sendMessage = async () => {
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        try {
          await fetch(`${API_URL}/chats/${chatId}/mensajes`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emisor_id: user.id, contenido: text })
          });
          // Add message to UI immediately
          const msgHtml = `<div class="chat-msg sent">
            <div>${escape(text)}</div>
            <div class="chat-msg-time">Ahora</div>
          </div>`;
          msgContainer.insertAdjacentHTML('beforeend', msgHtml);
          msgContainer.scrollTop = msgContainer.scrollHeight;
        } catch(e) { showToast('Error al enviar mensaje', 'error'); }
      };

      if (sendBtn) sendBtn.onclick = sendMessage;
      if (input) input.onkeydown = (e) => { if (e.key === 'Enter') sendMessage(); };

      // Auto-refresh messages every 5 seconds
      window._chatRefreshInterval = setInterval(async () => {
        try {
          const msgs = await fetch(`${API_URL}/chats/${chatId}/mensajes`).then(r => r.json());
          const container = document.getElementById('chatMessages');
          if (!container) { clearInterval(window._chatRefreshInterval); return; }
          const currentCount = container.querySelectorAll('.chat-msg').length;
          if (msgs.length > currentCount) {
            // New messages arrived
            const newMsgs = msgs.slice(currentCount);
            newMsgs.forEach(m => {
              if (m.emisor_id !== user.id) {
                container.insertAdjacentHTML('beforeend', `
                  <div class="chat-msg received">
                    <div class="chat-msg-sender">${escape(m.emisor_nombre)}</div>
                    <div>${escape(m.contenido)}</div>
                    <div class="chat-msg-time">${new Date(m.fecha_creacion).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</div>
                  </div>
                `);
              }
            });
            container.scrollTop = container.scrollHeight;
            // Mark as read
            await fetch(`${API_URL}/chats/${chatId}/leer`, {
              method: 'PUT', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ usuario_id: user.id })
            });
          }
        } catch(e) {}
      }, 5000);
    }
  }
};

// --- CALENDAR RENDERING ENGINE ---
window.renderTecCalendar = () => {
  const container = document.getElementById('tecCalendar');
  if (!container) return;
  const month = window._calMonth;
  const year = window._calYear;
  const instalaciones = window._tecInstalaciones || [];
  const today = new Date();
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map installations to days
  const dayMap = {};
  instalaciones.forEach(inst => {
    const d = new Date(inst.fecha_instalacion);
    if (d.getMonth() === month && d.getFullYear() === year) {
      const day = d.getDate();
      if (!dayMap[day]) dayMap[day] = [];
      dayMap[day].push(inst);
    }
  });

  let html = `
    <div class="calendar-header">
      <h2>${monthNames[month]} ${year}</h2>
      <div class="calendar-nav">
        <button id="calPrev">‹</button>
        <button id="calNext">›</button>
      </div>
    </div>
    <div class="calendar-grid">
      ${dayNames.map(d => `<div class="calendar-day-header">${d}</div>`).join('')}
  `;

  for (let i = 0; i < firstDay; i++) html += `<div class="calendar-day empty"></div>`;
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const dayInsts = dayMap[day] || [];
    const dots = dayInsts.map(inst => `<span class="cal-dot dot-${inst.estado.toLowerCase()}"></span>`).join('');
    html += `<div class="calendar-day ${isToday ? 'today' : ''}" data-day="${day}">
      <span>${day}</span>
      ${dots ? `<div class="calendar-dots">${dots}</div>` : ''}
    </div>`;
  }
  html += `</div>`;
  container.innerHTML = html;

  document.getElementById('calPrev').onclick = () => { window._calMonth--; if (window._calMonth < 0) { window._calMonth = 11; window._calYear--; } window.renderTecCalendar(); };
  document.getElementById('calNext').onclick = () => { window._calMonth++; if (window._calMonth > 11) { window._calMonth = 0; window._calYear++; } window.renderTecCalendar(); };

  container.querySelectorAll('.calendar-day:not(.empty)').forEach(el => {
    el.onclick = () => {
      container.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
      el.classList.add('selected');
      const day = parseInt(el.dataset.day);
      const dayInsts = dayMap[day] || [];
      const detail = document.getElementById('dayDetail');
      if (dayInsts.length === 0) {
        detail.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:1rem">Sin instalaciones para el ${day} de ${monthNames[month]}</p>`;
      } else {
        detail.innerHTML = `<h3 style="margin-bottom:1.5rem">${day} de ${monthNames[month]} — ${dayInsts.length} instalación(es)</h3>` + dayInsts.map(i => window.renderInstallCard(i, true)).join('');
        window.bindInstallActions();
      }
    };
  });
};

window.renderInstallCard = (i, withActions = false) => {
  const estadoLower = i.estado.toLowerCase();
  const icon = i.estado === 'Realizada' ? '✅' : i.estado === 'Cancelada' ? '❌' : i.estado === 'Reprogramada' ? '📅' : '🕐';
  let actions = '';
  if (withActions && i.estado !== 'Realizada' && i.estado !== 'Cancelada') {
    actions = `<div class="install-card-actions">
      <button class="install-action-btn btn-complete" data-id="${i.id}" data-action="Realizada">✅ Marcar Realizada</button>
      <button class="install-action-btn btn-cancel" data-id="${i.id}" data-action="Cancelada">❌ Cancelar</button>
      <button class="install-action-btn btn-reschedule" data-id="${i.id}" data-action="reprogramar">📅 Reprogramar</button>
    </div>`;
  }
  return `
    <div class="install-card card-${estadoLower}" data-estado="${i.estado}">
      <div class="install-card-header">
        <strong style="font-size:1.1rem">${escape(i.producto_nombre)}</strong>
        <span class="status-badge status-${estadoLower}">${icon} ${i.estado}</span>
      </div>
      <div class="install-card-body">
        <div><span class="field-label">Cliente</span><div class="field-value">${escape(i.cliente_nombre || 'N/A')}</div></div>
        <div><span class="field-label">Fecha</span><div class="field-value">${new Date(i.fecha_instalacion).toLocaleDateString('es-MX')}</div></div>
        <div><span class="field-label">Hora</span><div class="field-value">${i.hora_instalacion}</div></div>
        <div><span class="field-label">Dirección</span><div class="field-value">${escape(i.direccion || i.cliente_direccion || 'N/A')}</div></div>
      </div>
      ${actions}
    </div>`;
};

window.bindInstallActions = () => {
  document.querySelectorAll('.install-action-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if (action === 'reprogramar') {
        window.openReprogramarModal(id);
      } else {
        if (!confirm(`¿Confirmas cambiar el estado a "${action}"?`)) return;
        const res = await fetch(`${API_URL}/instalaciones/${id}/estado`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: action })
        });
        if (res.ok) {
          showToast(`Instalación marcada como ${action}`, 'success');
          window._tecInstalaciones = await fetch(`${API_URL}/instalaciones/tecnico/${user.tecnico_id}`).then(r => r.json());
          window.renderTecCalendar();
          navigate(window.location.hash?.includes('lista') ? 'tecnico_lista' : 'tecnico_calendario');
        }
      }
    };
  });
};

window.openReprogramarModal = (id) => {
  const modal = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  content.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem">
      <h2>📅 Reprogramar Instalación</h2>
      <button class="action-btn btn-close-modal">✕</button>
    </div>
    <div class="form-group">
      <label>Nueva Fecha</label>
      <input type="date" id="reprFecha" min="${new Date().toISOString().split('T')[0]}">
    </div>
    <div class="form-group">
      <label>Nuevo Horario</label>
      <select id="reprHora">
        <option value="10:00">10:00 AM</option><option value="11:00">11:00 AM</option>
        <option value="12:00">12:00 PM</option><option value="13:00">1:00 PM</option>
        <option value="14:00">2:00 PM</option><option value="15:00">3:00 PM</option>
        <option value="16:00">4:00 PM</option><option value="17:00">5:00 PM</option>
        <option value="18:00">6:00 PM</option>
      </select>
    </div>
    <button class="btn-primary" id="btnConfirmRepr">Confirmar Reprogramación</button>
  `;
  modal.classList.add('active');
  content.querySelector('.btn-close-modal').onclick = window.closeModal;
  document.getElementById('btnConfirmRepr').onclick = async () => {
    const fecha = document.getElementById('reprFecha').value;
    const hora = document.getElementById('reprHora').value;
    if (!fecha) { showToast('Selecciona una fecha', 'error'); return; }
    const res = await fetch(`${API_URL}/instalaciones/${id}/reprogramar`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha_instalacion: fecha, hora_instalacion: hora })
    });
    if (res.ok) {
      showToast('Instalación reprogramada exitosamente', 'success');
      window.closeModal();
      window._tecInstalaciones = await fetch(`${API_URL}/instalaciones/tecnico/${user.tecnico_id}`).then(r => r.json());
      window.renderTecCalendar();
    }
  };
};

// Client reschedule request (sends notification to technician)
window.openClientRescheduleModal = (instalacionId, productoNombre) => {
  const modal = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  content.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem">
      <h2>📅 Cambiar Fecha de Instalación</h2>
      <button class="action-btn btn-close-modal">✕</button>
    </div>
    ${productoNombre ? `<p style="color:var(--text-muted);margin-bottom:1rem">Producto: <strong>${productoNombre}</strong></p>` : ''}
    <p style="color:var(--text-muted);margin-bottom:1.5rem;font-size:0.9rem">Tu solicitud será enviada al técnico asignado para su aprobación.</p>
    <div class="form-group">
      <label>Nueva Fecha</label>
      <input type="date" id="clientReprFecha" min="${new Date(Date.now() + 86400000).toISOString().split('T')[0]}">
    </div>
    <div class="form-group">
      <label>Nuevo Horario</label>
      <select id="clientReprHora">
        <option value="10:00">10:00 AM</option><option value="11:00">11:00 AM</option>
        <option value="12:00">12:00 PM</option><option value="13:00">1:00 PM</option>
        <option value="14:00">2:00 PM</option><option value="15:00">3:00 PM</option>
        <option value="16:00">4:00 PM</option><option value="17:00">5:00 PM</option>
        <option value="18:00">6:00 PM</option>
      </select>
    </div>
    <button class="btn-primary" id="btnSendReschedule" style="width:100%">Enviar Solicitud de Cambio</button>
  `;
  modal.classList.add('active');
  content.querySelector('.btn-close-modal').onclick = window.closeModal;
  document.getElementById('btnSendReschedule').onclick = async () => {
    const fecha = document.getElementById('clientReprFecha').value;
    const hora = document.getElementById('clientReprHora').value;
    if (!fecha) { showToast('Selecciona una fecha', 'error'); return; }
    const res = await fetch(`${API_URL}/instalaciones/${instalacionId}/solicitar-cambio`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nueva_fecha: fecha, nueva_hora: hora, emisor_id: user.id })
    });
    if (res.ok) {
      showToast('✅ Solicitud enviada al técnico. Te notificaremos cuando responda.', 'success');
      window.closeModal();
      navigate('cliente_instalaciones');
    } else {
      const err = await res.json();
      showToast(err.error || 'Error al enviar solicitud', 'error');
    }
  };
};

window.openProfileModal = async () => {
  const modal = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');

  content.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem">
            <h2>⚙️ Editar Perfil</h2>
            <button class="action-btn btn-close-modal">✕</button>
        </div>
        <form id="profile-form">
        </form>
        ${user.rol === 'Admin' ? `<div id="admin-sucursales" style="margin-top: 2rem; border-top: 1px solid var(--border-glass); padding-top: 1rem;"></div>` : ''}
    `;
  const form = document.getElementById('profile-form');

  // Load addresses for clients
  let direcciones = [];
  if (user.rol === 'Cliente') {
    try { direcciones = await fetch(`${API_URL}/direcciones/${user.cliente_id}`).then(r => r.json()); } catch (e) { }
  }

  form.innerHTML = `
        <div class="form-grid-horizontal">
            <div class="form-group">
                <label>Nombre(s)</label>
                <input type="text" id="p_nombre" value="${user.nombre || ''}" required>
            </div>
            <div class="form-group">
                <label>Apellidos</label>
                <input type="text" id="p_apellido" value="${user.apellido || ''}" required>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="p_email" value="${user.email}" required>
            </div>
            <div class="form-group">
                <label>Nueva Contraseña <small>(Opcional)</small></label>
                <input type="password" id="p_pass">
            </div>
            ${user.rol === 'Cliente' ? `
            <div class="form-group">
                <label>Teléfono</label>
                <input type="text" id="p_tel" value="${user.telefono || ''}" maxlength="10" required>
            </div>
            <div class="form-group">
                <label>Tipo de Cliente</label>
                <select id="p_tipo_cliente">
                    <option value="Residencial" ${(user.tipo_cliente || 'Residencial') === 'Residencial' ? 'selected' : ''}>Residencial</option>
                    <option value="Industrial" ${user.tipo_cliente === 'Industrial' ? 'selected' : ''}>Industrial</option>
                </select>
            </div>
            ` : ''}
        </div>

        ${user.rol === 'Cliente' ? `
        <div style="margin-top: 1.5rem; border-top: 1px solid var(--border-glass); padding-top: 1.5rem">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
                <label style="font-weight:800;font-size:1.05rem">📍 Mis Direcciones</label>
                <button type="button" class="btn-primary" id="btnAddAddr" style="width:auto;padding:0.5rem 1rem;font-size:0.85rem">➕ Agregar</button>
            </div>
            <div id="addrCardList" class="addr-card-list">
                ${direcciones.length === 0 ? '<p style="color:var(--text-muted);font-size:0.9rem;text-align:center;padding:1rem">No tienes direcciones guardadas aún.</p>' :
        direcciones.map(d => `
                    <div class="addr-card ${d.es_predeterminada ? 'is-default' : ''}" data-id="${d.id}">
                        <div class="addr-card-star" data-id="${d.id}" title="Marcar como predeterminada">${d.es_predeterminada ? '⭐' : '☆'}</div>
                        <div class="addr-card-info">
                            <div class="addr-card-label">${escape(d.etiqueta || 'Casa')}${d.es_predeterminada ? ' — PREDETERMINADA' : ''}</div>
                            <div class="addr-card-text">${escape(d.direccion)}</div>
                        </div>
                        <div class="addr-card-actions">
                            <button type="button" class="addr-card-btn btn-edit-addr" data-id="${d.id}" data-dir="${escape(d.direccion)}" data-label="${escape(d.etiqueta || 'Casa')}" title="Editar">✏️</button>
                            <button type="button" class="addr-card-btn btn-del" data-id="${d.id}" title="Eliminar">🗑️</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div id="newAddrForm" style="display:none;margin-top:0.8rem;background:rgba(255,255,255,0.03);border:1px solid var(--border-glass);border-radius:12px;padding:1rem">
                <div class="form-grid-horizontal">
                    <div class="form-group"><label>Etiqueta</label><input type="text" id="newAddrLabel" placeholder="Ej. Casa, Oficina" value="Casa"></div>
                    <div class="form-group"><label>Dirección</label><input type="text" id="newAddrText" placeholder="Calle, número, colonia, ciudad"></div>
                </div>
                <label style="display:flex;align-items:center;gap:0.5rem;margin-top:0.5rem;cursor:pointer;font-size:0.9rem">
                    <input type="checkbox" id="newAddrDefault"> Marcar como predeterminada
                </label>
                <div style="display:flex;gap:0.6rem;margin-top:0.8rem">
                    <button type="button" class="btn-primary" id="btnSaveNewAddr" style="width:auto;padding:0.5rem 1.2rem;font-size:0.85rem">Guardar</button>
                    <button type="button" class="btn-outline" id="btnCancelNewAddr" style="padding:0.5rem 1.2rem;font-size:0.85rem">Cancelar</button>
                </div>
            </div>
        </div>
        ` : ''}

        <div class="form-group" style="margin-top: 1rem; opacity: 0.7;">
            <label>Tipo de usuario</label>
            <input type="text" value="${user.rol}" disabled>
        </div>
        <button type="submit" class="btn-primary" style="margin-top: 1.5rem; width: 100%;">Guardar Perfil</button>
        <button type="button" class="btn-danger" id="btnDeleteAccount" style="margin-top: 1rem; width: 100%; padding: 0.9rem; border: 2px solid #ef4444; background: transparent; color: #ef4444; border-radius: 12px; cursor: pointer; font-weight: 700; font-size: 0.95rem; transition: all 0.3s ease;">🗑️ Eliminar mi Cuenta</button>
    `;

  // Address management event bindings
  if (user.rol === 'Cliente') {
    const addBtn = document.getElementById('btnAddAddr');
    if (addBtn) addBtn.onclick = () => { document.getElementById('newAddrForm').style.display = 'block'; addBtn.style.display = 'none'; };
    const cancelBtn = document.getElementById('btnCancelNewAddr');
    if (cancelBtn) cancelBtn.onclick = () => { document.getElementById('newAddrForm').style.display = 'none'; if (addBtn) addBtn.style.display = 'block'; };

    const saveNewBtn = document.getElementById('btnSaveNewAddr');
    if (saveNewBtn) saveNewBtn.onclick = async () => {
      const dir = document.getElementById('newAddrText').value.trim();
      const label = document.getElementById('newAddrLabel').value.trim() || 'Casa';
      const isDef = document.getElementById('newAddrDefault').checked;
      if (!dir) { showToast('Escribe una dirección', 'error'); return; }
      await fetch(`${API_URL}/direcciones`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cliente_id: user.cliente_id, direccion: dir, etiqueta: label, es_predeterminada: isDef }) });
      if (isDef) { user.direccion = dir; localStorage.setItem('ay_gabz_user', JSON.stringify(user)); }
      showToast('Dirección agregada', 'success');
      window.openProfileModal();
    };

    document.querySelectorAll('.addr-card-star').forEach(star => {
      star.onclick = async () => {
        await fetch(`${API_URL}/direcciones/${star.dataset.id}/predeterminada`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cliente_id: user.cliente_id }) });
        const cards = await fetch(`${API_URL}/direcciones/${user.cliente_id}`).then(r => r.json());
        const def = cards.find(c => c.es_predeterminada);
        if (def) { user.direccion = def.direccion; localStorage.setItem('ay_gabz_user', JSON.stringify(user)); }
        showToast('Dirección predeterminada actualizada', 'success');
        window.openProfileModal();
      };
    });

    document.querySelectorAll('.btn-edit-addr').forEach(btn => {
      btn.onclick = () => {
        const newDir = prompt('Editar dirección:', btn.dataset.dir);
        if (newDir && newDir.trim()) {
          const newLabel = prompt('Etiqueta:', btn.dataset.label);
          fetch(`${API_URL}/direcciones/${btn.dataset.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ direccion: newDir.trim(), etiqueta: newLabel || btn.dataset.label }) })
            .then(() => { showToast('Dirección actualizada', 'success'); window.openProfileModal(); });
        }
      };
    });

    document.querySelectorAll('.btn-del').forEach(btn => {
      btn.onclick = async () => {
        if (confirm('¿Eliminar esta dirección?')) {
          await fetch(`${API_URL}/direcciones/${btn.dataset.id}`, { method: 'DELETE' });
          showToast('Dirección eliminada', 'success');
          window.openProfileModal();
        }
      };
    });
  }

  form.onsubmit = async (e) => {
    e.preventDefault();
    const payload = {
      id: user.id,
      cliente_id: user.cliente_id,
      nombre: document.getElementById('p_nombre').value,
      apellido: document.getElementById('p_apellido').value,
      email: document.getElementById('p_email').value,
      password: document.getElementById('p_pass').value,
      telefono: document.getElementById('p_tel')?.value,
      direccion: user.direccion || '',
      tipo_cliente: document.getElementById('p_tipo_cliente')?.value
    };

    const res = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      user.nombre = data.nombre;
      user.apellido = data.apellido;
      user.email = data.email;
      if (data.telefono) user.telefono = data.telefono;
      if (data.direccion) user.direccion = data.direccion;
      if (data.tipo_cliente) user.tipo_cliente = data.tipo_cliente;
      localStorage.setItem('ay_gabz_user', JSON.stringify(user));
      showToast('Perfil actualizado correctamente', 'success');
      window.closeModal();
      initApp();
    } else {
      const err = await res.json();
      showToast('Error: ' + (err.error || 'No se pudo actualizar'), 'error');
    }
  };
  modal.classList.add('active');

  // Explicitly bind the new X button inside the modal
  const closeBtn = content.querySelector('.action-btn');
  if (closeBtn) closeBtn.onclick = window.closeModal;

  // Delete Account Button
  const delBtn = document.getElementById('btnDeleteAccount');
  if (delBtn) {
    delBtn.onmouseenter = () => { delBtn.style.background = '#ef4444'; delBtn.style.color = '#fff'; };
    delBtn.onmouseleave = () => { delBtn.style.background = 'transparent'; delBtn.style.color = '#ef4444'; };
    delBtn.onclick = async () => {
      const confirmed = confirm('⚠️ ¿Estás seguro de que quieres eliminar tu cuenta?\n\nEsta acción es PERMANENTE y no se puede deshacer.\nSe borrarán todos tus datos de usuario.');
      if (!confirmed) return;
      const doubleConfirm = confirm('ÚLTIMA CONFIRMACIÓN: Escribe OK para confirmar la eliminación de tu cuenta.');
      if (!doubleConfirm) return;

      try {
        const res = await fetch(`${API_URL}/auth/account/${user.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cliente_id: user.cliente_id || null })
        });
        if (res.ok) {
          showToast('Tu cuenta ha sido eliminada. Puedes registrarte de nuevo.', 'success');
          localStorage.removeItem('ay_gabz_user');
          localStorage.removeItem(getCartKey());
          user = null;
          cart = [];
          window.closeModal();
          setTimeout(() => window.navigate('register'), 1000);
        } else {
          const err = await res.json();
          showToast('Error al eliminar: ' + (err.error || 'Intenta de nuevo'), 'error');
        }
      } catch (e) {
        showToast('Error de conexión con el servidor', 'error');
      }
    };
  }

  if (user.rol === 'Admin') {
    window.loadAdminSucursales = async () => {
      const sucs = await fetch(`${API_URL}/sucursales`).then(r => r.json());
      const sdiv = document.getElementById('admin-sucursales');
      if (!sdiv) return;
      sdiv.innerHTML = `
                 <h3>Mis Sucursales (Direcciones Físicas)</h3>
                 <div style="display:flex; gap:1rem; margin-bottom: 1rem;">
                     <input type="text" id="new_suc" placeholder="Ej. Av. Central 123" style="flex:1; padding:0.8rem; border-radius:8px;">
                     <button type="button" class="btn-primary" id="addSucBtn" style="width:auto; padding: 0.8rem">Añadir</button>
                 </div>
                 <ul style="list-style:none; padding:0; max-height: 200px; overflow-y:auto;">
                     ${sucs.map(s => `
                        <li style="display:flex; justify-content:space-between; margin-bottom: 0.5rem; padding: 0.5rem; background: var(--bg-card); border-radius: 8px;">
                           ${escape(s.direccion)} 
                           <button type="button" class="action-btn" onclick="window.delSuc(${s.id})" style="background:transparent;border:none;">🗑️</button>
                        </li>
                     `).join('')}
                 </ul>
             `;
      document.getElementById('addSucBtn').onclick = async () => {
        const dir = document.getElementById('new_suc').value;
        if (!dir) return;
        await fetch(`${API_URL}/sucursales`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ direccion: dir }) });
        window.loadAdminSucursales();
      };
    };
    window.delSuc = async (id) => {
      await fetch(`${API_URL}/sucursales/${id}`, { method: 'DELETE' });
      window.loadAdminSucursales();
    };
    window.loadAdminSucursales();
  }
};

window.toggleSidebar = () => {
  const sidebar = document.getElementById('appSidebar');
  if (sidebar) {
    sidebar.classList.toggle('mobile-active');
    console.log('Sidebar toggled:', sidebar.classList.contains('mobile-active'));
  }
};

// Robustly bind all global action buttons
function bindGlobalEvents() {
  // Mobile Navigation
  const ham = document.querySelector('.hamburger-btn');
  const close = document.querySelector('.close-sidebar-btn');
  if (ham) ham.onclick = window.toggleSidebar;
  if (close) close.onclick = window.toggleSidebar;

  // User Actions
  const settingsBtn = document.querySelector('.btn-settings');
  const logoutBtn = document.querySelector('.btn-logout');
  if (settingsBtn) settingsBtn.onclick = window.openProfileModal;
  if (logoutBtn) logoutBtn.onclick = window.logout;
}

// Helpers
window.showToast = (msg, type = 'info') => {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.4s forwards';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
};

window.exportSalesExcel = async () => {
  try {
    const res = await fetch(`${API_URL}/ventas`);
    const ventas = await res.json();
    const headers = ["ID", "Cliente", "Producto", "Total", "Fecha"];
    const rows = ventas.map(v => [v.id, v.cliente_nombre, v.producto_nombre, v.total, v.fecha_venta]);
    const csv = ["\ufeff" + headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Reporte_Ventas_v4.5.csv';
    a.click();
    showToast('Excel generado correctamente', 'success');
  } catch (e) { showToast('Error al exportar', 'error'); }
};

window.selectRegRole = (rol) => {
  document.getElementById('r_rol').value = rol;
  document.querySelectorAll('.role-box-mini').forEach(el => el.classList.toggle('active', el.innerText.includes(rol)));
  const isCliente = rol === 'Cliente';
  document.getElementById('cliente-fields-grid').style.display = isCliente ? 'contents' : 'none';
  document.getElementById('rfc-container').style.display = isCliente ? 'block' : 'none';
  const telInput = document.getElementById('r_tel');
  if (telInput) telInput.required = isCliente;
};

window.toggleRFC = () => {
  const type = document.getElementById('r_tipo').value;
  const label = document.getElementById('rfc-label');
  label.innerHTML = type === 'Comercial' ? 'RFC (Moral - Requerido)' : 'RFC (Opcional)';
};

let notifInterval = null;

window.updateNotifBadge = async () => {
  if (!user) return;
  const badge = document.getElementById('notifCountBadge');
  if (!badge) return;
  try {
    const res = await fetch(`${API_URL}/notificaciones/${user.id}/count`);
    if (res.ok) {
      const data = await res.json();
      if (data.count > 0) {
        badge.textContent = data.count;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  } catch (e) { console.error(e); }
};

// Chat badge update
window.updateChatBadge = async () => {
  if (!user) return;
  try {
    const res = await fetch(`${API_URL}/chats/unread/${user.id}`);
    if (res.ok) {
      const data = await res.json();
      const badgeIds = user.rol === 'Admin' ? ['adminChatBadge'] : user.rol === 'Tecnico' ? ['tecChatBadge'] : ['clientChatBadge'];
      badgeIds.forEach(id => {
        const badge = document.getElementById(id);
        if (badge) {
          badge.textContent = data.count;
          badge.style.display = data.count > 0 ? 'flex' : 'none';
        }
      });
    }
  } catch(e) {}
};

// Chat helper: start chat with admin
window.startChatWithAdmin = async (instalacion_id = null, initialMsg = null) => {
  try {
    const admins = await fetch(`${API_URL}/admin/usuarios`).then(r => r.json());
    if (admins.length === 0) { showToast('No hay administradores disponibles', 'error'); return; }
    const adminId = admins[0].id;
    const res = await fetch(`${API_URL}/chats`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'cliente_admin', instalacion_id, usuario1_id: user.id, usuario2_id: adminId })
    });
    if (res.ok) {
      const data = await res.json();
      if (initialMsg) {
        await fetch(`${API_URL}/chats/${data.id}/mensajes`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emisor_id: user.id, contenido: initialMsg })
        });
      }
      navigate('chat_view', data.id);
    }
  } catch(e) { showToast('Error al iniciar chat', 'error'); }
};

// Report overdue installation to admin
window.reportOverdueToAdmin = async (instId, producto, fecha) => {
  const msg = `⚠️ Queja: Mi instalación de "${producto}" programada para el ${new Date(fecha).toLocaleDateString('es-MX')} NO se realizó. Solicito una explicación y solución.`;
  await window.startChatWithAdmin(parseInt(instId), msg);
};

// Start chat with technician (from client installations)
window.startChatWithTecnico = async (instalacion_id, tecnico_usuario_id) => {
  if (!tecnico_usuario_id) { showToast('No hay técnico asignado aún', 'error'); return; }
  try {
    const res = await fetch(`${API_URL}/chats`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'cliente_tecnico', instalacion_id, usuario1_id: user.id, usuario2_id: tecnico_usuario_id })
    });
    if (res.ok) {
      const data = await res.json();
      navigate('chat_view', data.id);
    }
  } catch(e) { showToast('Error al iniciar chat', 'error'); }
};

// Check overdue installations for technicians
window.checkOverdueInstallations = async () => {
  if (!user || user.rol !== 'Tecnico' || !user.tecnico_id) return;
  try {
    const overdue = await fetch(`${API_URL}/instalaciones/vencidas/tecnico/${user.tecnico_id}`).then(r => r.json());
    if (overdue.length === 0) return;
    const modal = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    content.innerHTML = `
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
          <h2 style="color:#f87171">⚠️ Instalaciones Pendientes Vencidas</h2>
        </div>
        <p style="color:var(--text-muted);margin-bottom:1.5rem">Las siguientes instalaciones no se realizaron en la fecha programada. Por favor explica el motivo.</p>
        <div class="overdue-modal-list">
          ${overdue.map(i => `
            <div class="overdue-item" data-inst-id="${i.id}">
              <h4>🔧 ${escape(i.producto_nombre)}</h4>
              <p>Cliente: ${escape(i.cliente_nombre)} — Fecha: ${new Date(i.fecha_instalacion).toLocaleDateString('es-MX')} a las ${i.hora_instalacion}</p>
              <textarea class="overdue-textarea" id="overdue_${i.id}" placeholder="Explica el motivo por el que no se realizó la instalación..."></textarea>
            </div>
          `).join('')}
        </div>
        <button class="btn-primary" id="btnSubmitOverdue" style="margin-top:1rem;width:100%">Enviar Explicaciones</button>
      </div>
    `;
    modal.classList.add('active');
    document.getElementById('btnSubmitOverdue').onclick = async () => {
      let allSent = true;
      for (const i of overdue) {
        const textarea = document.getElementById(`overdue_${i.id}`);
        const motivo = textarea?.value?.trim();
        if (!motivo) { showToast(`Escribe un motivo para: ${i.producto_nombre}`, 'error'); allSent = false; break; }
        await fetch(`${API_URL}/instalaciones/${i.id}/explicacion`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tecnico_usuario_id: user.id, motivo })
        });
      }
      if (allSent) {
        showToast('✅ Explicaciones enviadas al administrador', 'success');
        window.closeModal();
      }
    };
  } catch(e) { console.error('Error checking overdue:', e); }
};

window.loginSuccess = (userData) => {
  user = userData;
  localStorage.setItem('ay_gabz_user', JSON.stringify(user));
  // Load the specific cart for this user upon login
  cart = JSON.parse(localStorage.getItem(getCartKey())) || [];
  showToast(`Bienvenido, ${user.nombre}`, 'success');
  initApp();
  window.updateNotifBadge();
  window.updateChatBadge();
  if (notifInterval) clearInterval(notifInterval);
  notifInterval = setInterval(() => { window.updateNotifBadge(); window.updateChatBadge(); }, 30000);
  // Check overdue installations for technicians
  if (userData.rol === 'Tecnico') {
    setTimeout(() => window.checkOverdueInstallations(), 2000);
  }
};

window.logout = () => {
  if (notifInterval) clearInterval(notifInterval);
  localStorage.removeItem('ay_gabz_user');
  user = null;
  cart = []; // Clear memory state for security
  location.reload();
};

async function navigate(viewName, params = null) {
  if (!user && viewName !== 'login' && viewName !== 'register') {
    navigate('login');
    return;
  }

  // Security Gate: Prevents cross-role access
  if (user) {
    const uRole = (user.rol || '').toLowerCase();
    const adminOnly = ['dashboard', 'ventas', 'productos', 'clientes', 'admin_chats'];
    const clientOnly = ['cliente_catalog', 'cliente_orders', 'product_detail', 'cliente_instalaciones', 'cliente_soporte'];
    const tecnicoOnly = ['tecnico_calendario', 'tecnico_lista', 'tecnico_chats'];
    const shared = ['chat_view', 'tecnico_notificaciones'];
    if (shared.includes(viewName)) { /* allow all roles */ }
    else if (uRole === 'cliente' && (adminOnly.includes(viewName) || tecnicoOnly.includes(viewName))) viewName = 'cliente_catalog';
    else if (uRole === 'admin' && (clientOnly.includes(viewName) || tecnicoOnly.includes(viewName))) viewName = 'dashboard';
    else if (uRole === 'tecnico' && (adminOnly.includes(viewName) || clientOnly.includes(viewName))) viewName = 'tecnico_calendario';
  }

  // Clean up chat refresh interval when navigating away from chat
  if (viewName !== 'chat_view' && window._chatRefreshInterval) {
    clearInterval(window._chatRefreshInterval);
    window._chatRefreshInterval = null;
  }

  const container = document.getElementById('view-container');
  const mainWrapper = document.getElementById('mainContent');
  const defaultView = user ? (user.rol.toLowerCase() === 'admin' ? views.dashboard : user.rol.toLowerCase() === 'tecnico' ? views.tecnico_calendario : views.cliente_catalog) : views.login;
  const view = views[viewName] || defaultView;

  if (view === views.login || view === views.register) {
    document.getElementById('appLayout').classList.add('auth-mode');
    mainWrapper.className = 'auth-content';
  } else {
    document.getElementById('appLayout').classList.remove('auth-mode');
    mainWrapper.className = 'main-content';
  }

  container.innerHTML = view.title ? `<h1>${view.title}</h1><div id="view-content"></div>` : `<div id="view-content"></div>`;
  const contentHtml = await view.render(params);
  document.getElementById('view-content').innerHTML = contentHtml;
  view.afterRender?.(params);

  // Sync Sidebar Active State
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
  });

  // Auto-close sidebar on mobile
  document.getElementById('appSidebar').classList.remove('mobile-active');
}

function initApp() {
  if (!user) { navigate('login'); return; }
  const uRole = (user.rol || '').toLowerCase();
  const isAdmin = uRole === 'admin';
  const isTecnico = uRole === 'tecnico';
  const isCliente = uRole === 'cliente';

  // Start notification and chat polling
  window.updateNotifBadge();
  window.updateChatBadge();
  if (notifInterval) clearInterval(notifInterval);
  notifInterval = setInterval(() => { window.updateNotifBadge(); window.updateChatBadge(); }, 30000);

  // Delegation for Modal Closing
  const modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay && !modalOverlay.dataset.delegated) {
    modalOverlay.addEventListener('click', (e) => {
      // Check if clicked X or Close button
      if (e.target.innerText === '✕' || e.target.closest('.btn-close-modal')) {
        window.closeModal();
      }
    });
    modalOverlay.dataset.delegated = 'true';
  }

  // Role-based Cart Visibility
  const mCart = document.getElementById('mobileCartBtn');
  const dCart = document.getElementById('desktopCartBtn');

  const showCart = isCliente;
  if (mCart) {
    mCart.style.display = showCart ? 'flex' : 'none';
    mCart.onclick = () => window.openCart();
  }
  if (dCart) {
    dCart.style.display = showCart ? 'flex' : 'none';
    dCart.onclick = () => window.openCart();
  }

  if (isCliente) {
    updateCartBadges();
    const footer = document.getElementById('publicFooter');
    if (footer) {
      footer.style.display = 'block';
      fetch(`${API_URL}/sucursales`).then(r => r.json()).then(sucs => {
        const ul = document.getElementById('sucursalesList');
        if (ul) ul.innerHTML = sucs.map(s => `<li style="background:var(--bg-glass); padding:0.5rem 1rem; border-radius:30px; border:1px solid var(--border-glass);">📍 ${escape(s.direccion)}</li>`).join('');
      });
    }
  } else {
    const footer = document.getElementById('publicFooter');
    if (footer) footer.style.display = 'none';
  }

  const layout = document.getElementById('appLayout');
  // Force clean classes to avoid state leakage
  layout.classList.remove('is-logged-in', 'admin-mode', 'client-mode', 'tecnico-mode', 'auth-mode');

  if (!user) {
    const currentView = document.getElementById('view-container').innerHTML ? '' : 'login';
    navigate(currentView || 'login');
    return;
  }

  // Setup Sidebar
  layout.classList.add('is-logged-in');
  document.getElementById('welcomeMsg').textContent = `${user.nombre} ${user.apellido || ''}`.trim();
  document.getElementById('roleBadge').textContent = user.rol;
  document.getElementById('userAvatar').textContent = (user.nombre || 'U')[0].toUpperCase();

  layout.classList.toggle('admin-mode', isAdmin);
  layout.classList.toggle('client-mode', isCliente);
  layout.classList.toggle('tecnico-mode', isTecnico);
  bindGlobalEvents();

  // Global Event Delegation for Sidebar Links
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => navigate(btn.getAttribute('data-view'));
  });

  navigate(isAdmin ? 'dashboard' : isTecnico ? 'tecnico_calendario' : 'cliente_catalog');
}

window.deleteItem = async (type, id) => {
  if (confirm('¿Confirmas eliminación definitiva?')) {
    const res = await fetch(`${API_URL}/${type}/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Eliminado correctamente', 'success');
      navigate(type === 'productos' ? 'productos' : type);
    } else {
      showToast('No se pudo eliminar. Verifica dependencias.', 'error');
    }
  }
};

window.buyProduct = async (id, name, price, stock = 1) => {
  if (stock <= 0) {
    showToast(`Lo sentimos, ${name} está agotado.`, 'error');
    return;
  }

  window.openAddressModal(async (address) => {
    showToast(`Procesando compra de ${name}...`, 'info');
    const res = await fetch(`${API_URL}/ventas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ cliente_id: user.cliente_id, producto_id: id, cantidad: 1, total: price }])
    });
    if (res.ok) {
      const ventaData = await res.json();
      showToast('¡Compra realizada con éxito! 🚛', 'success');
      const ventaId = ventaData.ventaIds?.[0]?.ventaId;
      const prodName = ventaData.ventaIds?.[0]?.productoNombre || name;
      setTimeout(() => window.openInstallationOffer(ventaId, prodName, address), 1200);
    } else {
      const err = await res.json();
      const msg = typeof err.error === 'string' ? err.error : JSON.stringify(err.error);
      showToast('Error: ' + (msg || 'Stock insuficiente'), 'error');
    }
  });
};

window.addToCart = (product, qty) => {
  if (product.stock <= 0) {
    showToast(`No hay stock disponible para ${product.nombre}`, 'error');
    return;
  }
  const existing = cart.find(i => i.id === product.id);
  if (existing) {
    existing.cantidad += qty;
  } else {
    cart.push({ ...product, cantidad: qty });
  }
  saveCart();
  showToast(`${qty} x ${product.nombre} añadido al carrito`, 'success');
};

function saveCart() {
  localStorage.setItem(getCartKey(), JSON.stringify(cart));
  updateCartBadges();
}

function updateCartBadges() {
  if (!user || user.rol.toLowerCase() === 'admin') return;
  const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);
  const badges = document.querySelectorAll('.cart-badge');
  badges.forEach(b => {
    b.textContent = totalItems;
    // The badges themselves only show if items > 0
    b.style.display = totalItems > 0 ? 'flex' : 'none';
  });
}

window.openCart = () => {
  const modal = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');

  if (cart.length === 0) {
    content.innerHTML = `
            <div style="text-align: center; padding: 2rem">
                <div style="font-size: 4rem; margin-bottom: 1rem">🛍️</div>
                <h2>Tu carrito está vacío</h2>
                <p style="color: var(--text-muted); margin-bottom: 2rem">Explora nuestro catálogo industrial para añadir productos.</p>
                <button class="btn-primary btn-close-modal">Continuar Comprando</button>
            </div>
        `;
  } else {
    let total = 0;
    const itemsHtml = cart.map((item, idx) => {
      const subtotal = item.precio * item.cantidad;
      total += subtotal;
      return `
                <div class="cart-item-row">
                    <div class="cart-item-info">
                        <strong>${escape(item.nombre)}</strong>
                        <div class="cart-qty-controls">
                            <button class="qty-mini-btn" onclick="window.updateCartQty(${idx}, -1)">–</button>
                            <span>${item.cantidad}</span>
                            <button class="qty-mini-btn" onclick="window.updateCartQty(${idx}, 1)">+</button>
                        </div>
                    </div>
                    <div class="cart-item-actions">
                        <span class="price-tag" style="font-size: 1.1rem">$${subtotal.toFixed(2)}</span>
                        <button class="action-btn btn-remove-item" onclick="window.removeFromCart(${idx})">🗑️</button>
                    </div>
                </div>
            `;
    }).join('');

    content.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem">
                <h2>Tu Carrito</h2>
                <button class="action-btn btn-close-modal">✕</button>
            </div>
            <div class="cart-items-list">${itemsHtml}</div>
            <div class="cart-total-box">
                <div style="display: flex; justify-content: space-between; font-size: 1.2rem; font-weight: 800; margin-bottom: 1.5rem">
                    <span>Total a Pagar</span>
                    <span class="price-tag" style="font-size: 1.5rem">$${total.toFixed(2)}</span>
                </div>
                <button class="btn-primary" id="btnCheckout" style="font-size: 1.1rem; padding: 1.2rem">
                    Confirmar Compra 📦
                </button>
        `;

    // Bind removal buttons
    document.querySelectorAll('.btn-remove-item').forEach(btn => {
      btn.onclick = () => window.removeFromCart(parseInt(btn.getAttribute('data-idx')));
    });

    document.getElementById('btnCheckout').onclick = () => window.processCheckout();
  }
  modal.classList.add('active');
};

window.updateCartQty = (idx, change) => {
  cart[idx].cantidad += change;
  if (cart[idx].cantidad < 1) return window.removeFromCart(idx);
  saveCart();
  window.openCart();
};

window.removeFromCart = (idx) => {
  cart.splice(idx, 1);
  saveCart();
  window.openCart(); // Refresh modal
};

window.processCheckout = async () => {
  if (!user) return navigate('login');
  window.closeModal(); // Close cart modal first

  window.openAddressModal(async (address) => {
    showToast('Procesando pedido global...', 'info');

    let successCount = 0;
    const completedVentas = [];
    for (const item of cart) {
      const res = await fetch(`${API_URL}/ventas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{
          cliente_id: Number(user.cliente_id),
          producto_id: Number(item.id),
          cantidad: Number(item.cantidad),
          total: Number(item.precio * item.cantidad)
        }])
      });
      if (res.ok) {
        successCount++;
        const data = await res.json();
        if (data.ventaIds) completedVentas.push(...data.ventaIds);
      }
      else {
        const err = await res.json();
        const msg = typeof err.error === 'string' ? err.error : JSON.stringify(err.error);
        showToast(`Error en ${item.nombre}: ${msg}`, 'error');
      }
    }

    if (successCount === cart.length) {
      showToast('¡Pedido completado con éxito! 🚛', 'success');
      cart = [];
      saveCart();
      window.closeModal();
      if (completedVentas.length > 0) {
        setTimeout(() => window.openInstallationOffer(completedVentas[0].ventaId, completedVentas[0].productoNombre, address), 1200);
      } else {
        setTimeout(() => navigate('cliente_orders'), 1000);
      }
    } else {
      showToast('Algunos productos no pudieron procesarse (Stock insuficiente)', 'warning');
      saveCart();
      window.openCart();
    }
  });
};

// --- ADDRESS SELECTION MODAL (replaces native prompt) ---
window.openAddressModal = async (onConfirm) => {
  const modal = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  
  let direcciones = [];
  if (user && user.rol === 'Cliente') {
    try {
      direcciones = await fetch(`${API_URL}/direcciones/${user.cliente_id}`).then(r => r.json());
    } catch(e) {}
  }
  
  if (user && user.direccion && user.direccion.trim() !== '' && !direcciones.find(d => d.direccion.toLowerCase().trim() === user.direccion.toLowerCase().trim())) {
      direcciones.unshift({
          id: 'legacy',
          direccion: user.direccion,
          etiqueta: 'Dirección Guardada',
          es_predeterminada: true
      });
  }

  const hasSavedAddress = direcciones.length > 0;

  if (!hasSavedAddress) {
    // FIRST PURCHASE — no saved address, just ask for one
    content.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
                <h2>📍 Dirección de Envío</h2>
                <button class="action-btn btn-close-modal" style="background:none;border:none;color:var(--text-muted);font-size:1.5rem;cursor:pointer">✕</button>
            </div>
            <p style="color: var(--text-muted); margin-bottom: 1.5rem">Es tu primera compra. Ingresa la dirección donde deseas recibir tu pedido.</p>
            <div class="form-group">
                <label>Dirección de envío</label>
                <input type="text" id="addrInput" placeholder="Ej. Calle 5 #123, Colonia Centro, Ciudad" style="font-size: 1rem">
            </div>
            <button class="btn-primary" id="btnAddrConfirm" style="width: 100%; margin-top: 1rem">Confirmar Dirección</button>
        `;
    modal.classList.add('active');
    content.querySelector('.btn-close-modal').onclick = window.closeModal;
    document.getElementById('addrInput').focus();

    document.getElementById('btnAddrConfirm').onclick = () => {
      const addr = document.getElementById('addrInput').value.trim();
      if (!addr) { showToast('Escribe una dirección válida', 'error'); return; }
      window.closeModal();
      // Ask if they want it as default
      window.askSetDefault(addr, onConfirm);
    };
  } else {
    // RETURNING BUYER — has saved address, show options
    let optionsHtml = direcciones.map((d, index) => {
      const isSelected = d.es_predeterminada || (index === 0 && !direcciones.some(x => x.es_predeterminada));
      return `
                <label class="addr-option ${isSelected ? 'selected' : ''}" id="addrOpt_${index}">
                    <input type="radio" name="addrChoice" value="${escape(d.direccion)}" ${isSelected ? 'checked' : ''} style="display:none">
                    <div class="addr-option-inner">
                        <div style="display:flex;align-items:center;gap:0.8rem">
                            <div class="addr-radio-dot ${isSelected ? 'active' : ''}"></div>
                            <div>
                                <div style="font-weight:800;margin-bottom:0.3rem">📍 ${escape(d.etiqueta || 'Dirección')} - ${escape(d.direccion)}</div>
                                ${d.es_predeterminada ? '<div style="font-size:0.75rem;color:#34d399;font-weight:700">✅ DIRECCIÓN PREDETERMINADA</div>' : ''}
                            </div>
                        </div>
                    </div>
                </label>
      `;
    }).join('');

    content.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
                <h2>📍 Dirección de Envío</h2>
                <button class="action-btn btn-close-modal" style="background:none;border:none;color:var(--text-muted);font-size:1.5rem;cursor:pointer">✕</button>
            </div>
            <p style="color: var(--text-muted); margin-bottom: 1.5rem">Selecciona la dirección para este pedido</p>

            <div class="addr-options" style="max-height: 300px; overflow-y: auto; margin-bottom: 1rem;">
                ${optionsHtml}

                <label class="addr-option" id="addrOptNew">
                    <input type="radio" name="addrChoice" value="new" style="display:none">
                    <div class="addr-option-inner">
                        <div style="display:flex;align-items:center;gap:0.8rem">
                            <div class="addr-radio-dot"></div>
                            <div style="font-weight:700">➕ Agregar nueva dirección</div>
                        </div>
                    </div>
                </label>
            </div>

            <div id="newAddrSection" style="display:none;margin-top:1rem">
                <div class="form-group">
                    <label>Nueva dirección</label>
                    <input type="text" id="addrInputNew" placeholder="Ej. Av. Reforma #456, Col. Juárez" style="font-size: 1rem">
                </div>
            </div>

            <button class="btn-primary" id="btnAddrConfirm" style="width: 100%; margin-top: 1.5rem">Confirmar y Continuar</button>
        `;
    modal.classList.add('active');
    content.querySelector('.btn-close-modal').onclick = window.closeModal;

    const optNew = document.getElementById('addrOptNew');
    const newSection = document.getElementById('newAddrSection');
    const allOpts = document.querySelectorAll('.addr-option:not(#addrOptNew)');

    allOpts.forEach((opt) => {
        opt.onclick = () => {
            document.querySelectorAll('.addr-option').forEach(o => o.classList.remove('selected'));
            document.querySelectorAll('.addr-radio-dot').forEach(d => d.classList.remove('active'));
            
            opt.classList.add('selected');
            opt.querySelector('.addr-radio-dot').classList.add('active');
            opt.querySelector('input').checked = true;
            newSection.style.display = 'none';
        };
    });

    optNew.onclick = () => {
      document.querySelectorAll('.addr-option').forEach(o => o.classList.remove('selected'));
      document.querySelectorAll('.addr-radio-dot').forEach(d => d.classList.remove('active'));

      optNew.classList.add('selected');
      optNew.querySelector('.addr-radio-dot').classList.add('active');
      optNew.querySelector('input').checked = true;
      newSection.style.display = 'block';
      document.getElementById('addrInputNew').focus();
    };

    document.getElementById('btnAddrConfirm').onclick = () => {
      const choice = document.querySelector('input[name="addrChoice"]:checked').value;
      if (choice !== 'new') {
        window.closeModal();
        onConfirm(choice);
      } else {
        const newAddr = document.getElementById('addrInputNew').value.trim();
        if (!newAddr) { showToast('Escribe la nueva dirección', 'error'); return; }
        window.closeModal();
        window.askSetDefault(newAddr, onConfirm);
      }
    };
  }
};

// Ask user if they want to set the address as their default
window.askSetDefault = (address, onConfirm) => {
  const modal = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  content.innerHTML = `
        <div style="text-align: center; padding: 1.5rem">
            <div style="font-size: 2.5rem; margin-bottom: 1rem">📍</div>
            <h2 style="margin-bottom: 0.5rem">¿Guardar como predeterminada?</h2>
            <p style="color: var(--text-muted); margin-bottom: 0.5rem">Dirección ingresada:</p>
            <div style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-glass); border-radius: 12px; padding: 1rem; margin-bottom: 2rem; font-weight: 700">${escape(address)}</div>
            <p style="color: var(--text-muted); margin-bottom: 2rem; font-size: 0.9rem">Si la guardas como predeterminada, aparecerá automáticamente en tus próximas compras y en tu perfil.</p>
            <div style="display: flex; gap: 1rem; justify-content: center">
                <button class="btn-primary" id="btnSetDefault" style="width: auto; padding: 1rem 2rem">Sí, guardar como predeterminada</button>
                <button class="btn-outline" id="btnSkipDefault" style="padding: 1rem 1.5rem">No, solo usar esta vez</button>
            </div>
        </div>
    `;
  modal.classList.add('active');

  document.getElementById('btnSetDefault').onclick = async () => {
    user.direccion = address;
    await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...user })
    });
    if (user.rol === 'Cliente') {
      try {
        await fetch(`${API_URL}/direcciones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cliente_id: user.cliente_id,
            direccion: address,
            etiqueta: 'Casa',
            es_predeterminada: true
          })
        });
      } catch(e) {}
    }
    localStorage.setItem('ay_gabz_user', JSON.stringify(user));
    showToast('✅ Dirección guardada como predeterminada', 'success');
    window.closeModal();
    onConfirm(address);
  };

  document.getElementById('btnSkipDefault').onclick = async () => {
    if (user.rol === 'Cliente') {
      try {
        await fetch(`${API_URL}/direcciones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cliente_id: user.cliente_id,
            direccion: address,
            etiqueta: 'Nueva Dirección',
            es_predeterminada: false
          })
        });
      } catch(e) {}
    }
    window.closeModal();
    onConfirm(address);
  };
};

// --- POST-PURCHASE INSTALLATION OFFER ---
window.openInstallationOffer = (ventaId, productoNombre, direccion) => {
  const modal = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  content.innerHTML = `
        <div style="text-align: center; padding: 1rem">
            <div style="font-size: 3rem; margin-bottom: 1rem">🔧</div>
            <h2 style="margin-bottom: 0.5rem">¿Deseas instalación gratuita?</h2>
            <p style="color: var(--text-muted); margin-bottom: 2rem">Podemos instalar tu <strong>${escape(productoNombre)}</strong> sin costo extra.</p>
            <div style="display: flex; gap: 1rem; justify-content: center">
                <button class="btn-primary" id="btnWantInstall" style="width: auto; padding: 1rem 2rem">Sí, programar instalación</button>
                <button class="btn-outline" id="btnNoInstall" style="padding: 1rem 2rem">No, gracias</button>
            </div>
        </div>
    `;
  modal.classList.add('active');
  document.getElementById('btnNoInstall').onclick = () => { window.closeModal(); navigate('cliente_orders'); };
  document.getElementById('btnWantInstall').onclick = () => {
    window.showInstallDatePicker(ventaId, productoNombre, direccion);
  };
};

window.showInstallDatePicker = (ventaId, productoNombre, direccion) => {
  const content = document.getElementById('modalContent');
  const today = new Date();
  const dates = [];
  for (let i = 1; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    if (d.getDay() !== 0) dates.push(d); // Skip Sundays
  }
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  content.innerHTML = `
        <div class="install-schedule-container">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
                <h2>📅 Elige fecha de instalación</h2>
                <button class="action-btn btn-close-modal">✕</button>
            </div>
            <p style="color:var(--text-muted);margin-bottom:1.5rem">Producto: <strong>${escape(productoNombre)}</strong></p>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:0.5rem;max-height:300px;overflow-y:auto;padding:0.5rem" id="datePicker">
                ${dates.map(d => `
                    <div class="calendar-day" data-date="${d.toISOString().split('T')[0]}" style="padding:0.8rem;text-align:center">
                        <div style="font-size:0.7rem;color:var(--text-muted)">${dayNames[d.getDay()]}</div>
                        <div style="font-size:1.1rem;font-weight:800">${d.getDate()}</div>
                        <div style="font-size:0.65rem;color:var(--text-muted)">${monthNames[d.getMonth()]}</div>
                    </div>
                `).join('')}
            </div>
            <div id="timeSlotSection" style="display:none;margin-top:1.5rem">
                <h3 style="margin-bottom:1rem">Selecciona horario</h3>
                <div class="time-slots-grid" id="timeSlotsGrid"></div>
            </div>
            <button class="btn-primary" id="btnConfirmInstall" style="margin-top:1.5rem;display:none">Confirmar Instalación</button>
        </div>
    `;
  content.querySelector('.btn-close-modal').onclick = () => { window.closeModal(); navigate('cliente_orders'); };

  let selectedDate = null;
  let selectedTime = null;

  document.querySelectorAll('#datePicker .calendar-day').forEach(el => {
    el.onclick = async () => {
      document.querySelectorAll('#datePicker .calendar-day').forEach(d => d.classList.remove('selected'));
      el.classList.add('selected');
      selectedDate = el.dataset.date;
      selectedTime = null;
      document.getElementById('btnConfirmInstall').style.display = 'none';

      // Fetch availability
      const tipo = user.tipo_cliente || 'Residencial';
      const disp = await fetch(`${API_URL}/instalaciones/disponibilidad?fecha=${selectedDate}&tipo=${tipo}`).then(r => r.json());
      const labels = { '10:00': '10:00 AM', '11:00': '11:00 AM', '12:00': '12:00 PM', '13:00': '1:00 PM', '14:00': '2:00 PM', '15:00': '3:00 PM', '16:00': '4:00 PM', '17:00': '5:00 PM', '18:00': '6:00 PM' };
      const grid = document.getElementById('timeSlotsGrid');
      grid.innerHTML = disp.map(s => `
                <div class="time-slot ${s.disponible ? '' : 'disabled'}" data-hora="${s.hora}">
                    ${labels[s.hora] || s.hora}
                </div>
            `).join('');
      document.getElementById('timeSlotSection').style.display = 'block';

      grid.querySelectorAll('.time-slot:not(.disabled)').forEach(slot => {
        slot.onclick = () => {
          grid.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
          slot.classList.add('selected');
          selectedTime = slot.dataset.hora;
          document.getElementById('btnConfirmInstall').style.display = 'block';
        };
      });
    };
  });

  document.getElementById('btnConfirmInstall').onclick = async () => {
    if (!selectedDate || !selectedTime) { showToast('Selecciona fecha y hora', 'error'); return; }
    const res = await fetch(`${API_URL}/instalaciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        venta_id: ventaId,
        cliente_id: user.cliente_id,
        producto_nombre: productoNombre,
        direccion: direccion || user.direccion || '',
        fecha_instalacion: selectedDate,
        hora_instalacion: selectedTime,
        tipo_cliente: user.tipo_cliente || 'Residencial'
      })
    });
    if (res.ok) {
      const data = await res.json();
      showToast(data.tecnico_asignado ? '¡Instalación programada y técnico asignado! ✅' : '¡Instalación programada! Se asignará técnico pronto.', 'success');
      window.closeModal();
      setTimeout(() => navigate('cliente_instalaciones'), 1000);
    } else {
      showToast('Error al programar instalación', 'error');
    }
  };
};

// --- MODAL & LIGHTBOX ENGINE ---
let currentLbGallery = [];
let currentLbIndex = 0;

window.openLightbox = (images, index = 0) => {
  if (!images || images.length === 0) return;
  currentLbGallery = images;
  currentLbIndex = index;
  const lb = document.getElementById('lb-overlay');
  if (!lb) {
    document.body.insertAdjacentHTML('beforeend', `
            <div id="lb-overlay" class="lightbox">
                <button class="lb-btn lb-close btn-close-modal">✕</button>
                <button class="lb-btn lb-prev" id="lb-prev-btn">‹</button>
                <div class="lightbox-content">
                    <img id="lb-img" src="">
                </div>
                <button class="lb-btn lb-next" id="lb-next-btn">›</button>
            </div>
        `);
    const overlay = document.getElementById('lb-overlay');
    overlay.onclick = () => window.closeLightbox();
    document.getElementById('lb-img').onclick = (e) => e.stopPropagation();
    document.getElementById('lb-prev-btn').onclick = (e) => { e.stopPropagation(); window.moveLb(-1); };
    document.getElementById('lb-next-btn').onclick = (e) => { e.stopPropagation(); window.moveLb(1); };
  }
  document.getElementById('lb-img').src = currentLbGallery[currentLbIndex];
  document.getElementById('lb-overlay').classList.add('active');
};

window.closeLightbox = () => document.getElementById('lb-overlay').classList.remove('active');
window.moveLb = (dir) => {
  currentLbIndex = (currentLbIndex + dir + currentLbGallery.length) % currentLbGallery.length;
  document.getElementById('lb-img').src = currentLbGallery[currentLbIndex];
};

window.openModal = async (type, id = null) => {
  const modal = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  let title = id ? 'Editar' : 'Nuevo';
  let data = { nombre: '', descripcion: '', precio: 0, stock: 0, categoria: 'Industrial', sku: '', especificaciones: '', imagenes_json: '[]' };

  if (id) {
    data = await fetch(`${API_URL}/productos/${id}`).then(r => r.json());
  }

  content.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem">
            <h2>${title} Producto</h2>
            <button class="action-btn btn-close-modal">✕</button>
        </div>
        <form id="modal-form">
            <input type="hidden" id="m_id" value="${id || ''}">
            <div class="form-grid-horizontal">
                <div class="form-group"><label>Nombre</label><input type="text" id="m_nombre" value="${data.nombre}" required></div>
                <div class="form-group"><label>SKU</label><input type="text" id="m_sku" value="${data.sku || ''}" placeholder="Ej: GABZ-X100"></div>
                <div class="form-group"><label>Categoría</label><input type="text" id="m_cat" value="${data.categoria || 'Industrial'}" required></div>
            </div>
            <div class="form-group"><label>Descripción Corta</label><textarea id="m_desc">${data.descripcion || ''}</textarea></div>
            <div class="form-group"><label>Especificaciones Técnicas</label><textarea id="m_specs" style="height: 100px">${data.especificaciones || ''}</textarea></div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem">
                <div class="form-group"><label>Precio</label><input type="number" step="0.01" id="m_precio" value="${data.precio}" required></div>
                <div class="form-group"><label>Stock</label><input type="number" id="m_stock" value="${data.stock}" required></div>
            </div>
            <div class="form-group">
                <label>Imágenes (Archivos o URLs)</label>
                <input type="file" id="m_files" multiple accept="image/*" style="margin-bottom: 1rem">
                <textarea id="m_urls" placeholder="O pega enlaces separados por comas...">${JSON.parse(data.imagenes_json || '[]').join(', ')}</textarea>
            </div>
            <button type="submit" class="btn-primary" id="m_save_btn">Guardar Cambios</button>
        </form>
    `;
  modal.classList.add('active');

  document.getElementById('modal-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('m_save_btn');
    btn.disabled = true; btn.innerText = 'Subiendo...';

    let finalImages = document.getElementById('m_urls').value.split(',').map(u => u.trim()).filter(u => u);
    const files = document.getElementById('m_files').files;

    if (files.length > 0) {
      const formData = new FormData();
      for (let f of files) formData.append('files', f);
      const uploadRes = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (uploadData.urls) finalImages = [...finalImages, ...uploadData.urls];
    }

    const payload = {
      nombre: document.getElementById('m_nombre').value,
      sku: document.getElementById('m_sku').value,
      categoria: document.getElementById('m_cat').value,
      especificaciones: document.getElementById('m_specs').value,
      descripcion: document.getElementById('m_desc').value,
      precio: parseFloat(document.getElementById('m_precio').value),
      stock: parseInt(document.getElementById('m_stock').value),
      imagenes_json: JSON.stringify(finalImages)
    };

    try {
      const res = await fetch(`${API_URL}/productos${id ? `/${id}` : ''}`, {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        window.closeModal();
        showToast(id ? 'Cambios guardados con éxito' : 'Producto añadido al inventario', 'success');
        navigate('productos');
      } else {
        const err = await res.json();
        showToast('Error: ' + (err.error || 'Fallo al guardar'), 'error');
      }
    } catch (e) {
      showToast('Error de conexión con el servidor', 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = 'Guardar Cambios';
    }
  };
};

window.editItem = (type, id) => window.openModal(type, id);
window.closeModal = () => {
  const modal = document.getElementById('modalOverlay');
  if (modal) modal.classList.remove('active');
};

// Global Listeners for UX
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') window.closeModal();
});
document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
  if (e.target.id === 'modalOverlay') window.closeModal();
});

function escape(str) {
  if (!str) return '';
  const d = document.createElement('div'); d.textContent = str; return d.innerHTML;
}

window.navigate = navigate;
window.onload = initApp;