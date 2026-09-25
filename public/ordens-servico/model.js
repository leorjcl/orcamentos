
    // APP STATE
    let currentOsId = null;
    let companyConfig = {
      name: 'YGPrint - Gráfica & Impressão 3D',
      cnpj: '',
      address: 'Jardim Atlântico - Olinda / PE',
      contact: '',
      logo: ''
    };
    let osList = [];
    let currentItems = [];

    function setTodayDate() {
      const today = localDate(new Date());
      document.getElementById('osDate').value = today;
      
      // Default delivery 3 days ahead
      const delivery = new Date();
      delivery.setDate(delivery.getDate() + 3);
      document.getElementById('osDeliveryDate').value = localDate(delivery);
    }

    function fillCompanyForm() {
      // Fill company config view
      document.getElementById('cfgCompName').value = companyConfig.name;
      document.getElementById('cfgCompCnpj').value = companyConfig.cnpj;
      document.getElementById('cfgCompContact').value = companyConfig.contact;
      document.getElementById('cfgCompAddress').value = companyConfig.address;
      if (companyConfig.logo) {
        document.getElementById('companyLogoPreview').src = companyConfig.logo;
        document.getElementById('companyLogoPreview').classList.remove('hidden');
        document.getElementById('companyLogoPlaceholder').classList.add('hidden');
      }

      renderCompanyInfo();
    }

    function renderCompanyInfo() {
      document.getElementById('prevCompName').innerText = companyConfig.name || 'Sua Empresa';
      document.getElementById('prevCompCnpj').innerText = companyConfig.cnpj ? `CNPJ/CPF: ${companyConfig.cnpj}` : '';
      document.getElementById('prevCompAddress').innerText = companyConfig.address || '';
      document.getElementById('prevCompContact').innerText = companyConfig.contact ? `Contato: ${companyConfig.contact}` : '';

      const logoImg = document.getElementById('previewLogo');
      const logoPlaceholder = document.getElementById('previewLogoPlaceholder');
      if (companyConfig.logo) {
        logoImg.src = companyConfig.logo;
        logoImg.classList.remove('hidden');
        logoPlaceholder.classList.add('hidden');
      } else {
        logoImg.classList.add('hidden');
        logoPlaceholder.classList.remove('hidden');
      }
    }

    // ITEM ROW MANAGEMENT
    function addItemRow(description = '', material = '', qty = 1, unitPrice = 0) {
      const id = Date.now() + Math.random();
      dirty = true; currentItems.push({ id, description, material, qty: parseFloat(qty) || 1, unitPrice: parseFloat(unitPrice) || 0 });
      renderItemRows();
      renderPreview();
    }

    function removeItemRow(id) {
      dirty = true; currentItems = currentItems.filter(item => item.id !== id);
      renderItemRows();
      renderPreview();
    }

    function updateItem(id, field, value) {
      dirty = true; const item = currentItems.find(i => i.id === id);
      if (item) {
        if (field === 'qty' || field === 'unitPrice') {
          item[field] = parseFloat(value) || 0;
        } else {
          item[field] = value;
        }
      }
      renderPreview();
    }

    function renderItemRows() {
      const container = document.getElementById('itemsContainer');
      container.innerHTML = '';

      if (currentItems.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400 italic text-center py-2">Nenhum item adicionado.</p>`;
        return;
      }

      currentItems.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = "bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 relative";
        row.innerHTML = `
          <div class="flex justify-between items-center">
            <span class="text-[10px] font-bold text-slate-400 uppercase">Item #${index + 1}</span>
            <button onclick="removeItemRow(${item.id})" class="text-red-500 hover:text-red-700 text-xs">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div class="sm:col-span-6">
              <input type="text" value="${escapeHtml(item.description)}" oninput="updateItem(${item.id}, 'description', this.value)" placeholder="Descrição (ex: Banner 1x1m, Action Figure Goku...)" class="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none">
            </div>
            <div class="sm:col-span-6">
              <input type="text" value="${escapeHtml(item.material)}" oninput="updateItem(${item.id}, 'material', this.value)" placeholder="Material / Insumo (ex: Lona 440g, Filamento PLA Preto...)" class="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none">
            </div>
            <div class="sm:col-span-4">
              <label class="block text-[9px] text-slate-500">Qtd</label>
              <input type="number" step="1" value="${item.qty}" oninput="updateItem(${item.id}, 'qty', this.value)" class="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none">
            </div>
            <div class="sm:col-span-4">
              <label class="block text-[9px] text-slate-500">Valor Unit. (R$)</label>
              <input type="number" step="0.01" value="${item.unitPrice}" oninput="updateItem(${item.id}, 'unitPrice', this.value)" class="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none">
            </div>
            <div class="sm:col-span-4 text-right flex flex-col justify-end">
              <span class="text-[9px] text-slate-400 block">Total Item</span>
              <span class="font-bold text-xs text-slate-800">R$ ${(item.qty * item.unitPrice).toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        `;
        container.appendChild(row);
      });
    }

    // PREVIEW RENDER
    function renderPreview() {
      syncQuoteUI();
      const osNum = document.getElementById('osNumber').value || '0001';
      const status = document.getElementById('osStatus').value;
      const date = formatDate(document.getElementById('osDate').value);
      const deliveryDate = formatDate(document.getElementById('osDeliveryDate').value);
      const clientName = document.getElementById('clientName').value || 'Cliente Não Informado';
      const clientPhone = document.getElementById('clientPhone').value || '--';
      const clientDoc = document.getElementById('clientDocument').value || '--';
      const notes = document.getElementById('osNotes').value || 'Nenhuma observação.';
      const paymentMethod = document.getElementById('osPaymentMethod').value;
      
      const deposit = parseFloat(document.getElementById('osDeposit').value) || 0;
      const discount = parseFloat(document.getElementById('osDiscount').value) || 0;

      // Update Preview Text
      document.getElementById('prevOsNum').innerText = osNum;
      document.getElementById('prevCanhotoOs').innerText = osNum;
      document.getElementById('prevOsDate').innerText = date;
      document.getElementById('prevOsDelivery').innerText = deliveryDate;
      document.getElementById('prevCanhotoDelivery').innerText = deliveryDate;

      document.getElementById('prevClientName').innerText = clientName;
      document.getElementById('prevCanhotoClient').innerText = clientName;
      document.getElementById('prevClientPhone').innerText = clientPhone;
      document.getElementById('prevClientDoc').innerText = clientDoc;
      document.getElementById('prevNotes').innerText = notes;
      document.getElementById('prevPaymentMethod').innerText = paymentMethod;

      // Status Badge Styling
      const badge = document.getElementById('prevStatusBadge');
      badge.innerText = status;
      badge.className = "text-[11px] font-bold px-2 py-0.5 rounded text-center mb-1 border " + getStatusBadgeClass(status);

      // Render Items Table
      const tableBody = document.getElementById('prevItemsTable');
      tableBody.innerHTML = '';

      let subtotal = 0;

      if (currentItems.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-slate-400 italic">Nenhum item adicionado à ordem de serviço.</td></tr>`;
      } else {
        currentItems.forEach(item => {
          const itemTotal = Math.round(item.qty * Math.round(item.unitPrice * 100)) / 100;
          subtotal += itemTotal;

          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td class="py-2 px-2 text-center font-bold">${item.qty}</td>
            <td class="py-2 px-2 font-medium">${escapeHtml(item.description || 'Item de Produção')}</td>
            <td class="py-2 px-2 text-slate-500">${escapeHtml(item.material || '--')}</td>
            <td class="py-2 px-2 text-right">R$ ${item.unitPrice.toFixed(2).replace('.', ',')}</td>
            <td class="py-2 px-2 text-right font-bold">R$ ${itemTotal.toFixed(2).replace('.', ',')}</td>
          `;
          tableBody.appendChild(tr);
        });
      }

      // Calculations
      const total = Math.max(0, subtotal - discount);
      const balance = Math.max(0, total - deposit);

      document.getElementById('prevSubtotal').innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
      
      if (discount > 0) {
        document.getElementById('prevDiscountRow').classList.remove('hidden');
        document.getElementById('prevDiscount').innerText = `- R$ ${discount.toFixed(2).replace('.', ',')}`;
      } else {
        document.getElementById('prevDiscountRow').classList.add('hidden');
      }

      document.getElementById('prevTotal').innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;

      if (deposit > 0) {
        document.getElementById('prevDepositRow').classList.remove('hidden');
        document.getElementById('prevDeposit').innerText = `- R$ ${deposit.toFixed(2).replace('.', ',')}`;
      } else {
        document.getElementById('prevDepositRow').classList.add('hidden');
      }

      document.getElementById('prevBalance').innerText = `R$ ${balance.toFixed(2).replace('.', ',')}`;
      document.getElementById('prevCanhotoBalance').innerText = `R$ ${balance.toFixed(2).replace('.', ',')}`;
    }

    // FORM ACTIONS & PERSISTENCE
    function resetForm() {
      currentOsId = null; currentVersion = 0; approvedAt = ''; savedStatus = '';  createKey = crypto.randomUUID(); dirty = false; companyConfig = structuredClone(serverCompany); renderCompanyInfo();
      document.getElementById('paymentPanel').hidden = true;
      document.getElementById('osDeposit').readOnly = false;
      // Auto-generate OS Number
      document.getElementById('osNumber').value = 'Ao salvar';
      
      document.getElementById('osStatus').value = quoteMode ? 'Orçamento' : 'Em Produção';
      const validity = new Date(); validity.setDate(validity.getDate()+7);
      document.getElementById('quoteValidUntil').value = quoteMode ? localDate(validity) : '';
      setTodayDate();
      document.getElementById('clientName').value = '';
      document.getElementById('clientPhone').value = '';
      document.getElementById('clientDocument').value = '';
      document.getElementById('osPaymentMethod').value = 'Pix';
      document.getElementById('osDeposit').value = '';
      document.getElementById('osDiscount').value = '';
      document.getElementById('osNotes').value = '';

      currentItems = [];
      // Default initial item
      addItemRow('', '', 1, 0); dirty = false;
    }

    // MANAGE OS LIST VIEW
    function renderOsTable() {
      const tbody = document.getElementById('osListTableBody');
      const emptyState = document.getElementById('emptyState');
      const search = document.getElementById('searchOs').value.toLowerCase();
      const statusFilter = document.getElementById('filterStatus').value;

      tbody.innerHTML = '';

      const filtered = osList.filter(os => {
        const matchSearch = os.clientName.toLowerCase().includes(search) || os.number.includes(search);
        const matchStatus = statusFilter === 'Todos' || os.status === statusFilter;
        return matchSearch && matchStatus;
      });

      if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        return;
      }

      emptyState.classList.add('hidden');

      filtered.forEach(os => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition-colors";
        tr.innerHTML = `
          <td class="p-3.5 font-bold font-mono text-slate-900">#${escapeHtml(os.number)}</td>
          <td class="p-3.5">
            <div class="font-medium">${formatDate(os.date)}</div>
            <div class="text-[10px] text-slate-400">Entrega: ${formatDate(os.deliveryDate)}</div>
          </td>
          <td class="p-3.5">
            <div class="font-bold text-slate-800">${escapeHtml(os.clientName)}</div>
            <div class="text-[10px] text-slate-400">${escapeHtml(os.clientPhone || '')}</div>
          </td>
          <td class="p-3.5">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadgeClass(os.status)}">
              ${escapeHtml(os.status)}
            </span>
          </td>
          <td class="p-3.5 text-right font-bold text-slate-800">
            R$ ${os.total.toFixed(2).replace('.', ',')}
          </td>
          <td class="p-3.5 text-right font-bold ${os.balance > 0 ? 'text-red-600' : 'text-emerald-600'}">
            R$ ${os.balance.toFixed(2).replace('.', ',')}
          </td>
          <td class="p-3.5 text-center space-x-1">
            <button onclick="editOS('${os.id}')" title="Editar / Imprimir" class="px-2 py-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button onclick="deleteOS('${os.id}')" title="Cancelar ordem" class="px-2 py-1 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    // COMPANY CONFIG MANAGEMENT
    function handleLogoUpload(e) {
      const file = e.target.files[0];
      if (!file) return;

      if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 1000000) { alert('Use PNG, JPEG ou WebP de até 1 MB.'); return; }
      logoLoading = true;
      const reader = new FileReader();
      reader.onerror = () => { logoLoading=false; notice("Não foi possível ler a logo."); };
      reader.onload = function(evt) {
        logoLoading = false;
        pendingLogo = evt.target.result;
        document.getElementById('companyLogoPreview').src = evt.target.result;
        document.getElementById('companyLogoPreview').classList.remove('hidden');
        document.getElementById('companyLogoPlaceholder').classList.add('hidden');
        renderCompanyInfo();
      };
      reader.readAsDataURL(file);
    }

    // TABS SWITCHING
    function switchTabOriginal(tab) {
      const vNew = document.getElementById('viewNewOs');
      const vList = document.getElementById('viewList');
      const vComp = document.getElementById('viewCompany');

      const tNew = document.getElementById('tabNewOs');
      const tList = document.getElementById('tabList');
      const tComp = document.getElementById('tabCompany');

      vNew.classList.add('hidden');
      vList.classList.add('hidden');
      vComp.classList.add('hidden');

      tNew.className = "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all";
      tList.className = "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all";
      tComp.className = "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all";

      if (tab === 'newOs') {
        vNew.classList.remove('hidden');
        tNew.className = "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all bg-blue-600 text-white shadow";
        renderPreview();
      } else if (tab === 'list') {
        vList.classList.remove('hidden');
        tList.className = "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all bg-blue-600 text-white shadow";
        renderOsTable();
      } else if (tab === 'company') {
        vComp.classList.remove('hidden');
        tComp.className = "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all bg-blue-600 text-white shadow";
      }
    }

    // HELPERS
    function formatDate(dateStr) {
      if (!dateStr) return '--/--/----';
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }

    function getStatusBadgeClass(status) {
      switch (status) {
        case 'Orçamento': return 'bg-amber-50 text-amber-700 border-amber-300';
        case 'Aguardando Aprovação': return 'bg-orange-50 text-orange-700 border-orange-300';
        case 'Em Produção': return 'bg-blue-50 text-blue-700 border-blue-300';
        case 'Pronto para Retirada': return 'bg-purple-50 text-purple-700 border-purple-300';
        case 'Entregue': return 'bg-emerald-50 text-emerald-700 border-emerald-300';
        case 'Recusado':
        case 'Cancelado': return 'bg-red-50 text-red-700 border-red-300';
        default: return 'bg-slate-50 text-slate-700 border-slate-300';
      }
    }
