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
  const [activeTab, setActiveTab] = useState('inventory');
  const [loading, setLoading] = useState(true);

  // Estados iniciales vacíos: SOLO leen de Supabase
  const [transactions, setTransactions] = useState([]);
  const [inventory, setInventory] = useState([]);

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState(null);
  const [isAddShirtModalOpen, setIsAddShirtModalOpen] = useState(false);
  const [shirtToDelete, setShirtToDelete] = useState(null);

  // Formulario nuevo color
  const [newShirtColorName, setNewShirtColorName] = useState('');
  const [newShirtHex, setNewShirtHex] = useState('#38bdf8');
  const [newShirtGender, setNewShirtGender] = useState('Hombre');

  // Filtros de fecha
  const [filterMode, setFilterMode] = useState('quarter');
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const defaultQuarterId = `Q${Math.floor(currentMonth / 3) + 1}`;
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState(defaultQuarterId);

  // Filtro de inventario
  const [inventoryGenderFilter, setInventoryGenderFilter] = useState('Todos');

  // ==========================================
  // CARGA EXCLUSIVA DESDE SUPABASE
  // ==========================================
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Obtener Transacciones reales de Supabase
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (txError) {
        console.error('Error cargando transacciones de Supabase:', txError);
      } else {
        setTransactions(txData || []);
      }

      // 2. Obtener Inventario real de Supabase
      const { data: invData, error: invError } = await supabase
        .from('shirt_inventory')
        .select('*')
        .order('created_at', { ascending: true });

      if (invError) {
        console.error('Error cargando inventario de Supabase:', invError);
      } else {
        setInventory(invData || []);
      }
    } catch (err) {
      console.error('Error al conectar con Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // OPERACIONES CRUD DIRECTAS EN SUPABASE
  // ==========================================

  // 1. Guardar nueva transacción y procesar stock si aplica
  const handleSaveTransaction = async (newTx) => {
    setTransactions((prev) => [newTx, ...prev]);

    // Si la venta incluye deducciones automáticas de playeras
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

          // Actualizar estado local
          setInventory((prev) =>
            prev.map((c) => (c.id === card.id ? { ...c, [colName]: newQty } : c))
          );

          // Actualizar stock en Supabase
          const { error: invErr } = await supabase
            .from('shirt_inventory')
            .update({ [colName]: newQty })
            .eq('id', card.id);

          if (invErr) {
            console.error('Error reduciendo stock en Supabase:', invErr);
          }
        }
      }
    }

    // Insertar registro financiero en Supabase
    const { error } = await supabase.from('transactions').insert([
      {
        id: newTx.id,
        type: newTx.type,
        amount: Number(newTx.amount),
        category: newTx.category,
        description: newTx.description,
        date: newTx.date,
        details: newTx.details || '',
      },
    ]);

    if (error) {
      console.error('Error insertando en Supabase:', error);
      alert('Error en Supabase: ' + error.message);
      fetchData();
    }
  };

  // 2. Actualizar fecha en Supabase
  const handleDateChange = async (id, newDate) => {
    if (!newDate) return;
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, date: newDate } : t))
    );

    const { error } = await supabase
      .from('transactions')
      .update({ date: newDate })
      .eq('id', id);

    if (error) {
      console.error('Error actualizando fecha:', error);
      fetchData();
    }
  };

  // 3. Eliminar transacción de Supabase
  const promptDeleteTx = (tx) => setTxToDelete(tx);
  const cancelDeleteTx = () => setTxToDelete(null);
  const confirmDeleteTx = async () => {
    if (!txToDelete) return;
    const targetId = txToDelete.id;
    setTransactions((prev) => prev.filter((t) => t.id !== targetId));
    setTxToDelete(null);

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', targetId);

    if (error) {
      console.error('Error eliminando en Supabase:', error);
      alert('Error al borrar en Supabase: ' + error.message);
      fetchData();
    }
  };

  // 4. Cambiar stock en Supabase (+ / -)
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

    const { error } = await supabase
      .from('shirt_inventory')
      .update({ [colName]: newQty })
      .eq('id', cardId);

    if (error) {
      console.error('Error actualizando stock en Supabase:', error);
      fetchData();
    }
  };

  // 5. Crear nueva tarjeta directamente en Supabase
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

    const { error } = await supabase.from('shirt_inventory').insert([newCard]);
    if (error) {
      console.error('Error insertando color en Supabase:', error);
      alert('Error al guardar en Supabase: ' + error.message);
      fetchData();
    }
  };

  // 6. Eliminar tarjeta de Supabase
  const promptDeleteShirt = (item) => setShirtToDelete(item);
  const cancelDeleteShirt = () => setShirtToDelete(null);
  const confirmDeleteShirt = async () => {
    if (!shirtToDelete) return;
    const targetId = shirtToDelete.id;

    setInventory((prev) => prev.filter((i) => i.id !== targetId));
    setShirtToDelete(null);

    const { error } = await supabase
      .from('shirt_inventory')
      .delete()
      .eq('id', targetId);

    if (error) {
      console.error('Error borrando en Supabase:', error);
      alert('Error al eliminar en Supabase: ' + error.message);
      fetchData();
    }
  };

  // ==========================================
  // CÁLCULOS
  // ==========================================
  const getCardTotalUnits = (card) => {
    return (
      (Number(card.size_s) || 0) +
      (Number(card.size_m) || 0) +
      (Number(card.size_l) || 0) +
      (Number(card.size_xl) || 0)
    );
  };

  const totalShirtsStock = useMemo(() => {
    return inventory.reduce((totalAcc, card) => {
      return totalAcc + getCardTotalUnits(card);
    }, 0);
  }, [inventory]);

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

  const filteredTransactions = useMemo(() => {
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
    filteredTransactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'income') s += amt;
      if (tx.type === 'expense') e += amt;
    });
    return { sales: s, expenses: e, total: s - e };
  }, [filteredTransactions]);

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

  return (
    <div className="money-page">
      {/* HEADER SUPERIOR FIJO */}
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
        {/* CONTENEDOR CENTRAL ALINEADO */}
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
          {/* TÍTULO Y CONTROLES DE PERIODO */}
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
              <h1 className="brand-title">Control Financiero</h1>
            </div>

            {/* SELECTOR DE PERIODO ADAPTABLE */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
              }}
            >
              {/* FILA 1: BOTONES TRIMESTRE / AÑO / TOTAL */}
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
                  style={{
                    flex: 1,
                    padding: '0.55rem 0.2rem',
                    textAlign: 'center',
                    justifyContent: 'center',
                    margin: 0,
                  }}
                  onClick={() => setFilterMode('quarter')}
                >
                  Trimestre
                </button>
                <button
                  type="button"
                  className={`btn-period ${filterMode === 'year' ? 'active' : ''}`}
                  style={{
                    flex: 1,
                    padding: '0.55rem 0.2rem',
                    textAlign: 'center',
                    justifyContent: 'center',
                    margin: 0,
                  }}
                  onClick={() => setFilterMode('year')}
                >
                  Año
                </button>
                <button
                  type="button"
                  className={`btn-period ${filterMode === 'total' ? 'active' : ''}`}
                  style={{
                    flex: 1,
                    padding: '0.55rem 0.2rem',
                    textAlign: 'center',
                    justifyContent: 'center',
                    margin: 0,
                  }}
                  onClick={() => setFilterMode('total')}
                >
                  Total
                </button>
              </div>

              {/* FILA 2: SELECTORES DINÁMICOS */}
              {filterMode === 'quarter' && (
                <div style={{ display: 'flex', width: '100%', gap: '0.4rem' }}>
                  <select
                    className="period-sub-select"
                    style={{
                      flex: 2,
                      minWidth: 0,
                      padding: '0.55rem 0.6rem',
                      background: '#0c1527',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                    }}
                    value={selectedQuarter}
                    onChange={(e) => setSelectedQuarter(e.target.value)}
                  >
                    {QUARTERS.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="period-sub-select"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: '0.55rem 0.6rem',
                      background: '#0c1527',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                    }}
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                  >
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {filterMode === 'year' && (
                <div style={{ display: 'flex', width: '100%' }}>
                  <select
                    className="period-sub-select"
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.6rem',
                      background: '#0c1527',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                    }}
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                  >
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* CAJAS DE MÉTRICAS */}
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
                    activeTab === 'transactions' ? 'active-nav-card' : ''
                  }`}
                  onClick={() => setActiveTab('transactions')}
                  title="Ver Historial de Movimientos"
                >
                  <span className="metric-lbl">
                    Ventas (
                    {filterMode === 'total'
                      ? 'Total'
                      : filterMode === 'year'
                      ? selectedYear
                      : selectedQuarter}
                    )
                  </span>
                  <span className="metric-val">
                    {formatMoney(filteredMetrics.sales)}
                  </span>
                </div>

                <div
                  className={`metric-box box-expenses metric-nav-btn ${
                    activeTab === 'transactions' ? 'active-nav-card' : ''
                  }`}
                  onClick={() => setActiveTab('transactions')}
                  title="Ver Historial de Movimientos"
                >
                  <span className="metric-lbl">
                    Gastos (
                    {filterMode === 'total'
                      ? 'Total'
                      : filterMode === 'year'
                      ? selectedYear
                      : selectedQuarter}
                    )
                  </span>
                  <span className="metric-val">
                    {formatMoney(filteredMetrics.expenses)}
                  </span>
                </div>

                {/* NETO */}
                <div
                  className={`metric-box metric-nav-btn ${
                    filteredMetrics.total >= 0 ? 'box-total-pos' : 'box-total-neg'
                  } ${activeTab === 'transactions' ? 'active-nav-card' : ''}`}
                  onClick={() => setActiveTab('transactions')}
                  title="Clic para ver Historial de Movimientos"
                >
                  <span className="metric-lbl">
                    Neto (
                    {filterMode === 'total'
                      ? 'Total'
                      : filterMode === 'year'
                      ? selectedYear
                      : selectedQuarter}
                    )
                  </span>
                  <span className="metric-val">
                    {formatMoney(filteredMetrics.total)}
                  </span>
                </div>

                {/* PLAYERAS STOCK */}
                <div
                  className={`metric-box box-shirts-total metric-nav-btn ${
                    activeTab === 'inventory' ? 'active-nav-card' : ''
                  }`}
                  onClick={() => setActiveTab('inventory')}
                  title="Clic para ver Almacén de Playeras"
                >
                  <span className="metric-lbl">Playeras Stock</span>
                  <span className="metric-val metric-val-shirts">
                    {totalShirtsStock} <span className="metric-unit">pzas</span>
                  </span>
                </div>
              </nav>
            </div>
          </div>

          {/* FILA DE CONTROLES INVENTARIO */}
          {activeTab === 'inventory' && (
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            >
              {/* BOTÓN + CREAR NUEVO COLOR */}
              <button
                type="button"
                className="btn-add-shirt-card"
                style={{
                  width: '100%',
                  padding: '0.7rem 1.25rem',
                  fontSize: '0.95rem',
                  margin: 0,
                  touchAction: 'manipulation',
                }}
                onClick={() => setIsAddShirtModalOpen(true)}
              >
                + Crear Nuevo Color
              </button>

              {/* BOTONES TODOS / HOMBRE / MUJER */}
              <div
                className="inventory-controls-bar"
                style={{
                  margin: 0,
                  padding: 0,
                  width: '100%',
                  touchAction: 'none',
                }}
              >
                <div
                  className="gender-toggle-group"
                  style={{
                    margin: 0,
                    width: '100%',
                    display: 'flex',
                    gap: '0.5rem',
                  }}
                >
                  <button
                    type="button"
                    className={`btn-gender-filter ${
                      inventoryGenderFilter === 'Todos' ? 'active' : ''
                    }`}
                    style={{
                      flex: 1,
                      padding: '0.65rem 0.5rem',
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      touchAction: 'manipulation',
                    }}
                    onClick={() => setInventoryGenderFilter('Todos')}
                    title="Mostrar todos los géneros"
                  >
                    👥 Todos
                  </button>
                  <button
                    type="button"
                    className={`btn-gender-filter btn-gender-male ${
                      inventoryGenderFilter === 'Hombre' ? 'active' : ''
                    }`}
                    style={{
                      flex: 1,
                      padding: '0.65rem 0.5rem',
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      touchAction: 'manipulation',
                    }}
                    onClick={() => setInventoryGenderFilter('Hombre')}
                    title="Solo playeras de Hombre"
                  >
                    <span className="gender-symbol" style={{ marginRight: '0.25rem' }}>♂</span> Hombre
                  </button>
                  <button
                    type="button"
                    className={`btn-gender-filter btn-gender-female ${
                      inventoryGenderFilter === 'Mujer' ? 'active' : ''
                    }`}
                    style={{
                      flex: 1,
                      padding: '0.65rem 0.5rem',
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      touchAction: 'manipulation',
                    }}
                    onClick={() => setInventoryGenderFilter('Mujer')}
                    title="Solo playeras de Mujer"
                  >
                    <span className="gender-symbol" style={{ marginRight: '0.25rem' }}>♀</span> Mujer
                  </button>
                </div>
              </div>
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
                    Historial de Movimientos{' '}
                    <span className="period-subtitle">
                      ({getPeriodLabel()})
                    </span>
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
                    <div className="block-cell header-cell cell-date-header">
                      Fecha
                    </div>
                    <div className="block-cell header-cell">Tipo</div>
                    <div className="block-cell header-cell">Categoría</div>
                    <div className="block-cell header-cell cell-desc">
                      Detalle & Desglose
                    </div>
                    <div className="block-cell header-cell">Monto</div>
                    <div className="block-cell header-cell cell-action">
                      Acción
                    </div>
                  </div>

                  {filteredTransactions.length === 0 ? (
                    <div className="empty-box">
                      No hay movimientos registrados en Supabase para{' '}
                      <strong>{getPeriodLabel()}</strong>.
                    </div>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <div key={tx.id} className="block-row data-row">
                        <div className="block-cell cell-date">
                          <input
                            type="date"
                            className="table-date-input"
                            value={tx.date}
                            onChange={(e) =>
                              handleDateChange(tx.id, e.target.value)
                            }
                            title="Haz clic para modificar la fecha"
                          />
                        </div>

                        <div className="block-cell">
                          <span
                            className={`badge-pill ${
                              tx.type === 'income'
                                ? 'pill-income'
                                : 'pill-expense'
                            }`}
                          >
                            {tx.type === 'income' ? 'VENTA' : 'GASTO'}
                          </span>
                        </div>

                        <div className="block-cell cell-cat">{tx.category}</div>

                        <div className="block-cell cell-desc">
                          <span className="desc-main-text">
                            {tx.description}
                          </span>
                          {tx.details && (
                            <span className="desc-sub-text">{tx.details}</span>
                          )}
                        </div>

                        <div
                          className={`block-cell cell-amount ${
                            tx.type === 'income' ? 'txt-income' : 'txt-expense'
                          }`}
                        >
                          {tx.type === 'income'
                            ? `+${formatMoney(tx.amount)}`
                            : `-${formatMoney(tx.amount)}`}
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

            {/* VISTA 2: ALMACÉN DE PLAYERAS */}
            {activeTab === 'inventory' && (
              <section className="inventory-section" style={{ width: '100%', margin: 0, padding: 0 }}>
                {filteredInventory.length === 0 ? (
                  <div className="empty-box">
                    No hay playeras registradas en tu tabla <code>shirt_inventory</code> de Supabase.
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
                          className={`inventory-matrix-card shirt-colored-card ${
                            isLight ? 'card-theme-light' : 'card-theme-dark'
                          }`}
                          style={{ '--card-shirt-color': hexColor }}
                        >
                          <div className="inv-matrix-header">
                            <div className="inv-matrix-title-wrap">
                              <span
                                className="inv-color-title"
                                title={item.color}
                              >
                                {item.color}
                              </span>
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
                                title="Eliminar este color/corte"
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
                                      onClick={() =>
                                        handleStockChange(item.id, size, -1)
                                      }
                                      disabled={qty === 0}
                                      title={`Restar 1 ${size}`}
                                    >
                                      -
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-mini-qty"
                                      onClick={() =>
                                        handleStockChange(item.id, size, 1)
                                      }
                                      title={`Sumar 1 ${size}`}
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
                )}
              </section>
            )}
          </>
        )}
      </main>

      {/* MODAL: CREAR NUEVO COLOR EN BODEGA */}
      {isAddShirtModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container add-shirt-modal-container">
            <div className="modal-header">
              <h3 className="money-form-title">🎨 Crear Nuevo Color en Bodega</h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setIsAddShirtModalOpen(false)}
              >
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
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-actions-right">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsAddShirtModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="money-btn-submit btn-confirm-table"
                >
                  Crear Tarjeta de Color ✓
                </button>
              </div>
            </form>
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
                <strong className="preview-val-title">
                  {shirtToDelete.color}
                </strong>
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
              <button
                type="button"
                className="btn-delete-cancel"
                onClick={cancelDeleteShirt}
              >
                Regresar
              </button>
              <button
                type="button"
                className="btn-delete-confirm"
                onClick={confirmDeleteShirt}
              >
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
                <strong className="preview-val-title">
                  {txToDelete.description}
                </strong>
              </div>
              <div className="delete-preview-row">
                <span className="preview-label">Detalle:</span>
                <span className="preview-val-sub">
                  {txToDelete.details || txToDelete.category}
                </span>
              </div>
              <div className="delete-preview-row">
                <span className="preview-label">Fecha y Monto:</span>
                <span className="preview-val-amt">
                  {txToDelete.date} &bull;{' '}
                  <strong
                    className={
                      txToDelete.type === 'income'
                        ? 'txt-income'
                        : 'txt-expense'
                    }
                  >
                    {txToDelete.type === 'income'
                      ? `+${formatMoney(txToDelete.amount)}`
                      : `-${formatMoney(txToDelete.amount)}`}
                  </strong>
                </span>
              </div>
            </div>

            <div className="delete-modal-actions">
              <button
                type="button"
                className="btn-delete-cancel"
                onClick={cancelDeleteTx}
              >
                Regresar
              </button>
              <button
                type="button"
                className="btn-delete-confirm"
                onClick={confirmDeleteTx}
              >
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