import { useState, useMemo } from 'react';

// Paleta textil con código HEX exacto
const SHIRT_COLORS = [
  { name: 'Negro', hex: '#111827', border: '#374151' },
  { name: 'Blanco', hex: '#ffffff', border: '#cbd5e1' },
  { name: 'Gris Jaspe', hex: '#64748b', border: '#94a3b8' },
  { name: 'Azul Marino', hex: '#111e38', border: '#25427b' },
  { name: 'Azul Rey', hex: '#1d4ed8', border: '#3b82f6' },
  { name: 'Rojo', hex: '#dc2626', border: '#ef4444' },
  { name: 'Vino / Tinto', hex: '#4c0519', border: '#881337' },
  { name: 'Verde Militar', hex: '#2d3b22', border: '#4d633a' },
  { name: 'Mostaza', hex: '#ca8a04', border: '#eab308' },
  { name: 'Beige / Arena', hex: '#d4c5a9', border: '#b8a686' },
  { name: 'Rosa Pastel', hex: '#f472b6', border: '#f9a8d4' },
];

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL'];
const GENDERS = ['Unisex', 'Hombre', 'Mujer', 'Niño'];

// Técnicas para Compras / Gastos en metros
const PRINT_TYPES = [
  'DTF Textil',
  'Sublimación',
  'Papel Albanene / Positivos',
  'Vinil Textil',
  'Vinil Adhesivo',
  'Otro Ploteo / Impresión',
];

// PRODUCTOS DE VENTA
const INCOME_CATEGORIES = [
  'Playera DTF',
  'Playera Sublimada',
  'Playmat',
  'Mousepad',
  'Taza Sublimada',
];

// CATEGORÍAS DE GASTOS / COMPRAS
const EXPENSE_CATEGORIES = [
  'Compra de Playeras Lisas',
  'Impresiones y Consumibles',
  'Envíos / Paquetería',
  'Servicios (Luz, Renta, Web)',
  'Otros Gastos',
];

export default function TransactionModal({ isOpen, onClose, onSave }) {
  if (!isOpen) return null;

  // Paso 1: Configurar piezas/metros | Paso 2: Fijar Precio Total
  const [step, setStep] = useState(1);

  const [movementType, setMovementType] = useState('income');
  const [category, setCategory] = useState(INCOME_CATEGORIES[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  // Dropdown de color activo
  const [openColorDropdownId, setOpenColorDropdownId] = useState(null);

  // Estados de Playeras
  const [purchaseMode, setPurchaseMode] = useState('individual');
  const [singleItem, setSingleItem] = useState({
    color: SHIRT_COLORS[0].name,
    size: SIZES[2],
    gender: GENDERS[0],
    quantity: 1,
  });
  const [dozenItems, setDozenItems] = useState([
    { id: 1, color: SHIRT_COLORS[0].name, size: 'M', gender: 'Hombre', quantity: 6 },
    { id: 2, color: SHIRT_COLORS[1].name, size: 'S', gender: 'Mujer', quantity: 6 },
  ]);

  // Estados de Impresión para gastos (DTF, Sublimación, etc.)
  const [printDetail, setPrintDetail] = useState({
    type: PRINT_TYPES[0],
    quantity: 1,
    sizeOrSpec: 'Ancho 60cm',
  });

  // Estados para Playmat, Mousepad y Tazas
  const [merchDetail, setMerchDetail] = useState({
    spec: 'Estándar TCG (60x35cm)',
    quantity: 1,
  });

  // Gastos generales
  const [generalQuantity, setGeneralQuantity] = useState(1);

  // Precio Total (Paso 2)
  const [totalPrice, setTotalPrice] = useState('');

  const isShirtOperation = category.includes('Playera');
  const isSublimatedShirt = category === 'Playera Sublimada';
  const isPrintExpense = movementType === 'expense' && category === 'Impresiones y Consumibles';
  const isMerchSale = movementType === 'income' && (category === 'Playmat' || category === 'Mousepad' || category === 'Taza Sublimada');

  // Suma total de unidades
  const totalUnits = useMemo(() => {
    if (isShirtOperation) {
      if (purchaseMode === 'individual') return Number(singleItem.quantity) || 1;
      return dozenItems.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
    }
    if (isPrintExpense) {
      return Number(printDetail.quantity) || 1;
    }
    if (isMerchSale) {
      return Number(merchDetail.quantity) || 1;
    }
    return Number(generalQuantity) || 1;
  }, [isShirtOperation, isPrintExpense, isMerchSale, purchaseMode, singleItem, dozenItems, printDetail, merchDetail, generalQuantity]);

  // Promedio unitario calculado en Paso 2
  const unitPriceEstimate = useMemo(() => {
    const cost = Number(totalPrice);
    if (!cost || totalUnits <= 0) return 0;
    return (cost / totalUnits).toFixed(2);
  }, [totalPrice, totalUnits]);

  const getColorObj = (colorName) => {
    return SHIRT_COLORS.find((c) => c.name === colorName) || SHIRT_COLORS[0];
  };

  const handleAddDozenRow = () => {
    const defaultColor = isSublimatedShirt ? 'Blanco' : SHIRT_COLORS[0].name;
    setDozenItems([
      ...dozenItems,
      {
        id: Date.now(),
        color: defaultColor,
        size: SIZES[2],
        gender: GENDERS[0],
        quantity: 1,
      },
    ]);
  };

  const handleRemoveDozenRow = (rowId) => {
    if (dozenItems.length <= 1) return;
    setDozenItems(dozenItems.filter((item) => item.id !== rowId));
  };

  const handleUpdateDozenRow = (rowId, field, value) => {
    setDozenItems(
      dozenItems.map((item) =>
        item.id === rowId
          ? { ...item, [field]: field === 'quantity' ? Number(value) : value }
          : item
      )
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

    // Si es playera sublimada, forzar color blanco inmediatamente
    if (newCat === 'Playera Sublimada') {
      setSingleItem((prev) => ({ ...prev, color: 'Blanco' }));
      setDozenItems((prev) => prev.map((item) => ({ ...item, color: 'Blanco' })));
    } else if (newCat === 'Playmat') {
      setMerchDetail({ spec: 'Estándar TCG (60x35cm cosido)', quantity: 1 });
    } else if (newCat === 'Mousepad') {
      setMerchDetail({ spec: 'Deskmat XL (90x40cm)', quantity: 1 });
    } else if (newCat === 'Taza Sublimada') {
      setMerchDetail({ spec: 'Blanca 11oz cerámica', quantity: 1 });
    }
  };

  const handleProceedToPrice = (e) => {
    e.preventDefault();
    if (totalUnits <= 0) return;
    setOpenColorDropdownId(null);
    setStep(2);
  };

  const handleFinalSubmit = (e) => {
    e.preventDefault();
    if (!totalPrice || Number(totalPrice) <= 0) return;

    let detailsText = '';
    let autoDesc = note;

    if (isShirtOperation) {
      if (purchaseMode === 'individual') {
        const qty = Number(singleItem.quantity) || 1;
        detailsText = `${qty}x ${singleItem.color} (${singleItem.size}, ${singleItem.gender})`;
        if (!autoDesc) autoDesc = `${movementType === 'income' ? 'Venta' : 'Compra'} ${category} (${singleItem.color})`;
      } else {
        const breakdown = dozenItems
          .map((i) => `${i.quantity}x ${i.color} [${i.size}-${i.gender}]`)
          .join(', ');
        detailsText = `${totalUnits} pzas: ${breakdown}`;
        if (!autoDesc) {
          autoDesc = `${movementType === 'income' ? 'Venta' : 'Compra'} lote ${category} (${totalUnits} pzas)`;
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
      date,
      mode: isShirtOperation ? purchaseMode : isMerchSale ? 'merch' : isPrintExpense ? 'print' : 'general',
      details: detailsText,
    };

    onSave(newTx);
    setStep(1);
    setTotalPrice('');
    setNote('');
    setOpenColorDropdownId(null);
    onClose();
  };

  const handleCancel = () => {
    setStep(1);
    setTotalPrice('');
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

              <div className="form-group">
                <label>Fecha</label>
                <input
                  type="date"
                  className="money-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* CASO 1: PLAYERAS (DTF / SUBLIMADA / COMPRA PLAYERAS LISAS) */}
            {isShirtOperation && (
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

                {/* INDIVIDUAL */}
                {purchaseMode === 'individual' && (
                  <div className="individual-card-box">
                    <div className="form-group color-custom-select-col">
                      <label>Color</label>
                      <button
                        type="button"
                        className={`color-custom-trigger ${isSublimatedShirt ? 'disabled-trigger' : ''}`}
                        onClick={() => {
                          if (!isSublimatedShirt) {
                            setOpenColorDropdownId(openColorDropdownId === 'single' ? null : 'single');
                          }
                        }}
                        title={isSublimatedShirt ? 'La playera para sublimar debe ser blanca' : 'Seleccionar color'}
                      >
                        <span
                          className="color-swatch-box"
                          style={{
                            backgroundColor: getColorObj(singleItem.color).hex,
                            borderColor: getColorObj(singleItem.color).border,
                          }}
                        />
                        <span className="color-label-text">{singleItem.color}</span>
                        <span className="custom-arrow">{isSublimatedShirt ? '🔒' : '▼'}</span>
                      </button>

                      {/* Dropdown solo disponible si no es sublimada */}
                      {!isSublimatedShirt && openColorDropdownId === 'single' && (
                        <div className="color-custom-dropdown-list">
                          {SHIRT_COLORS.map((c) => (
                            <button
                              type="button"
                              key={c.name}
                              className={`color-dropdown-item ${singleItem.color === c.name ? 'active' : ''}`}
                              onClick={() => {
                                setSingleItem({ ...singleItem, color: c.name });
                                setOpenColorDropdownId(null);
                              }}
                            >
                              <span
                                className="color-swatch-box"
                                style={{ backgroundColor: c.hex, borderColor: c.border }}
                              />
                              <span className="color-dropdown-name">{c.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Talla</label>
                      <select
                        className="money-select"
                        value={singleItem.size}
                        onChange={(e) => setSingleItem({ ...singleItem, size: e.target.value })}
                      >
                        {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Género</label>
                      <select
                        className="money-select"
                        value={singleItem.gender}
                        onChange={(e) => setSingleItem({ ...singleItem, gender: e.target.value })}
                      >
                        {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>

                    <div className="form-group input-qty-col">
                      <label>Piezas</label>
                      <input
                        type="number"
                        min="1"
                        className="money-input input-qty"
                        value={singleItem.quantity}
                        onChange={(e) => setSingleItem({ ...singleItem, quantity: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                )}

                {/* DOCENA */}
                {purchaseMode === 'dozen' && (
                  <div className="dozen-breakdown-box">
                    <div className="dozen-status-bar">
                      <span>Total Piezas Sumadas: <strong>{totalUnits} piezas</strong></span>
                    </div>

                    <div className="dozen-rows-container">
                      {dozenItems.map((item, index) => (
                        <div key={item.id} className="variant-card-box">
                          <span className="row-num">#{index + 1}</span>

                          <div className="form-group color-custom-select-col">
                            <label>Color</label>
                            <button
                              type="button"
                              className={`color-custom-trigger ${isSublimatedShirt ? 'disabled-trigger' : ''}`}
                              onClick={() => {
                                if (!isSublimatedShirt) {
                                  setOpenColorDropdownId(openColorDropdownId === item.id ? null : item.id);
                                }
                              }}
                              title={isSublimatedShirt ? 'La playera para sublimar debe ser blanca' : 'Seleccionar color'}
                            >
                              <span
                                className="color-swatch-box"
                                style={{
                                  backgroundColor: getColorObj(item.color).hex,
                                  borderColor: getColorObj(item.color).border,
                                }}
                              />
                              <span className="color-label-text">{item.color}</span>
                              <span className="custom-arrow">{isSublimatedShirt ? '🔒' : '▼'}</span>
                            </button>

                            {!isSublimatedShirt && openColorDropdownId === item.id && (
                              <div className="color-custom-dropdown-list">
                                {SHIRT_COLORS.map((c) => (
                                  <button
                                    type="button"
                                    key={c.name}
                                    className={`color-dropdown-item ${item.color === c.name ? 'active' : ''}`}
                                    onClick={() => {
                                      handleUpdateDozenRow(item.id, 'color', c.name);
                                      setOpenColorDropdownId(null);
                                    }}
                                  >
                                    <span
                                      className="color-swatch-box"
                                      style={{ backgroundColor: c.hex, borderColor: c.border }}
                                    />
                                    <span className="color-dropdown-name">{c.name}</span>
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
                              {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>

                          <div className="form-group">
                            <label>Género</label>
                            <select
                              className="money-select"
                              value={item.gender}
                              onChange={(e) => handleUpdateDozenRow(item.id, 'gender', e.target.value)}
                            >
                              {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
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
                      ))}
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

            {/* CASO 2: MERCHANDISING (PLAYMAT / MOUSEPAD / TAZA SUBLIMADA) */}
            {isMerchSale && (
              <div className="shirt-special-box">
                <div className="mode-selector-header">
                  <span className="box-title">Detalle de {category}:</span>
                </div>

                <div className="print-card-row">
                  <div className="form-group print-col-technique">
                    <label>Producto</label>
                    <input
                      type="text"
                      className="money-input"
                      value={category}
                      disabled
                    />
                  </div>

                  <div className="form-group print-col-spec">
                    <label>Especificación / Modelo</label>
                    <input
                      type="text"
                      placeholder="Ej. TCG 60x35cm cosido, Deskmat XL 90x40, Cerámica 11oz..."
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

            {/* CASO 3: GASTOS EN IMPRESIONES Y CONSUMIBLES (DTF, SUBLIMACIÓN, ALBANENE) */}
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
                      placeholder="Ej. Ancho 60cm, pliego continuo..."
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

            {/* CASO 4: OTROS GASTOS GENERALES */}
            {!isShirtOperation && !isPrintExpense && !isMerchSale && (
              <div className="shirt-special-box">
                <div className="mode-selector-header">
                  <span className="box-title">Detalle del Gasto:</span>
                </div>
                <div className="generic-card-row">
                  <div className="form-group">
                    <label>Concepto</label>
                    <input
                      type="text"
                      className="money-input"
                      value={category}
                      disabled
                    />
                  </div>
                  <div className="form-group input-qty-col">
                    <label>Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      className="money-input input-qty"
                      value={generalQuantity}
                      onChange={(e) => setGeneralQuantity(Number(e.target.value))}
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
            PASO 2: ASIGNACIÓN DE PRECIO TOTAL Y ENVÍO A TABLAS
           ======================================================== */}
        {step === 2 && (
          <form onSubmit={handleFinalSubmit} className="form-flow">
            <div className="step2-summary-card">
              <span className="summary-title">Resumen de lo Seleccionado:</span>
              <div className="summary-items">
                <div>Operación: <strong>{movementType === 'income' ? 'VENTA' : 'COMPRA / GASTO'}</strong> ({category})</div>

                {isShirtOperation && (
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
                      <div>Variante: <strong>{singleItem.quantity}x {singleItem.color} ({singleItem.size} - {singleItem.gender})</strong></div>
                    )}
                  </>
                )}

                {isMerchSale && (
                  <div>
                    Cantidad: <strong>{merchDetail.quantity}x {category}</strong> ({merchDetail.spec})
                  </div>
                )}

                {isPrintExpense && (
                  <div>
                    Técnica: <strong>{printDetail.type}</strong> — {printDetail.quantity} metro(s) ({printDetail.sizeOrSpec})
                  </div>
                )}

                {!isShirtOperation && !isPrintExpense && !isMerchSale && (
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
              {Number(totalPrice) > 0 && totalUnits > 0 && (
                <span className="unit-cost-preview">
                  Equivale a un precio/costo promedio de <strong>${unitPriceEstimate}</strong> {isPrintExpense ? 'por metro' : 'por pieza'}
                </span>
              )}
            </div>

            <div className="form-group">
              <label>Descripción / Nota Opcional</label>
              <input
                type="text"
                placeholder="Ej. Cliente local, pedido especial, entrega express..."
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