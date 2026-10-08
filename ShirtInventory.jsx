import { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';

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

export default function ShirtInventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterColor, setFilterColor] = useState('Todos');

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shirt_inventory')
        .select('*')
        .order('color', { ascending: true });

      if (error) throw error;
      setInventory(data || []);
    } catch (err) {
      console.error('Error cargando inventario:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleStockAdjust = async (item, delta) => {
    const newStock = Math.max(0, item.stock + delta);
    try {
      const { error } = await supabase
        .from('shirt_inventory')
        .update({ stock: newStock, updated_at: new Date().toISOString() })
        .eq('id', item.id);

      if (error) throw error;
      setInventory((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, stock: newStock } : i))
      );
    } catch (err) {
      alert('Error actualizando stock: ' + err.message);
    }
  };

  const totalPieces = useMemo(() => {
    return inventory.reduce((acc, curr) => acc + (curr.stock || 0), 0);
  }, [inventory]);

  const filteredItems = useMemo(() => {
    if (filterColor === 'Todos') return inventory;
    return inventory.filter((i) => i.color === filterColor);
  }, [inventory, filterColor]);

  const getColorObj = (colorName) => {
    return SHIRT_COLORS.find((c) => c.name === colorName) || { hex: '#1e293b', border: '#334155' };
  };

  return (
    <section className="inventory-section">
      <div className="inventory-header">
        <div className="inventory-title-group">
          <h2 className="section-title">Stock de Playeras</h2>
          <span className="stock-total-badge">Total en Bodega: <strong>{totalPieces} piezas</strong></span>
        </div>

        <div className="inventory-filter-box">
          <label>Filtrar Color:</label>
          <select
            className="period-sub-select"
            value={filterColor}
            onChange={(e) => setFilterColor(e.target.value)}
          >
            <option value="Todos">Todos los Colores</option>
            {SHIRT_COLORS.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="empty-box">Cargando inventario...</div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-box">
          No hay registros de inventario aún. Registra compras de playeras o agrega existencias.
        </div>
      ) : (
        <div className="inventory-grid">
          {filteredItems.map((item) => {
            const colorData = getColorObj(item.color);
            const isLowStock = item.stock <= 3;

            return (
              <div key={item.id} className={`inventory-card ${isLowStock ? 'low-stock-alert' : ''}`}>
                <div className="inv-card-top">
                  <div className="inv-color-badge">
                    <span
                      className="color-swatch-box"
                      style={{ backgroundColor: colorData.hex, borderColor: colorData.border }}
                    />
                    <strong>{item.color}</strong>
                  </div>
                  <span className="inv-tag">{item.gender}</span>
                </div>

                <div className="inv-card-mid">
                  <span className="inv-size">Talla: <strong>{item.size}</strong></span>
                  <div className="inv-stock-display">
                    <span className="inv-stock-num">{item.stock}</span>
                    <span className="inv-stock-lbl">piezas</span>
                  </div>
                </div>

                <div className="inv-card-bottom">
                  <button
                    type="button"
                    className="btn-stock-qty"
                    onClick={() => handleStockAdjust(item, -1)}
                    disabled={item.stock === 0}
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    className="btn-stock-qty"
                    onClick={() => handleStockAdjust(item, 1)}
                  >
                    +1
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}