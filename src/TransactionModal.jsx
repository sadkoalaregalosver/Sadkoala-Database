import { useState, useMemo, useEffect } from 'react';

const ALL_SIZES = ['S', 'M', 'L', 'XL'];
const GENDERS = ['Hombre', 'Mujer'];

const MONTH_NAMES = [
  { value: 1, name: 'Ene' },
  { value: 2, name: 'Feb' },
  { value: 3, name: 'Mar' },
  { value: 4, name: 'Abr' },
  { value: 5, name: 'May' },
  { value: 6, name: 'Jun' },
  { value: 7, name: 'Jul' },
  { value: 8, name: 'Ago' },
  { value: 9, name: 'Sep' },
  { value: 10, name: 'Oct' },
  { value: 11, name: 'Nov' },
  { value: 12, name: 'Dic' },
];

const PRINT_TYPES = [
  'DTF Textil',
  'Sublimación',
  'Papel Albanene / Positivos',
  'Vinil Textil',
  'Vinil Adhesivo',
  'Otro Ploteo / Impresión',
];

const INCOME_CATEGORIES = [
  'Playera DTF',
  'Playera Sublimada',
  'Playmat',
  'Mousepad',
  'Taza Sublimada',
  'Otros',
];

const EXPENSE_CATEGORIES = [
  'Compra de Playeras Lisas',
  'Impresiones y Consumibles',
  'Envíos / Paquetería',
  'Servicios (Luz, Renta, Web)',
  'Otros Gastos',
];

export default function TransactionModal({ isOpen, onClose, onSave, inventory = [] }) {
  if (!isOpen) return null;

  const [step, setStep] = useState(1);
  const [movementType, setMovementType] = useState('income');
  const [stockDeductionMode, setStockDeductionMode] = useState('deduct'); // 'deduct' | 'none'

  const [category, setCategory] = useState(INCOME_CATEGORIES[0]);

  // Manejo de fecha con selectores individuales
  const today = new Date();
  const currentYearBase = today.getFullYear();
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentYearBase);

  // Rango de años: 10 años atrás hasta 50 años adelante
  const availableYears = useMemo(() => {
    const startYear = currentYearBase - 10;
    const endYear = currentYearBase + 50;
    const years = [];
    for (let y = startYear; y <= endYear; y++) {
      years.push(y);
    }
    return years;
  }, [currentYearBase]);

  const formattedDate = useMemo(() => {
    const dStr = String(selectedDay).padStart(2, '0');
    const mStr = String(selectedMonth).padStart(2, '0');
    return `${selectedYear}-${mStr}-${dStr}`;
  }, [selectedDay, selectedMonth, selectedYear]);

  // Días máximos del mes seleccionado
  const daysInCurrentMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    if (selectedDay > daysInCurrentMonth) {
      setSelectedDay(daysInCurrentMonth);
    }
  }, [daysInCurrentMonth, selectedDay]);

  const [itemDescription, setItemDescription] = useState('');
  const [note, setNote] = useState('');

  const [openColorDropdownId, setOpenColorDropdownId] = useState(null);
  const [purchaseMode, setPurchaseMode] = useState('individual');

  // Estado para pieza individual
  const [singleGender, setSingleGender] = useState('Hombre');
  const [singleColor, setSingleColor] = useState('');
  const [singleSize, setSingleSize] = useState('');
  const [singleQty, setSingleQty] = useState(1);

  // Estado para docenas
  const [dozenItems, setDozenItems] = useState([
    { id: 1, gender: 'Hombre', color: '', size: '', quantity: 6 },
  ]);

  // Otros insumos / Merch
  const [printDetail, setPrintDetail] = useState({
    type: PRINT_TYPES[0],
    quantity: 1,
    sizeOrSpec: 'Ancho 60cm',
  });

  const [merchDetail, setMerchDetail] = useState({
    spec: 'Estándar TCG (60x35cm)',
    quantity: 1,
  });

  const [generalQuantity, setGeneralQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState('');

  const isShirtOperation = category.includes('Playera');
  const isManualFreeSale = movementType === 'income' && stockDeductionMode === 'none';
  const isOtherSale = movementType === 'income' && category === 'Otros';
  const isPrintExpense = movementType === 'expense' && category === 'Impresiones y Consumibles';
  const isMerchSale = movementType === 'income' && (category === 'Playmat' || category === 'Mousepad' || category === 'Taza Sublimada');

  // ==========================================
  // FILTRADO POR GÉNERO / CORTE
  // ==========================================
  const singleAvailableShirts = useMemo(() => {
    if (movementType === 'income' && stockDeductionMode === 'deduct') {
      return inventory.filter((item) => item.gender === singleGender);
    }
    return inventory;
  }, [inventory, singleGender, movementType, stockDeductionMode]);

  const selectedShirtCard = useMemo(() => {
    return singleAvailableShirts.find((item) => item.color === singleColor) || singleAvailableShirts[0] || null;
  }, [singleAvailableShirts, singleColor]);

  const availableSizesForSingle = useMemo(() => {
    if (!selectedShirtCard) return [];
    if (movementType === 'income' && stockDeductionMode === 'deduct') {
      return ALL_SIZES.map((sz) => {
        const qty = Number(selectedShirtCard[`size_${sz.toLowerCase()}`]) || 0;
        return { size: sz, stock: qty };
      }).filter((item) => item.stock > 0);
    }
    return ALL_SIZES.map((sz) => ({ size: sz, stock: 999 }));
  }, [selectedShirtCard, movementType, stockDeductionMode]);

  useEffect(() => {
    if (singleAvailableShirts.length > 0) {
      if (!singleColor || !singleAvailableShirts.some((s) => s.color === singleColor)) {
        setSingleColor(singleAvailableShirts[0].color);
      }
    } else {
      setSingleColor('');
    }
  }, [singleGender, singleAvailableShirts]);

  useEffect(() => {
    if (availableSizesForSingle.length > 0) {
      if (!singleSize || !availableSizesForSingle.some((s) => s.size === singleSize)) {
        setSingleSize(availableSizesForSingle[0].size);
      }
    } else {
      setSingleSize('');
    }
  }, [availableSizesForSingle]);

  const totalUnits = useMemo(() => {
    if (isOtherSale) return Number(generalQuantity) || 1;
    if (isManualFreeSale && !isShirtOperation) return Number(generalQuantity) || 1;
    if (isShirtOperation) {
      if (purchaseMode === 'individual') return Number(singleQty) || 1;
      return dozenItems.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
    }
    if (isPrintExpense) return Number(printDetail.quantity) || 1;
    if (isMerchSale) return Number(merchDetail.quantity) || 1;
    return Number(generalQuantity) || 1;
  }, [isOtherSale, isManualFreeSale, isShirtOperation, isPrintExpense, isMerchSale, purchaseMode, singleQty, dozenItems, printDetail, merchDetail, generalQuantity]);

  const unitPriceEstimate = useMemo(() => {
    const cost = Number(totalPrice);
    if (!cost || totalUnits <= 0) return 0;
    return (cost / totalUnits).toFixed(2);
  }, [totalPrice, totalUnits]);

  const handleAddDozenRow = () => {
    const firstCard = inventory.find((i) => i.gender === 'Hombre') || inventory[0];
    setDozenItems([
      ...dozenItems,
      {
        id: Date.now(),
        gender: firstCard ? firstCard.gender : 'Hombre',
        color: firstCard ? firstCard.color : '',
        size: 'M',
        quantity: 1,
      },
    ]);
  };

  const handleRemoveDozenRow = (rowId) => {
    if (dozenItems.length <= 1) return;
    setDozenItems(dozenItems.filter((item) => item.id !== rowId));
  };

  const handleUpdateDozenRow = (rowId, field, value) => {
    setDozenItems((prev) =>
      prev.map((item) => {
        if (item.id !== rowId) return item;
        const updated = { ...item, [field]: field === 'quantity' ? Number(value) : value };

        if (field === 'gender') {
          const validColors = inventory.filter((c) => c.gender === value);
          if (validColors.length > 0) {
            updated.color = validColors[0].color;
          }
        }
        return updated;
      })
    );
  };

  const handleTypeChange = (type) => {
    setMovementType(type);
    if (type === 'income') {
      setCategory(INCOME_CATEGORIES[0]);
      setPurchaseMode('individual');
    } else {
      setCategory(EXPENSE_CATEGORIES[0]);
      setPurchaseMode('dozen');
    }
  };

  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    if (newCat === 'Playmat') {
      setMerchDetail({ spec: 'Estándar TCG (60x35cm cosido)', quantity: 1 });
    } else if (newCat === 'Mousepad') {
      setMerchDetail({ spec: 'Deskmat XL (90x40cm)', quantity: 1 });
    } else if (newCat === 'Taza Sublimada') {
      setMerchDetail({ spec: 'Blanca 11oz cerámica', quantity: 1 });
    }
  };

  const handleProceedToPrice = (e) => {
    e.preventDefault();

    if (movementType === 'income' && isShirtOperation && stockDeductionMode === 'deduct') {
      if (purchaseMode === 'individual') {
        if (!selectedShirtCard) {
          alert('No hay playeras disponibles en almacén para este corte.');
          return;
        }
        if (!singleSize) {
          alert('No hay tallas con stock disponible para esta playera.');
          return;
        }
        const currentStock = Number(selectedShirtCard[`size_${singleSize.toLowerCase()}`]) || 0;
        if (singleQty > currentStock) {
          alert(`Solo tienes ${currentStock} pzas en talla ${singleSize}. Reduce la cantidad o usa Venta Libre.`);
          return;
        }
      }
    }

    setOpenColorDropdownId(null);
    setStep(2);
  };

  const handleFinalSubmit = (e) => {
    e.preventDefault();
    if (!totalPrice || Number(totalPrice) <= 0) return;

    let detailsText = '';
    let autoDesc = itemDescription.trim();
    let deductions = [];

    if (isOtherSale) {
      detailsText = `${generalQuantity}x ${autoDesc || 'Venta Otros'}`;
      if (!autoDesc) autoDesc = 'Venta Otros';
    } else if (isManualFreeSale) {
      detailsText = `${category} [Venta Libre - Sin mover stock]`;
      if (!autoDesc) autoDesc = `Venta ${category}`;
    } else if (isShirtOperation) {
      if (purchaseMode === 'individual') {
        detailsText = `${singleQty}x ${singleColor} (${singleSize}, ${singleGender})`;
        if (!autoDesc) autoDesc = `Venta ${category} (${singleColor})`;

        if (movementType === 'income' && stockDeductionMode === 'deduct') {
          deductions.push({
            color: singleColor,
            gender: singleGender,
            size: singleSize,
            quantity: Number(singleQty),
          });
        }
      } else {
        const breakdown = dozenItems
          .map((i) => `${i.quantity}x ${i.color} [${i.size}-${i.gender}]`)
          .join(', ');
        detailsText = `${totalUnits} pzas: ${breakdown}`;
        if (!autoDesc) autoDesc = `Venta lote ${category} (${totalUnits} pzas)`;

        if (movementType === 'income' && stockDeductionMode === 'deduct') {
          dozenItems.forEach((i) => {
            deductions.push({
              color: i.color,
              gender: i.gender,
              size: i.size,
              quantity: Number(i.quantity) || 1,
            });
          });
        }
      }
    } else if (isMerchSale) {
      detailsText = `${merchDetail.quantity}x ${category} (${merchDetail.spec})`;
      if (!autoDesc) autoDesc = `Venta ${category}`;
    } else if (isPrintExpense) {
      detailsText = `${printDetail.quantity} m de ${printDetail.type} (${printDetail.sizeOrSpec})`;
      if (!autoDesc) autoDesc = `Compra ${printDetail.type} (${printDetail.quantity} m)`;
    } else {
      detailsText = `${category} (${generalQuantity} unidad/servicio)`;
      if (!autoDesc) autoDesc = category;
    }

    const newTx = {
      id: `tx-${Date.now()}`,
      type: movementType,
      amount: Math.abs(Number(totalPrice)),
      category,
      description: autoDesc,
      date: formattedDate,
      mode: isOtherSale ? 'other' : isManualFreeSale ? 'free' : isShirtOperation ? purchaseMode : isMerchSale ? 'merch' : isPrintExpense ? 'print' : 'general',
      details: note ? `${detailsText} | Nota: ${note}` : detailsText,
      inventoryDeductions: deductions.length > 0 ? deductions : null,
    };

    onSave(newTx);
    setStep(1);
    setTotalPrice('');
    setItemDescription('');
    setNote('');
    setOpenColorDropdownId(null);
    onClose();
  };

  const handleCancel = () => {
    setStep(1);
    setTotalPrice('');
    setItemDescription('');
    setNote('');
    setOpenColorDropdownId(null);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        {/* Encabezado */}
        <div className="modal-header">
          <div className="modal-title-flow">
            <h2 className="money-form-title">
              {movementType === 'income' ? 'Registrar Venta' : 'Registrar Compra / Gasto'}
            </h2>
            <div className="step-indicator">
              <span className={`step-badge ${step === 1 ? 'active' : 'completed'}`}>
                1. Selección y Cantidad
              </span>
              <span className="step-separator">➔</span>
              <span className={`step-badge ${step === 2 ? 'active' : ''}`}>
                2. Fijar Precio
              </span>
            </div>
          </div>
          <button type="button" className="btn-close-modal" onClick={handleCancel}>
            ✕
          </button>
        </div>

        {/* ========================================================
            PASO 1: SELECCIÓN DE PRODUCTOS Y PIEZAS
           ======================================================== */}
        {step === 1 && (
          <form onSubmit={handleProceedToPrice} className="form-flow">
            {/* Toggle Ingreso / Gasto */}
            <div className="money-type-toggle">
              <button
                type="button"
                className={movementType === 'income' ? 'active-income' : ''}
                onClick={() => handleTypeChange('income')}
              >
                + Venta
              </button>
              <button
                type="button"
                className={movementType === 'expense' ? 'active-expense' : ''}
                onClick={() => handleTypeChange('expense')}
              >
                - Compra / Gasto
              </button>
            </div>

            {/* SELECCIÓN DE MODALIDAD SI ES VENTA DE PLAYERAS */}
            {movementType === 'income' && isShirtOperation && (
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '10px',
                  padding: '0.6rem 0.75rem',
                  marginBottom: '0.2rem',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    color: '#94a3b8',
                    marginBottom: '0.4rem',
                    fontWeight: 600,
                  }}
                >
                  Gestión del Almacén:
                </span>
                <div style={{ display: 'flex', gap: '0.45rem' }}>
                  <button
                    type="button"
                    className={`btn-period ${stockDeductionMode === 'deduct' ? 'active' : ''}`}
                    style={{ flex: 1, padding: '0.5rem 0.4rem', fontSize: '0.85rem' }}
                    onClick={() => setStockDeductionMode('deduct')}
                  >
                    📉 Descontar Playeras Guardadas
                  </button>
                  <button
                    type="button"
                    className={`btn-period ${stockDeductionMode === 'none' ? 'active' : ''}`}
                    style={{ flex: 1, padding: '0.5rem 0.4rem', fontSize: '0.85rem' }}
                    onClick={() => setStockDeductionMode('none')}
                  >
                    📝 Venta Libre (Sin mover stock)
                  </button>
                </div>
              </div>
            )}

            <div className="form-base-row-step1">
              <div className="form-group">
                <label>Producto / Categoría</label>
                <select
                  className="money-select"
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                >
                  {(movementType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* SELECTOR DE FECHA RESPONSIVO */}
              <div className="form-group">
                <label>Fecha</label>

                {/* VERSIÓN MONITOR: 3 Selects con scroll rápido */}
                <div className="desktop-date-selector" style={{ display: 'flex', gap: '0.35rem', width: '100%' }}>
                  <select
                    className="money-select"
                    style={{ flex: 1.1, padding: '0.55rem 0.3rem', textAlign: 'center' }}
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(Number(e.target.value))}
                    title="Día"
                  >
                    {Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>

                  <select
                    className="money-select"
                    style={{ flex: 1.4, padding: '0.55rem 0.3rem', textAlign: 'center' }}
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    title="Mes"
                  >
                    {MONTH_NAMES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.name}
                      </option>
                    ))}
                  </select>

                  <select
                    className="money-select"
                    style={{ flex: 1.3, padding: '0.55rem 0.3rem', textAlign: 'center' }}
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    title="Año"
                  >
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                {/* VERSIÓN MÓVIL: Input nativo táctil */}
                <div className="mobile-date-selector" style={{ display: 'none' }}>
                  <input
                    type="date"
                    className="money-input"
                    value={formattedDate}
                    onChange={(e) => {
                      if (e.target.value) {
                        const [y, m, d] = e.target.value.split('-').map(Number);
                        setSelectedYear(y);
                        setSelectedMonth(m);
                        setSelectedDay(d);
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* INPUT DE DESCRIPCIÓN DEL ARTÍCULO VENDIDO */}
            <div className="form-group">
              <label>Descripción / Detalle del artículo vendido</label>
              <input
                type="text"
                className="money-input"
                placeholder={
                  isShirtOperation
                    ? 'Ej. Playera Berserk Guts, Logo Frente y Espalda...'
                    : category === 'Playmat'
                    ? 'Ej. Playmat Yu-Gi-Oh Dark Magician Girl...'
                    : category === 'Otros'
                    ? 'Ej. Stickers holográficos, gorra bordada, llavero...'
                    : 'Ej. Descripción o modelo del producto...'
                }
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
              />
            </div>

            {/* CASO 1: PLAYERAS (SOLO SI NO ES VENTA LIBRE) */}
            {isShirtOperation && !isManualFreeSale && (
              <div className="shirt-special-box">
                <div className="mode-selector-header">
                  <span className="box-title">Modalidad de Playeras:</span>
                  <div className="mode-pill-group">
                    <button
                      type="button"
                      className={`btn-pill ${purchaseMode === 'individual' ? 'active' : ''}`}
                      onClick={() => setPurchaseMode('individual')}
                    >
                      Pieza Individual
                    </button>
                    <button
                      type="button"
                      className={`btn-pill ${purchaseMode === 'dozen' ? 'active' : ''}`}
                      onClick={() => setPurchaseMode('dozen')}
                    >
                      Por Docena / Lote
                    </button>
                  </div>
                </div>

                {/* MODO PIEZA INDIVIDUAL */}
                {purchaseMode === 'individual' && (
                  <div className="individual-card-box">
                    <div className="form-group">
                      <label>1. Sexo / Corte</label>
                      <select
                        className="money-select"
                        value={singleGender}
                        onChange={(e) => setSingleGender(e.target.value)}
                      >
                        {GENDERS.map((g) => (
                          <option key={g} value={g}>
                            {g === 'Hombre' ? '♂ Hombre' : '♀ Mujer'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group color-custom-select-col">
                      <label>2. Color ({singleGender})</label>
                      {singleAvailableShirts.length === 0 ? (
                        <div style={{ color: '#f87171', fontSize: '0.82rem', padding: '0.5rem 0' }}>
                          Sin tarjetas de {singleGender}
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="color-custom-trigger"
                            onClick={() =>
                              setOpenColorDropdownId(openColorDropdownId === 'single' ? null : 'single')
                            }
                          >
                            <span
                              className="color-swatch-box"
                              style={{
                                backgroundColor: selectedShirtCard ? selectedShirtCard.hex : '#38bdf8',
                              }}
                            />
                            <span className="color-label-text">
                              {singleColor || 'Seleccionar color'}
                            </span>
                            <span className="custom-arrow">▼</span>
                          </button>

                          {openColorDropdownId === 'single' && (
                            <div className="color-custom-dropdown-list">
                              {singleAvailableShirts.map((c) => (
                                <button
                                  type="button"
                                  key={c.id}
                                  className={`color-dropdown-item ${singleColor === c.color ? 'active' : ''}`}
                                  onClick={() => {
                                    setSingleColor(c.color);
                                    setOpenColorDropdownId(null);
                                  }}
                                >
                                  <span
                                    className="color-swatch-box"
                                    style={{ backgroundColor: c.hex }}
                                  />
                                  <span className="color-dropdown-name">{c.color}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="form-group">
                      <label>3. Talla Disponible</label>
                      <select
                        className="money-select"
                        value={singleSize}
                        onChange={(e) => setSingleSize(e.target.value)}
                        disabled={availableSizesForSingle.length === 0}
                      >
                        {availableSizesForSingle.length === 0 ? (
                          <option value="">Agotada en todas las tallas</option>
                        ) : (
                          availableSizesForSingle.map((item) => (
                            <option key={item.size} value={item.size}>
                              {item.size} ({item.stock} pzas)
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="form-group input-qty-col">
                      <label>Piezas</label>
                      <input
                        type="number"
                        min="1"
                        max={
                          selectedShirtCard && singleSize
                            ? Number(selectedShirtCard[`size_${singleSize.toLowerCase()}`]) || 1
                            : 99
                        }
                        className="money-input input-qty"
                        value={singleQty}
                        onChange={(e) => setSingleQty(Math.max(1, Number(e.target.value)))}
                      />
                    </div>
                  </div>
                )}

                {/* MODO DOCENA */}
                {purchaseMode === 'dozen' && (
                  <div className="dozen-breakdown-box">
                    <div className="dozen-status-bar">
                      <span>Total Piezas Sumadas: <strong>{totalUnits} piezas</strong></span>
                    </div>

                    <div className="dozen-rows-container">
                      {dozenItems.map((item, index) => {
                        const rowColors = inventory.filter((c) => c.gender === item.gender);
                        const rowCard = rowColors.find((c) => c.color === item.color) || rowColors[0];
                        const rowSizes = rowCard
                          ? ALL_SIZES.map((sz) => ({
                              size: sz,
                              stock: Number(rowCard[`size_${sz.toLowerCase()}`]) || 0,
                            })).filter((s) => s.stock > 0)
                          : [];

                        return (
                          <div key={item.id} className="variant-card-box">
                            <span className="row-num">#{index + 1}</span>

                            <div className="form-group">
                              <label>Sexo</label>
                              <select
                                className="money-select"
                                value={item.gender}
                                onChange={(e) => handleUpdateDozenRow(item.id, 'gender', e.target.value)}
                              >
                                {GENDERS.map((g) => (
                                  <option key={g} value={g}>
                                    {g === 'Hombre' ? '♂ Hombre' : '♀ Mujer'}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="form-group color-custom-select-col">
                              <label>Color</label>
                              <button
                                type="button"
                                className="color-custom-trigger"
                                onClick={() =>
                                  setOpenColorDropdownId(openColorDropdownId === item.id ? null : item.id)
                                }
                              >
                                <span
                                  className="color-swatch-box"
                                  style={{ backgroundColor: rowCard ? rowCard.hex : '#38bdf8' }}
                                />
                                <span className="color-label-text">
                                  {item.color || 'Color'}
                                </span>
                                <span className="custom-arrow">▼</span>
                              </button>

                              {openColorDropdownId === item.id && (
                                <div className="color-custom-dropdown-list">
                                  {rowColors.map((c) => (
                                    <button
                                      type="button"
                                      key={c.id}
                                      className={`color-dropdown-item ${item.color === c.color ? 'active' : ''}`}
                                      onClick={() => {
                                        handleUpdateDozenRow(item.id, 'color', c.color);
                                        setOpenColorDropdownId(null);
                                      }}
                                    >
                                      <span
                                        className="color-swatch-box"
                                        style={{ backgroundColor: c.hex }}
                                      />
                                      <span className="color-dropdown-name">{c.color}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="form-group">
                              <label>Talla</label>
                              <select
                                className="money-select"
                                value={item.size}
                                onChange={(e) => handleUpdateDozenRow(item.id, 'size', e.target.value)}
                              >
                                {rowSizes.length === 0 ? (
                                  <option value="">Agotada</option>
                                ) : (
                                  rowSizes.map((s) => (
                                    <option key={s.size} value={s.size}>
                                      {s.size} ({s.stock} pzas)
                                    </option>
                                  ))
                                )}
                              </select>
                            </div>

                            <div className="form-group input-qty-col">
                              <label>Piezas</label>
                              <input
                                type="number"
                                min="1"
                                className="money-input input-qty"
                                value={item.quantity}
                                onChange={(e) => handleUpdateDozenRow(item.id, 'quantity', e.target.value)}
                              />
                            </div>

                            <button
                              type="button"
                              className="btn-remove-row"
                              onClick={() => handleRemoveDozenRow(item.id)}
                              title="Eliminar fila"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      className="btn-add-variant"
                      onClick={handleAddDozenRow}
                    >
                      + Agregar otra combinación a la docena
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* AVISO VISUAL SI ES VENTA LIBRE DE PLAYERAS */}
            {isShirtOperation && isManualFreeSale && (
              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.05)',
                  border: '1px dashed rgba(56, 189, 248, 0.3)',
                  padding: '1.25rem',
                  borderRadius: '10px',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: '0.92rem',
                }}
              >
                ✨ Modo Venta Libre activo: solo registrarás el ingreso financiero sin tocar las piezas de bodega.
              </div>
            )}

            {/* CASO 2: MERCHANDISING */}
            {isMerchSale && (
              <div className="shirt-special-box">
                <div className="mode-selector-header">
                  <span className="box-title">Detalle de {category}:</span>
                </div>
                <div className="print-card-row">
                  <div className="form-group print-col-technique">
                    <label>Producto</label>
                    <input type="text" className="money-input" value={category} disabled />
                  </div>
                  <div className="form-group print-col-spec">
                    <label>Especificación / Modelo</label>
                    <input
                      type="text"
                      className="money-input"
                      value={merchDetail.spec}
                      onChange={(e) => setMerchDetail({ ...merchDetail, spec: e.target.value })}
                    />
                  </div>
                  <div className="form-group print-col-meters">
                    <label>Piezas</label>
                    <input
                      type="number"
                      min="1"
                      className="money-input input-qty"
                      value={merchDetail.quantity}
                      onChange={(e) => setMerchDetail({ ...merchDetail, quantity: Number(e.target.value) })}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* CASO 3: GASTOS EN IMPRESIONES */}
            {isPrintExpense && (
              <div className="shirt-special-box">
                <div className="mode-selector-header">
                  <span className="box-title">Detalle de Insumo / Impresión:</span>
                </div>
                <div className="print-card-row">
                  <div className="form-group print-col-technique">
                    <label>Técnica</label>
                    <select
                      className="money-select"
                      value={printDetail.type}
                      onChange={(e) => setPrintDetail({ ...printDetail, type: e.target.value })}
                    >
                      {PRINT_TYPES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group print-col-spec">
                    <label>Especificación</label>
                    <input
                      type="text"
                      className="money-input"
                      value={printDetail.sizeOrSpec}
                      onChange={(e) => setPrintDetail({ ...printDetail, sizeOrSpec: e.target.value })}
                    />
                  </div>
                  <div className="form-group print-col-meters">
                    <label>Metros</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      className="money-input input-qty"
                      value={printDetail.quantity}
                      onChange={(e) => setPrintDetail({ ...printDetail, quantity: Number(e.target.value) })}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* CASO 4: OTROS (VENTAS O GASTOS) */}
            {(isOtherSale || (!isShirtOperation && !isPrintExpense && !isMerchSale)) && (
              <div className="shirt-special-box">
                <div className="mode-selector-header">
                  <span className="box-title">Cantidad de Unidades:</span>
                </div>
                <div className="generic-card-row">
                  <div className="form-group">
                    <label>Categoría</label>
                    <input type="text" className="money-input" value={category} disabled />
                  </div>
                  <div className="form-group input-qty-col">
                    <label>Piezas / Unidades</label>
                    <input
                      type="number"
                      min="1"
                      className="money-input input-qty"
                      value={generalQuantity}
                      onChange={(e) => setGeneralQuantity(Math.max(1, Number(e.target.value)))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Botón Paso 1 */}
            <div className="modal-actions-right">
              <button type="button" className="btn-cancel" onClick={handleCancel}>
                Cancelar
              </button>
              <button type="submit" className="money-btn-submit">
                Continuar a Definir Precio ➔
              </button>
            </div>
          </form>
        )}

        {/* ========================================================
            PASO 2: ASIGNACIÓN DE PRECIO TOTAL
           ======================================================== */}
        {step === 2 && (
          <form onSubmit={handleFinalSubmit} className="form-flow">
            <div className="step2-summary-card">
              <span className="summary-title">Resumen de lo Seleccionado:</span>
              <div className="summary-items">
                <div>Operación: <strong>{movementType === 'income' ? 'VENTA' : 'COMPRA / GASTO'}</strong> ({category})</div>

                <div>Fecha: <strong>{formattedDate}</strong></div>

                {itemDescription && (
                  <div>Concepto: <strong>{itemDescription}</strong></div>
                )}

                {movementType === 'income' && isShirtOperation && (
                  <div style={{ color: stockDeductionMode === 'deduct' ? '#38bdf8' : '#f59e0b', fontSize: '0.88rem' }}>
                    Modo: <strong>{stockDeductionMode === 'deduct' ? 'Descontará del almacén' : 'Venta libre (Sin mover stock)'}</strong>
                  </div>
                )}

                {!isManualFreeSale && isShirtOperation && (
                  <>
                    <div>Total Prendas: <strong>{totalUnits} piezas</strong></div>
                    {purchaseMode === 'dozen' ? (
                      <div className="summary-breakdown">
                        {dozenItems.map((i, idx) => (
                          <span key={idx} className="summary-tag">
                            {i.quantity}x {i.color} ({i.size}-{i.gender})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div>Variante: <strong>{singleQty}x {singleColor} ({singleSize} - {singleGender})</strong></div>
                    )}
                  </>
                )}

                {isMerchSale && (
                  <div>Cantidad: <strong>{merchDetail.quantity}x {category}</strong> ({merchDetail.spec})</div>
                )}

                {isPrintExpense && (
                  <div>Técnica: <strong>{printDetail.type}</strong> — {printDetail.quantity} m ({printDetail.sizeOrSpec})</div>
                )}

                {(isOtherSale || (!isShirtOperation && !isPrintExpense && !isMerchSale)) && (
                  <div>Cantidad: <strong>{generalQuantity} unidad(es)</strong></div>
                )}
              </div>
            </div>

            <div className="form-group price-step-group">
              <label className="highlight-label-big">Monto Total de Todo ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className="money-input input-price-big"
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
                autoFocus
                required
              />
              {Number(totalPrice) > 0 && totalUnits > 0 && !isManualFreeSale && (
                <span className="unit-cost-preview">
                  Equivale a un precio/costo promedio de <strong>${unitPriceEstimate}</strong> {isPrintExpense ? 'por metro' : 'por pieza'}
                </span>
              )}
            </div>

            <div className="form-group">
              <label>Notas Adicionales (Opcional)</label>
              <input
                type="text"
                placeholder="Ej. Transferencia Banamex, entregado en tienda..."
                className="money-input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="modal-actions-right">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setStep(1)}
              >
                ⬅ Volver a Editar Cantidades
              </button>
              <button type="submit" className="money-btn-submit btn-confirm-table">
                Confirmar y Guardar a Tablas ✓
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}