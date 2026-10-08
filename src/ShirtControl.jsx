import { useState, useMemo } from 'react';
import './ShirtControl.css';

const GENDERS = ['Unisex', 'Hombre', 'Mujer', 'Niño'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL'];
const COLORS = ['Negro', 'Blanco', 'Gris', 'Azul Marino', 'Rojo', 'Verde Militar'];
const STORAGE_KEY = 'shirt_inventory_db';

const DEFAULT_INVENTORY = [
  { id: 'sh-1', color: 'Negro', size: 'M', gender: 'Hombre', price: 250, stock: 15 },
  { id: 'sh-2', color: 'Blanco', size: 'S', gender: 'Mujer', price: 250, stock: 8 },
  { id: 'sh-3', color: 'Azul Marino', size: 'L', gender: 'Unisex', price: 280, stock: 12 },
];

export default function ShirtControl() {
  const [inventory, setInventory] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_INVENTORY;
    } catch {
      return DEFAULT_INVENTORY;
    }
  });

  const [form, setForm] = useState({
    color: COLORS[0],
    size: SIZES[2],
    gender: GENDERS[0],
    price: 250,
    stock: 10,
  });

  const [filters, setFilters] = useState({
    color: '',
    size: '',
    gender: '',
    maxPrice: '',
    query: '',
  });

  const saveInventory = (items) => {
    setInventory(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  };

  const handleCreate = (e) => {
    e.preventDefault();
    const newItem = {
      ...form,
      id: `sh-${Date.now()}`,
      price: Number(form.price) || 0,
      stock: Number(form.stock) || 0,
    };
    saveInventory([newItem, ...inventory]);
  };

  const handleDelete = (id) => {
    saveInventory(inventory.filter((item) => item.id !== id));
  };

  const handleStockDelta = (id, currentStock, delta) => {
    const nextStock = Math.max(0, currentStock + delta);
    const updated = inventory.map((item) =>
      item.id === id ? { ...item, stock: nextStock } : item
    );
    saveInventory(updated);
  };

  const filteredItems = useMemo(() => {
    return inventory.filter((item) => {
      if (filters.color && item.color !== filters.color) return false;
      if (filters.size && item.size !== filters.size) return false;
      if (filters.gender && item.gender !== filters.gender) return false;
      if (filters.maxPrice && item.price > Number(filters.maxPrice)) return false;
      return true;
    });
  }, [inventory, filters]);

  return (
    <div className="shirt-container">
      {/* Formulario de Alta */}
      <div className="shirt-card">
        <h2 className="section-title">Registrar Nueva Playera</h2>
        <form onSubmit={handleCreate} className="form-grid">
          <div className="form-group">
            <label>Color</label>
            <select
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
            >
              {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Talla</label>
            <select
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
            >
              {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Género</label>
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Precio ($)</label>
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            />
          </div>

          <div className="form-group">
            <label>Stock Inicial</label>
            <input
              type="number"
              min="0"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
            />
          </div>

          <button type="submit" className="btn-primary">
            Agregar
          </button>
        </form>
      </div>

      {/* Filtros */}
      <div className="shirt-card">
        <h3 className="filter-title">Filtrar Catálogo</h3>
        <div className="filter-grid">
          <select
            value={filters.color}
            onChange={(e) => setFilters({ ...filters, color: e.target.value })}
          >
            <option value="">Todos los Colores</option>
            {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={filters.size}
            onChange={(e) => setFilters({ ...filters, size: e.target.value })}
          >
            <option value="">Todas las Tallas</option>
            {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={filters.gender}
            onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
          >
            <option value="">Todos los Géneros</option>
            {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>

          <input
            type="number"
            placeholder="Precio Máx ($)"
            value={filters.maxPrice}
            onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
          />

          <button
            type="button"
            className="btn-clear"
            onClick={() => setFilters({ color: '', size: '', gender: '', maxPrice: '', query: '' })}
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Tabla de Inventario */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Color</th>
              <th>Talla</th>
              <th>Género</th>
              <th>Precio</th>
              <th>Stock</th>
              <th className="cell-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-row">
                  No hay playeras que coincidan con los filtros aplicados.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id}>
                  <td className="item-color">{item.color}</td>
                  <td><span className="badge-size">{item.size}</span></td>
                  <td className="item-gender">{item.gender}</td>
                  <td className="item-price">${Number(item.price).toFixed(2)}</td>
                  <td>
                    <div className="stock-counter">
                      <button
                        type="button"
                        className="btn-stock"
                        onClick={() => handleStockDelta(item.id, item.stock, -1)}
                      >
                        -
                      </button>
                      <span className="stock-number">{item.stock}</span>
                      <button
                        type="button"
                        className="btn-stock"
                        onClick={() => handleStockDelta(item.id, item.stock, 1)}
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="cell-center">
                    <button
                      type="button"
                      className="btn-delete"
                      onClick={() => handleDelete(item.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}