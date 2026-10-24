import { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import TransactionModal from './TransactionModal';
import './styles/base.css';
import './styles/navbar.css';
import './styles/tabs.css';
import './styles/table.css';
import './styles/inventory.css';
import './styles/modal.css';

const SIZES = ['S', 'M', 'L', 'XL'];
const GENDERS = ['Hombre', 'Mujer'];

const PRESET_COLORS = [
  { name: 'Negro', hex: '#111827' },
  { name: 'Blanco', hex: '#ffffff' },
  { name: 'Gris Jaspe', hex: '#64748b' },
  { name: 'Azul Marino', hex: '#111e38' },
  { name: 'Azul Rey', hex: '#1d4ed8' },
  { name: 'Rojo', hex: '#dc2626' },
  { name: 'Vino / Tinto', hex: '#4c0519' },
  { name: 'Verde Militar', hex: '#2d3b22' },
  { name: 'Mostaza', hex: '#ca8a04' },
  { name: 'Beige / Arena', hex: '#d4c5a9' },
  { name: 'Rosa Pastel', hex: '#f472b6' },
];

const QUARTERS = [
  { id: 'Q1', name: 'Q1 (Ene - Mar)', startMonth: 0, endMonth: 2 },
  { id: 'Q2', name: 'Q2 (Abr - Jun)', startMonth: 3, endMonth: 5 },
  { id: 'Q3', name: 'Q3 (Jul - Sep)', startMonth: 6, endMonth: 8 },
  { id: 'Q4', name: 'Q4 (Oct - Dic)', startMonth: 9, endMonth: 11 },
];

function isColorLight(hex) {
  if (!hex) return false;
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance >= 165;
}

export default function MoneyControl() {
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' | 'inventory'
  const [inventorySubTab, setInventorySubTab] = useState('shirts'); // 'shirts' | 'mugs' | 'playmats'
  const [txTypeFilter, setTxTypeFilter] = useState('all'); // 'all' (Neto) | 'income' | 'expense'
  const [loading, setLoading] = useState(true);

  // Estados de datos
  const [transactions, setTransactions] = useState([]);
  const [inventory, setInventory] = useState([]); // Playeras
  const [otherInventory, setOtherInventory] = useState([]); // Tazas y Playmats / Pads

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState(null);
  const [isAddShirtModalOpen, setIsAddShirtModalOpen] = useState(false);
  const [shirtToDelete, setShirtToDelete] = useState(null);

  // Modales de Tazas / Playmats
  const [isAddOtherModalOpen, setIsAddOtherModalOpen] = useState(false);
  const [newOtherCategory, setNewOtherCategory] = useState('Tazas');
  const [newOtherName, setNewOtherName] = useState('');
  const [newOtherSpec, setNewOtherSpec] = useState('');
  const [newOtherHex, setNewOtherHex] = useState('#ffffff');
  const [itemToDelete, setItemToDelete] = useState(null);

  // Formulario nuevo color de playeras
  const [newShirtColorName, setNewShirtColorName] = useState('');
  const [newShirtHex, setNewShirtHex] = useState('#38bdf8');
  const [newShirtGender, setNewShirtGender] = useState('Hombre');

  // Filtros de fecha / período
  const [filterMode, setFilterMode] = useState('quarter');
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const defaultQuarterId = `Q${Math.floor(currentMonth / 3) + 1}`;
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState(defaultQuarterId);

  // Filtro género playeras
  const [inventoryGenderFilter, setInventoryGenderFilter] = useState('Todos');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Transacciones
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });
      if (!txError) setTransactions(txData || []);

      // 2. Inventario de Playeras
      const { data: invData, error: invError } = await supabase
        .from('shirt_inventory')
        .select('*')
        .order('created_at', { ascending: true });
      if (!invError) setInventory(invData || []);

      // 3. Inventario de Tazas y Playmats (tabla nueva)
      const { data: othersData, error: othersError } = await supabase
        .from('other_inventory')
        .select('*')
        .order('created_at', { ascending: true });
      if (!othersError) setOtherInventory(othersData || []);
    } catch (err) {
      console.error('Error al conectar con Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  // Guardar transacción
  const handleSaveTransaction = async (newTx) => {
    setTransactions((prev) => [newTx, ...prev]);

    if (newTx.inventoryDeductions && newTx.inventoryDeductions.length > 0) {
      for (const item of newTx.inventoryDeductions) {
        const colName = `size_${item.size.toLowerCase()}`;
        const card = inventory.find(
          (c) =>
            c.color.toLowerCase() === item.color.toLowerCase() &&
            c.gender === item.gender
        );

        if (card) {
          const currentQty = card[colName] || 0;
          const newQty = Math.max(0, currentQty - item.quantity);

          setInventory((prev) =>
            prev.map((c) => (c.id === card.id ? { ...c, [colName]: newQty } : c))
          );

          await supabase
            .from('shirt_inventory')
            .update({ [colName]: newQty })
            .eq('id', card.id);
        }
      }
    }

    const storedDetails =
      newTx.inventoryDeductions && newTx.inventoryDeductions.length > 0
        ? `${newTx.details || ''} __DEDUCTIONS__:${JSON.stringify(newTx.inventoryDeductions)}`
        : newTx.details || '';

    const { error } = await supabase.from('transactions').insert([
      {
        id: newTx.id,
        type: newTx.type,
        amount: Number(newTx.amount),
        category: newTx.category,
        description: newTx.description,
        date: newTx.date,
        details: storedDetails,
      },
    ]);

    if (error) {
      console.error('Error insertando en Supabase:', error);
      fetchData();
    }
  };

  const handleDateChange = async (id, newDate) => {
    if (!newDate) return;
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, date: newDate } : t))
    );
    await supabase.from('transactions').update({ date: newDate }).eq('id', id);
  };

  const promptDeleteTx = (tx) => setTxToDelete(tx);
  const cancelDeleteTx = () => setTxToDelete(null);

  const confirmDeleteTx = async () => {
    if (!txToDelete) return;
    const targetId = txToDelete.id;

    let deductionsToRestore = [];
    if (txToDelete.inventoryDeductions && txToDelete.inventoryDeductions.length > 0) {
      deductionsToRestore = txToDelete.inventoryDeductions;
    } else if (txToDelete.details && txToDelete.details.includes('__DEDUCTIONS__:')) {
      try {
        const parts = txToDelete.details.split('__DEDUCTIONS__:');
        deductionsToRestore = JSON.parse(parts[1]);
      } catch (err) {
        console.error('Error deducciones:', err);
      }
    }

    if (deductionsToRestore.length > 0) {
      for (const item of deductionsToRestore) {
        const colName = `size_${item.size.toLowerCase()}`;
        const card = inventory.find(
          (c) =>
            c.color.toLowerCase() === item.color.toLowerCase() &&
            c.gender === item.gender
        );

        if (card) {
          const currentQty = card[colName] || 0;
          const restoredQty = currentQty + Number(item.quantity);

          setInventory((prev) =>
            prev.map((c) => (c.id === card.id ? { ...c, [colName]: restoredQty } : c))
          );

          await supabase
            .from('shirt_inventory')
            .update({ [colName]: restoredQty })
            .eq('id', card.id);
        }
      }
    }

    setTransactions((prev) => prev.filter((t) => t.id !== targetId));
    setTxToDelete(null);
    await supabase.from('transactions').delete().eq('id', targetId);
  };

  // Stock Playeras (+ / -)
  const handleStockChange = async (cardId, size, delta) => {
    const colName = `size_${size.toLowerCase()}`;
    const targetItem = inventory.find((i) => i.id === cardId);
    if (!targetItem) return;

    const currentQty = targetItem[colName] || 0;
    const newQty = Math.max(0, currentQty + delta);

    setInventory((prev) =>
      prev.map((card) =>
        card.id === cardId ? { ...card, [colName]: newQty } : card
      )
    );

    await supabase
      .from('shirt_inventory')
      .update({ [colName]: newQty })
      .eq('id', cardId);
  };

  // Stock Tazas y Playmats (+ / -)
  const handleOtherStockChange = async (itemId, delta) => {
    const targetItem = otherInventory.find((i) => i.id === itemId);
    if (!targetItem) return;

    const newQty = Math.max(0, (targetItem.quantity || 0) + delta);

    setOtherInventory((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity: newQty } : item))
    );

    await supabase
      .from('other_inventory')
      .update({ quantity: newQty })
      .eq('id', itemId);
  };

  // Crear Playera
  const handleCreateShirtSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = newShirtColorName.trim();
    if (!trimmedName) return;

    const generatedId = `${trimmedName}_${newShirtGender}`.replace(/\s+/g, '_');
    if (inventory.some((i) => i.id === generatedId)) {
      alert(`Ya existe una tarjeta para ${trimmedName} (${newShirtGender}).`);
      return;
    }

    const newCard = {
      id: generatedId,
      color: trimmedName,
      gender: newShirtGender,
      hex: newShirtHex,
      size_s: 0,
      size_m: 0,
      size_l: 0,
      size_xl: 0,
    };

    setInventory((prev) => [newCard, ...prev]);
    setIsAddShirtModalOpen(false);
    setNewShirtColorName('');
    setNewShirtHex('#38bdf8');

    await supabase.from('shirt_inventory').insert([newCard]);
  };

  // Crear Taza o Playmat
  const handleCreateOtherSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = newOtherName.trim();
    if (!trimmedName) return;

    const generatedId = `${newOtherCategory}_${trimmedName}_${Date.now()}`.replace(/\s+/g, '_');
    const newItem = {
      id: generatedId,
      category: newOtherCategory,
      name: trimmedName,
      spec: newOtherSpec.trim() || (newOtherCategory === 'Tazas' ? '11oz' : '60x35cm'),
      hex: newOtherHex,
      quantity: 0,
    };

    setOtherInventory((prev) => [newItem, ...prev]);
    setIsAddOtherModalOpen(false);
    setNewOtherName('');
    setNewOtherSpec('');

    await supabase.from('other_inventory').insert([newItem]);
  };

  // Eliminar Taza o Playmat
  const confirmDeleteOtherItem = async () => {
    if (!itemToDelete) return;
    const targetId = itemToDelete.id;

    setOtherInventory((prev) => prev.filter((i) => i.id !== targetId));
    setItemToDelete(null);

    await supabase.from('other_inventory').delete().eq('id', targetId);
  };

  // Eliminar Playera
  const promptDeleteShirt = (item) => setShirtToDelete(item);
  const cancelDeleteShirt = () => setShirtToDelete(null);
  const confirmDeleteShirt = async () => {
    if (!shirtToDelete) return;
    const targetId = shirtToDelete.id;

    setInventory((prev) => prev.filter((i) => i.id !== targetId));
    setShirtToDelete(null);

    await supabase.from('shirt_inventory').delete().eq('id', targetId);
  };

  // Cálculos de stocks
  const getCardTotalUnits = (card) => {
    return (
      (Number(card.size_s) || 0) +
      (Number(card.size_m) || 0) +
      (Number(card.size_l) || 0) +
      (Number(card.size_xl) || 0)
    );
  };

  const totalShirtsStock = useMemo(() => {
    return inventory.reduce((acc, card) => acc + getCardTotalUnits(card), 0);
  }, [inventory]);

  const totalMugsStock = useMemo(() => {
    return otherInventory
      .filter((i) => i.category === 'Tazas')
      .reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
  }, [otherInventory]);

  const totalPlaymatsStock = useMemo(() => {
    return otherInventory
      .filter((i) => i.category === 'Playmats')
      .reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
  }, [otherInventory]);

  const totalGlobalStock = totalShirtsStock + totalMugsStock + totalPlaymatsStock;

  const availableYears = useMemo(() => {
    const yearsSet = new Set([currentYear, currentYear - 1, currentYear + 1]);
    transactions.forEach((tx) => {
      if (tx.date) {
        const y = parseInt(String(tx.date).split('-')[0], 10);
        if (!isNaN(y)) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [transactions, currentYear]);

  // Transacciones acotadas por período
  const periodTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (filterMode === 'total') return true;
      if (!tx.date) return false;

      const [yStr, mStr] = String(tx.date).split('-');
      const txYear = parseInt(yStr, 10);
      const txMonth = parseInt(mStr, 10) - 1;

      if (filterMode === 'year') {
        return txYear === Number(selectedYear);
      }

      if (filterMode === 'quarter') {
        if (txYear !== Number(selectedYear)) return false;
        const qConfig = QUARTERS.find((q) => q.id === selectedQuarter);
        if (!qConfig) return true;
        return txMonth >= qConfig.startMonth && txMonth <= qConfig.endMonth;
      }

      return true;
    });
  }, [transactions, filterMode, selectedYear, selectedQuarter]);

  const filteredMetrics = useMemo(() => {
    let s = 0;
    let e = 0;
    periodTransactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'income') s += amt;
      if (tx.type === 'expense') e += amt;
    });
    return { sales: s, expenses: e, total: s - e };
  }, [periodTransactions]);

  const tableTransactions = useMemo(() => {
    if (txTypeFilter === 'income') {
      return periodTransactions.filter((tx) => tx.type === 'income');
    }
    if (txTypeFilter === 'expense') {
      return periodTransactions.filter((tx) => tx.type === 'expense');
    }
    return periodTransactions;
  }, [periodTransactions, txTypeFilter]);

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      return (
        inventoryGenderFilter === 'Todos' ||
        item.gender === inventoryGenderFilter
      );
    });
  }, [inventory, inventoryGenderFilter]);

  const formatMoney = (val) =>
    `$${Number(val).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  const getPeriodLabel = () => {
    if (filterMode === 'total') return 'Histórico Total';
    if (filterMode === 'year') return `Año ${selectedYear}`;
    if (filterMode === 'quarter') {
      const q = QUARTERS.find((item) => item.id === selectedQuarter);
      return `${q ? q.name : selectedQuarter} ${selectedYear}`;
    }
    return '';
  };

  const getColorHex = (item) => {
    if (item.hex) return item.hex;
    const match = PRESET_COLORS.find(
      (c) => c.name.toLowerCase() === item.color.toLowerCase()
    );
    return match ? match.hex : '#38bdf8';
  };

  const handleMetricCardClick = (type) => {
    setActiveTab('transactions');
    setTxTypeFilter(type);
  };

  return (
    <div className="money-page">
      <header
        className="money-nav"
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.6rem',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '900px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
              width: '100%',
            }}
          >
            <div className="nav-title-group" style={{ margin: 0 }}>
              <span className="brand-badge">SAD KOALA</span>
              <h1 className="brand-title">Control Financiero & Almacén</h1>
            </div>

            {/* SELECTOR DE PERÍODO */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  gap: '0.35rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  padding: '4px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <button
                  type="button"
                  className={`btn-period ${filterMode === 'quarter' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '0.55rem 0.2rem', textAlign: 'center', justifyContent: 'center', margin: 0 }}
                  onClick={() => setFilterMode('quarter')}
                >
                  Trimestre
                </button>
                <button
                  type="button"
                  className={`btn-period ${filterMode === 'year' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '0.55rem 0.2rem', textAlign: 'center', justifyContent: 'center', margin: 0 }}
                  onClick={() => setFilterMode('year')}
                >
                  Año
                </button>
                <button
                  type="button"
                  className={`btn-period ${filterMode === 'total' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '0.55rem 0.2rem', textAlign: 'center', justifyContent: 'center', margin: 0 }}
                  onClick={() => setFilterMode('total')}
                >
                  Total
                </button>
              </div>

              {filterMode === 'quarter' && (
                <div style={{ display: 'flex', width: '100%', gap: '0.4rem' }}>
                  <select
                    className="period-sub-select"
                    style={{ flex: 2, minWidth: 0, padding: '0.55rem 0.6rem', background: '#0c1527', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}
                    value={selectedQuarter}
                    onChange={(e) => setSelectedQuarter(e.target.value)}
                  >
                    {QUARTERS.map((q) => (
                      <option key={q.id} value={q.id}>{q.name}</option>
                    ))}
                  </select>
                  <select
                    className="period-sub-select"
                    style={{ flex: 1, minWidth: 0, padding: '0.55rem 0.6rem', background: '#0c1527', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                  >
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
              )}

              {filterMode === 'year' && (
                <div style={{ display: 'flex', width: '100%' }}>
                  <select
                    className="period-sub-select"
                    style={{ width: '100%', padding: '0.55rem 0.6rem', background: '#0c1527', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                  >
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* BOTONES INTERACTIVOS: VENTAS, GASTOS, NETO Y ALMACÉN STOCK */}
              <nav
                className="nav-metrics-container"
                style={{
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '0.5rem',
                  marginTop: '0.2rem',
                }}
              >
                <div
                  className={`metric-box box-sales metric-nav-btn ${
                    activeTab === 'transactions' && txTypeFilter === 'income' ? 'active-nav-card' : ''
                  }`}
                  onClick={() => handleMetricCardClick('income')}
                  title="Ver sólo Ventas"
                  style={{ cursor: 'pointer' }}
                >
                  <span className="metric-lbl">
                    Ventas ({filterMode === 'total' ? 'Total' : filterMode === 'year' ? selectedYear : selectedQuarter})
                  </span>
                  <span className="metric-val">{formatMoney(filteredMetrics.sales)}</span>
                </div>

                <div
                  className={`metric-box box-expenses metric-nav-btn ${
                    activeTab === 'transactions' && txTypeFilter === 'expense' ? 'active-nav-card' : ''
                  }`}
                  onClick={() => handleMetricCardClick('expense')}
                  title="Ver sólo Gastos"
                  style={{ cursor: 'pointer' }}
                >
                  <span className="metric-lbl">
                    Gastos ({filterMode === 'total' ? 'Total' : filterMode === 'year' ? selectedYear : selectedQuarter})
                  </span>
                  <span className="metric-val">{formatMoney(filteredMetrics.expenses)}</span>
                </div>

                <div
                  className={`metric-box metric-nav-btn ${
                    filteredMetrics.total >= 0 ? 'box-total-pos' : 'box-total-neg'
                  } ${activeTab === 'transactions' && txTypeFilter === 'all' ? 'active-nav-card' : ''}`}
                  onClick={() => handleMetricCardClick('all')}
                  title="Ver Neto (Ventas y Gastos)"
                  style={{ cursor: 'pointer' }}
                >
                  <span className="metric-lbl">
                    Neto ({filterMode === 'total' ? 'Total' : filterMode === 'year' ? selectedYear : selectedQuarter})
                  </span>
                  <span className="metric-val">{formatMoney(filteredMetrics.total)}</span>
                </div>

                {/* BOTÓN ALMACÉN GENERAL */}
                <div
                  className={`metric-box box-shirts-total metric-nav-btn ${
                    activeTab === 'inventory' ? 'active-nav-card' : ''
                  }`}
                  onClick={() => setActiveTab('inventory')}
                  title="Abrir Almacén de Stock"
                  style={{ cursor: 'pointer' }}
                >
                  <span className="metric-lbl">Almacén Stock</span>
                  <span className="metric-val metric-val-shirts">
                    {totalGlobalStock} <span className="metric-unit">pzas</span>
                  </span>
                </div>
              </nav>
            </div>
          </div>

          {/* ========================================================
              SUBMENÚ DE ALMACÉN: PLAYERAS | TAZAS | PLAYMATS
             ======================================================== */}
          {activeTab === 'inventory' && (
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                marginTop: '0.4rem',
              }}
            >
              {/* SUBPESTAÑAS */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.35rem',
                  background: 'rgba(11, 23, 42, 0.9)',
                  padding: '4px',
                  borderRadius: '10px',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                }}
              >
                <button
                  type="button"
                  className={`btn-period ${inventorySubTab === 'shirts' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '0.55rem 0.2rem', textAlign: 'center', fontWeight: 700 }}
                  onClick={() => setInventorySubTab('shirts')}
                >
                  👕 Playeras ({totalShirtsStock})
                </button>
                <button
                  type="button"
                  className={`btn-period ${inventorySubTab === 'mugs' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '0.55rem 0.2rem', textAlign: 'center', fontWeight: 700 }}
                  onClick={() => setInventorySubTab('mugs')}
                >
                  ☕ Tazas ({totalMugsStock})
                </button>
                <button
                  type="button"
                  className={`btn-period ${inventorySubTab === 'playmats' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '0.55rem 0.2rem', textAlign: 'center', fontWeight: 700 }}
                  onClick={() => setInventorySubTab('playmats')}
                >
                  🖱️ Playmats / Pads ({totalPlaymatsStock})
                </button>
              </div>

              {/* BOTONES ESPECÍFICOS SEGÚN SUBPESTAÑA */}
              {inventorySubTab === 'shirts' && (
                <>
                  <button
                    type="button"
                    className="btn-add-shirt-card"
                    style={{ width: '100%', padding: '0.65rem 1.25rem', fontSize: '0.92rem', margin: 0 }}
                    onClick={() => setIsAddShirtModalOpen(true)}
                  >
                    + Crear Nuevo Color de Playera
                  </button>

                  <div className="gender-toggle-group" style={{ margin: 0, width: '100%', display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className={`btn-gender-filter ${inventoryGenderFilter === 'Todos' ? 'active' : ''}`}
                      style={{ flex: 1, padding: '0.6rem 0.5rem', fontSize: '0.9rem' }}
                      onClick={() => setInventoryGenderFilter('Todos')}
                    >
                      👥 Todos
                    </button>
                    <button
                      type="button"
                      className={`btn-gender-filter btn-gender-male ${inventoryGenderFilter === 'Hombre' ? 'active' : ''}`}
                      style={{ flex: 1, padding: '0.6rem 0.5rem', fontSize: '0.9rem' }}
                      onClick={() => setInventoryGenderFilter('Hombre')}
                    >
                      ♂ Hombre
                    </button>
                    <button
                      type="button"
                      className={`btn-gender-filter btn-gender-female ${inventoryGenderFilter === 'Mujer' ? 'active' : ''}`}
                      style={{ flex: 1, padding: '0.6rem 0.5rem', fontSize: '0.9rem' }}
                      onClick={() => setInventoryGenderFilter('Mujer')}
                    >
                      ♀ Mujer
                    </button>
                  </div>
                </>
              )}

              {inventorySubTab === 'mugs' && (
                <button
                  type="button"
                  className="btn-add-shirt-card"
                  style={{ width: '100%', padding: '0.65rem 1.25rem', fontSize: '0.92rem', margin: 0 }}
                  onClick={() => {
                    setNewOtherCategory('Tazas');
                    setNewOtherName('');
                    setNewOtherSpec('11oz cerámica');
                    setNewOtherHex('#ffffff');
                    setIsAddOtherModalOpen(true);
                  }}
                >
                  + Agregar Color / Modelo de Taza
                </button>
              )}

              {inventorySubTab === 'playmats' && (
                <button
                  type="button"
                  className="btn-add-shirt-card"
                  style={{ width: '100%', padding: '0.65rem 1.25rem', fontSize: '0.92rem', margin: 0 }}
                  onClick={() => {
                    setNewOtherCategory('Playmats');
                    setNewOtherName('');
                    setNewOtherSpec('60x35cm TCG');
                    setNewOtherHex('#1e293b');
                    setIsAddOtherModalOpen(true);
                  }}
                >
                  + Agregar Tamaño / Medida de Playmat o Mousepad
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="money-main" style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        {loading ? (
          <div className="empty-box" style={{ padding: '3rem', fontSize: '1.1rem' }}>
            ⚡ Consultando Supabase...
          </div>
        ) : (
          <>
            {/* VISTA 1: HISTORIAL DE MOVIMIENTOS */}
            {activeTab === 'transactions' && (
              <>
                <div className="table-top-bar">
                  <h2 className="section-title">
                    Historial:{' '}
                    <span style={{ color: txTypeFilter === 'income' ? '#38bdf8' : txTypeFilter === 'expense' ? '#f87171' : '#4ade80' }}>
                      {txTypeFilter === 'income' ? 'Solo Ventas' : txTypeFilter === 'expense' ? 'Solo Gastos' : 'Entradas y Salidas (Neto)'}
                    </span>{' '}
                    <span className="period-subtitle">({getPeriodLabel()})</span>
                  </h2>
                  <button
                    type="button"
                    className="btn-create-modal"
                    onClick={() => setIsModalOpen(true)}
                  >
                    + Registrar Venta / Compra
                  </button>
                </div>

                <div className="block-table-container">
                  <div className="block-row block-header-row">
                    <div className="block-cell header-cell cell-date-header">Fecha</div>
                    <div className="block-cell header-cell">Tipo</div>
                    <div className="block-cell header-cell">Categoría</div>
                    <div className="block-cell header-cell cell-desc">Detalle & Desglose</div>
                    <div className="block-cell header-cell">Monto</div>
                    <div className="block-cell header-cell cell-action">Acción</div>
                  </div>

                  {tableTransactions.length === 0 ? (
                    <div className="empty-box">
                      No hay {txTypeFilter === 'income' ? 'ventas' : txTypeFilter === 'expense' ? 'gastos' : 'movimientos'} registrados en Supabase para{' '}
                      <strong>{getPeriodLabel()}</strong>.
                    </div>
                  ) : (
                    tableTransactions.map((tx) => (
                      <div key={tx.id} className="block-row data-row">
                        <div className="block-cell cell-date">
                          <input
                            type="date"
                            className="table-date-input"
                            value={tx.date}
                            onChange={(e) => handleDateChange(tx.id, e.target.value)}
                            title="Haz clic para modificar la fecha"
                          />
                        </div>

                        <div className="block-cell">
                          <span className={`badge-pill ${tx.type === 'income' ? 'pill-income' : 'pill-expense'}`}>
                            {tx.type === 'income' ? 'VENTA' : 'GASTO'}
                          </span>
                        </div>

                        <div className="block-cell cell-cat">{tx.category}</div>

                        <div className="block-cell cell-desc">
                          <span className="desc-main-text">{tx.description}</span>
                          {tx.details && (
                            <span className="desc-sub-text">
                              {tx.details.split('__DEDUCTIONS__:')[0]}
                            </span>
                          )}
                        </div>

                        <div className={`block-cell cell-amount ${tx.type === 'income' ? 'txt-income' : 'txt-expense'}`}>
                          {tx.type === 'income' ? `+${formatMoney(tx.amount)}` : `-${formatMoney(tx.amount)}`}
                        </div>

                        <div className="block-cell cell-action">
                          <button
                            type="button"
                            className="btn-delete-row"
                            onClick={() => promptDeleteTx(tx)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* VISTA 2: ALMACÉN COMPLETO */}
            {activeTab === 'inventory' && (
              <section className="inventory-section" style={{ width: '100%', margin: 0, padding: 0 }}>
                {/* 2.1 PLAYERAS */}
                {inventorySubTab === 'shirts' && (
                  filteredInventory.length === 0 ? (
                    <div className="empty-box">
                      No hay playeras registradas en <code>shirt_inventory</code>.
                    </div>
                  ) : (
                    <div className="inventory-matrix-grid" style={{ width: '100%' }}>
                      {filteredInventory.map((item) => {
                        const hexColor = getColorHex(item);
                        const isLight = isColorLight(hexColor);
                        const cardTotal = getCardTotalUnits(item);

                        return (
                          <div
                            key={item.id}
                            className={`inventory-matrix-card shirt-colored-card ${isLight ? 'card-theme-light' : 'card-theme-dark'}`}
                            style={{ '--card-shirt-color': hexColor }}
                          >
                            <div className="inv-matrix-header">
                              <div className="inv-matrix-title-wrap">
                                <span className="inv-color-title" title={item.color}>{item.color}</span>
                                <span className="inv-tag">
                                  {item.gender === 'Hombre' && '♂ '}
                                  {item.gender === 'Mujer' && '♀ '}
                                  {item.gender}
                                </span>
                              </div>
                              <div className="inv-matrix-header-right">
                                <span className="inv-card-total-pill">
                                  Total: <strong>{cardTotal}</strong> pzas
                                </span>
                                <button
                                  type="button"
                                  className="btn-remove-shirt-card"
                                  onClick={() => promptDeleteShirt(item)}
                                  title="Eliminar este color"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>

                            <div className="inv-sizes-matrix">
                              {SIZES.map((size) => {
                                const colKey = `size_${size.toLowerCase()}`;
                                const qty = item[colKey] || 0;
                                return (
                                  <div key={size} className="size-row-pill">
                                    <span className="size-label">{size}</span>
                                    <span className="size-qty-num">{qty}</span>
                                    <div className="size-btn-group">
                                      <button
                                        type="button"
                                        className="btn-mini-qty"
                                        onClick={() => handleStockChange(item.id, size, -1)}
                                        disabled={qty === 0}
                                      >
                                        -
                                      </button>
                                      <button
                                        type="button"
                                        className="btn-mini-qty"
                                        onClick={() => handleStockChange(item.id, size, 1)}
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}

                {/* 2.2 TAZAS */}
                {inventorySubTab === 'mugs' && (
                  otherInventory.filter((i) => i.category === 'Tazas').length === 0 ? (
                    <div className="empty-box">
                      No hay modelos de tazas guardados todavía. Haz clic arriba en <strong>"+ Agregar Color / Modelo de Taza"</strong>.
                    </div>
                  ) : (
                    <div className="inventory-matrix-grid" style={{ width: '100%' }}>
                      {otherInventory.filter((i) => i.category === 'Tazas').map((item) => {
                        const isLight = isColorLight(item.hex || '#ffffff');
                        return (
                          <div
                            key={item.id}
                            className={`inventory-matrix-card shirt-colored-card ${isLight ? 'card-theme-light' : 'card-theme-dark'}`}
                            style={{ '--card-shirt-color': item.hex || '#ffffff' }}
                          >
                            <div className="inv-matrix-header">
                              <div className="inv-matrix-title-wrap">
                                <span className="inv-color-title">{item.name}</span>
                                <span className="inv-tag">{item.spec || '11oz'}</span>
                              </div>
                              <button
                                type="button"
                                className="btn-remove-shirt-card"
                                onClick={() => setItemToDelete(item)}
                                title="Eliminar taza"
                              >
                                ✕
                              </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 0.4rem 0.2rem' }}>
                              <span style={{ fontSize: '0.9rem', color: isLight ? '#0f172a' : '#cbd5e1', fontWeight: 600 }}>
                                En Existencia:
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <button
                                  type="button"
                                  className="btn-mini-qty"
                                  style={{ width: '32px', height: '32px', fontSize: '1rem' }}
                                  onClick={() => handleOtherStockChange(item.id, -1)}
                                  disabled={item.quantity === 0}
                                >
                                  -
                                </button>
                                <strong style={{ fontSize: '1.25rem', minWidth: '32px', textAlign: 'center', color: isLight ? '#0f172a' : '#ffffff' }}>
                                  {item.quantity}
                                </strong>
                                <button
                                  type="button"
                                  className="btn-mini-qty"
                                  style={{ width: '32px', height: '32px', fontSize: '1rem' }}
                                  onClick={() => handleOtherStockChange(item.id, 1)}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}

                {/* 2.3 PLAYMATS Y MOUSEPADS */}
                {inventorySubTab === 'playmats' && (
                  otherInventory.filter((i) => i.category === 'Playmats').length === 0 ? (
                    <div className="empty-box">
                      No hay tamaños de Playmat o Mousepad guardados todavía. Haz clic arriba en <strong>"+ Agregar Tamaño / Medida"</strong>.
                    </div>
                  ) : (
                    <div className="inventory-matrix-grid" style={{ width: '100%' }}>
                      {otherInventory.filter((i) => i.category === 'Playmats').map((item) => {
                        const isLight = isColorLight(item.hex || '#1e293b');
                        return (
                          <div
                            key={item.id}
                            className={`inventory-matrix-card shirt-colored-card ${isLight ? 'card-theme-light' : 'card-theme-dark'}`}
                            style={{ '--card-shirt-color': item.hex || '#1e293b' }}
                          >
                            <div className="inv-matrix-header">
                              <div className="inv-matrix-title-wrap">
                                <span className="inv-color-title">{item.name}</span>
                                <span className="inv-tag" style={{ background: '#38bdf8', color: '#0f172a', fontWeight: 700 }}>
                                  {item.spec}
                                </span>
                              </div>
                              <button
                                type="button"
                                className="btn-remove-shirt-card"
                                onClick={() => setItemToDelete(item)}
                                title="Eliminar Playmat"
                              >
                                ✕
                              </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 0.4rem 0.2rem' }}>
                              <span style={{ fontSize: '0.9rem', color: isLight ? '#0f172a' : '#cbd5e1', fontWeight: 600 }}>
                                En Existencia:
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <button
                                  type="button"
                                  className="btn-mini-qty"
                                  style={{ width: '32px', height: '32px', fontSize: '1rem' }}
                                  onClick={() => handleOtherStockChange(item.id, -1)}
                                  disabled={item.quantity === 0}
                                >
                                  -
                                </button>
                                <strong style={{ fontSize: '1.25rem', minWidth: '32px', textAlign: 'center', color: isLight ? '#0f172a' : '#ffffff' }}>
                                  {item.quantity}
                                </strong>
                                <button
                                  type="button"
                                  className="btn-mini-qty"
                                  style={{ width: '32px', height: '32px', fontSize: '1rem' }}
                                  onClick={() => handleOtherStockChange(item.id, 1)}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </section>
            )}
          </>
        )}
      </main>

      {/* MODAL: CREAR NUEVO COLOR DE PLAYERA */}
      {isAddShirtModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container add-shirt-modal-container">
            <div className="modal-header">
              <h3 className="money-form-title">🎨 Crear Nuevo Color de Playera</h3>
              <button type="button" className="btn-close-modal" onClick={() => setIsAddShirtModalOpen(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateShirtSubmit} className="form-flow">
              <div className="form-base-row-step1">
                <div className="form-group">
                  <label>Nombre del Color</label>
                  <input
                    type="text"
                    className="money-input"
                    placeholder="Ej. Terracota, Menta, Mostaza..."
                    value={newShirtColorName}
                    onChange={(e) => setNewShirtColorName(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Tono Visual</label>
                  <div className="color-picker-input-group">
                    <input
                      type="color"
                      className="native-color-picker"
                      value={newShirtHex}
                      onChange={(e) => setNewShirtHex(e.target.value)}
                    />
                    <input
                      type="text"
                      className="money-input"
                      value={newShirtHex}
                      onChange={(e) => setNewShirtHex(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>Género / Corte</label>
                <select
                  className="money-select"
                  value={newShirtGender}
                  onChange={(e) => setNewShirtGender(e.target.value)}
                >
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions-right">
                <button type="button" className="btn-cancel" onClick={() => setIsAddShirtModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="money-btn-submit btn-confirm-table">
                  Crear Tarjeta de Color ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREAR TAZA O PLAYMAT */}
      {isAddOtherModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container add-shirt-modal-container">
            <div className="modal-header">
              <h3 className="money-form-title">
                {newOtherCategory === 'Tazas' ? '☕ Nueva Taza en Almacén' : '🖱️ Nuevo Playmat / Pad en Almacén'}
              </h3>
              <button type="button" className="btn-close-modal" onClick={() => setIsAddOtherModalOpen(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateOtherSubmit} className="form-flow">
              <div className="form-base-row-step1">
                <div className="form-group">
                  <label>{newOtherCategory === 'Tazas' ? 'Color / Modelo' : 'Nombre del Producto'}</label>
                  <input
                    type="text"
                    className="money-input"
                    placeholder={newOtherCategory === 'Tazas' ? 'Ej. Blanca con Asa Negra, Mágica Negra...' : 'Ej. Playmat TCG Cosido, Deskmat Gamer...'}
                    value={newOtherName}
                    onChange={(e) => setNewOtherName(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{newOtherCategory === 'Tazas' ? 'Capacidad / Tipo' : 'Tamaño / Medidas'}</label>
                  <input
                    type="text"
                    className="money-input"
                    placeholder={newOtherCategory === 'Tazas' ? 'Ej. 11oz, 15oz, Cónica...' : 'Ej. 60x35cm, 90x40cm, 30x25cm...'}
                    value={newOtherSpec}
                    onChange={(e) => setNewOtherSpec(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Color representativo de la tarjeta</label>
                <div className="color-picker-input-group">
                  <input
                    type="color"
                    className="native-color-picker"
                    value={newOtherHex}
                    onChange={(e) => setNewOtherHex(e.target.value)}
                  />
                  <input
                    type="text"
                    className="money-input"
                    value={newOtherHex}
                    onChange={(e) => setNewOtherHex(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-actions-right">
                <button type="button" className="btn-cancel" onClick={() => setIsAddOtherModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="money-btn-submit btn-confirm-table">
                  Guardar en Almacén ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ELIMINAR TAZA / PLAYMAT */}
      {itemToDelete && (
        <div className="modal-overlay delete-modal-overlay">
          <div className="modal-container delete-modal-container">
            <div className="delete-modal-header">
              <span className="delete-warning-icon">⚠</span>
              <h3 className="delete-modal-title">¿Remover del almacén?</h3>
            </div>
            <p className="delete-modal-message">
              Estás a punto de borrar: <strong>{itemToDelete.name}</strong> ({itemToDelete.spec}) con {itemToDelete.quantity} pzas.
            </p>
            <div className="delete-modal-actions">
              <button type="button" className="btn-delete-cancel" onClick={() => setItemToDelete(null)}>
                Regresar
              </button>
              <button type="button" className="btn-delete-confirm" onClick={confirmDeleteOtherItem}>
                Sí, remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR REMOVER TARJETA DE PLAYERA */}
      {shirtToDelete && (
        <div className="modal-overlay delete-modal-overlay">
          <div className="modal-container delete-modal-container">
            <div className="delete-modal-header">
              <span className="delete-warning-icon">⚠</span>
              <h3 className="delete-modal-title">¿Remover esta tarjeta de bodega?</h3>
            </div>
            <p className="delete-modal-message">
              Estás a punto de quitar este color y todas sus tallas del panel de almacén:
            </p>
            <div className="delete-preview-card">
              <div className="delete-preview-row">
                <span className="preview-label">Color:</span>
                <strong className="preview-val-title">{shirtToDelete.color}</strong>
              </div>
              <div className="delete-preview-row">
                <span className="preview-label">Corte:</span>
                <span className="preview-val-sub">{shirtToDelete.gender}</span>
              </div>
              <div className="delete-preview-row">
                <span className="preview-label">Total en Tallas:</span>
                <strong className="preview-val-amt txt-preview-stock-blue">
                  {getCardTotalUnits(shirtToDelete)} piezas
                </strong>
              </div>
            </div>
            <div className="delete-modal-actions">
              <button type="button" className="btn-delete-cancel" onClick={cancelDeleteShirt}>
                Regresar
              </button>
              <button type="button" className="btn-delete-confirm" onClick={confirmDeleteShirt}>
                Sí, remover tarjeta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINAR TRANSACCIÓN */}
      {txToDelete && (
        <div className="modal-overlay delete-modal-overlay">
          <div className="modal-container delete-modal-container">
            <div className="delete-modal-header">
              <span className="delete-warning-icon">⚠</span>
              <h3 className="delete-modal-title">¿Eliminar este movimiento?</h3>
            </div>
            <p className="delete-modal-message">
              Estás a punto de borrar permanentemente el siguiente registro del historial:
            </p>
            <div className="delete-preview-card">
              <div className="delete-preview-row">
                <span className="preview-label">Concepto:</span>
                <strong className="preview-val-title">{txToDelete.description}</strong>
              </div>
              <div className="delete-preview-row">
                <span className="preview-label">Detalle:</span>
                <span className="preview-val-sub">
                  {txToDelete.details ? txToDelete.details.split('__DEDUCTIONS__:')[0] : txToDelete.category}
                </span>
              </div>
              <div className="delete-preview-row">
                <span className="preview-label">Fecha y Monto:</span>
                <span className="preview-val-amt">
                  {txToDelete.date} &bull;{' '}
                  <strong className={txToDelete.type === 'income' ? 'txt-income' : 'txt-expense'}>
                    {txToDelete.type === 'income' ? `+${formatMoney(txToDelete.amount)}` : `-${formatMoney(txToDelete.amount)}`}
                  </strong>
                </span>
              </div>
            </div>
            <div className="delete-modal-actions">
              <button type="button" className="btn-delete-cancel" onClick={cancelDeleteTx}>
                Regresar
              </button>
              <button type="button" className="btn-delete-confirm" onClick={confirmDeleteTx}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRO DE VENTA/COMPRA */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTransaction}
        inventory={inventory}
      />
    </div>
  );
}