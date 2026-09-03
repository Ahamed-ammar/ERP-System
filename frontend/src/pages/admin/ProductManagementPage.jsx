import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  getAllProducts,
  createProduct,
  updateProduct,
  toggleProductStatus,
  updateProductStock,
} from '../../api/productApi';
import Modal from '../../components/common/Modal';

const PRODUCT_IMAGES = {
  wheat: '/images/wheat.jpg', rice: '/images/rice.jpg',
  turmeric: '/images/turmeric-powder.jpg', chili: '/images/chilli.jpg',
  chilli: '/images/chilli.jpg', coriander: '/images/Coriander.jpg',
  'garam masala': '/images/garam masala.jpg', ragi: '/images/ragi.jpg',
};

const getProductImage = (name) => {
  if (!name) return null;
  const key = Object.keys(PRODUCT_IMAGES).find(k => name.toLowerCase().includes(k));
  return key ? PRODUCT_IMAGES[key] : null;
};

/** True if product stock is below its threshold */
const isLowStock = (p) => p.isActive && p.stockKg < p.lowStockThresholdKg;

const StockBadge = ({ product }) => {
  const { stockKg, lowStockThresholdKg } = product;
  const low = isLowStock(product);

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        {low && (
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" title="Low stock" />
        )}
        <span className={`font-bold text-sm ${low ? 'text-amber-600' : 'text-on-surface'}`}>
          {stockKg?.toFixed(1) ?? '0.0'} kg
        </span>
      </div>
      <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wide">
        Min {lowStockThresholdKg ?? 10} kg
      </span>
    </div>
  );
};

const ProductManagementPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Product form modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '', rawMaterialPricePerKg: '', grindingChargePerKg: '', description: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Stock update modal
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState(null);
  const [stockForm, setStockForm] = useState({ stockKg: '', lowStockThresholdKg: '' });
  const [stockErrors, setStockErrors] = useState({});
  const [stockSubmitting, setStockSubmitting] = useState(false);

  // Tab
  const [activeTab, setActiveTab] = useState('All');

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await getAllProducts();
      setProducts(res.data?.products || []);
    } catch {
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  // ── Product CRUD ──────────────────────────────────────────────────────────

  const openProductModal = (product = null) => {
    setEditingProduct(product);
    setFormData(product ? {
      name: product.name,
      rawMaterialPricePerKg: product.rawMaterialPricePerKg,
      grindingChargePerKg: product.grindingChargePerKg,
      description: product.description || '',
    } : { name: '', rawMaterialPricePerKg: '', grindingChargePerKg: '', description: '' });
    setFormErrors({});
    setIsProductModalOpen(true);
  };

  const handleProductSubmit = async () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Required';
    if (formData.rawMaterialPricePerKg === '' || Number(formData.rawMaterialPricePerKg) < 0)
      errors.rawMaterialPricePerKg = 'Required, must be ≥ 0';
    if (formData.grindingChargePerKg === '' || Number(formData.grindingChargePerKg) < 0)
      errors.grindingChargePerKg = 'Required, must be ≥ 0';
    if (Object.keys(errors).length) { setFormErrors(errors); return; }

    try {
      setSubmitting(true);
      const payload = new FormData();
      payload.append('name', formData.name.trim());
      payload.append('rawMaterialPricePerKg', parseFloat(formData.rawMaterialPricePerKg));
      payload.append('grindingChargePerKg', parseFloat(formData.grindingChargePerKg));
      payload.append('description', formData.description.trim());
      if (editingProduct) {
        await updateProduct(editingProduct._id, payload);
        toast.success('Product updated');
      } else {
        await createProduct(payload);
        toast.success('Product created');
      }
      setIsProductModalOpen(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id, isActive) => {
    try {
      await toggleProductStatus(id);
      toast.success(`Product ${isActive ? 'disabled' : 'enabled'}`);
      fetchProducts();
    } catch {
      toast.error('Failed to toggle status');
    }
  };

  // ── Stock management ──────────────────────────────────────────────────────

  const openStockModal = (product) => {
    setStockProduct(product);
    setStockForm({
      stockKg: product.stockKg ?? 0,
      lowStockThresholdKg: product.lowStockThresholdKg ?? 10,
    });
    setStockErrors({});
    setIsStockModalOpen(true);
  };

  const handleStockSubmit = async () => {
    const errors = {};
    const kg = parseFloat(stockForm.stockKg);
    const threshold = parseFloat(stockForm.lowStockThresholdKg);
    if (isNaN(kg) || kg < 0) errors.stockKg = 'Must be a number ≥ 0';
    if (isNaN(threshold) || threshold < 0) errors.lowStockThresholdKg = 'Must be a number ≥ 0';
    if (Object.keys(errors).length) { setStockErrors(errors); return; }

    try {
      setStockSubmitting(true);
      await updateProductStock(stockProduct._id, kg, threshold);
      toast.success(`Stock updated for "${stockProduct.name}"`);
      setIsStockModalOpen(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update stock');
    } finally {
      setStockSubmitting(false);
    }
  };

  // ── Derived stats ─────────────────────────────────────────────────────────

  const activeCount   = products.filter(p => p.isActive).length;
  const inactiveCount = products.filter(p => !p.isActive).length;
  const lowStockCount = products.filter(isLowStock).length;
  const avgMaterial   = products.length
    ? (products.reduce((s, p) => s + p.rawMaterialPricePerKg, 0) / products.length).toFixed(0)
    : 0;

  const tabs = [
    { key: 'All',      label: `All (${products.length})` },
    { key: 'Active',   label: `Active (${activeCount})` },
    { key: 'Inactive', label: `Inactive (${inactiveCount})` },
    { key: 'LowStock', label: `Low Stock (${lowStockCount})`, warn: lowStockCount > 0 },
  ];

  const displayed =
    activeTab === 'Active'   ? products.filter(p => p.isActive) :
    activeTab === 'Inactive' ? products.filter(p => !p.isActive) :
    activeTab === 'LowStock' ? products.filter(isLowStock) :
    products;

  return (
    <div className="md:ml-64 min-h-screen bg-background pt-16 md:pt-0">
      <div className="pt-8 px-6 md:px-10 pb-12">

        {/* Header */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <nav className="flex items-center gap-2 text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest mb-2">
              <span>Admin</span>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <span className="text-primary">Products</span>
            </nav>
            <h2 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight">
              Menu Management
            </h2>
            <p className="text-on-surface-variant mt-2 max-w-lg">
              Manage your product catalog, pricing, stock levels, and availability.
            </p>
          </div>
          <button
            onClick={() => openProductModal()}
            className="sage-gradient text-on-primary px-8 py-4 rounded-full font-headline font-bold flex items-center gap-3 shadow-sage hover:shadow-sage-lg hover:scale-[1.02] transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">add_circle</span>
            Add New Product
          </button>
        </section>

        {/* Low-stock banner */}
        {lowStockCount > 0 && (
          <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 px-5 py-4 rounded-xl">
            <span className="material-symbols-outlined text-amber-500 flex-shrink-0 mt-0.5">warning</span>
            <div>
              <p className="font-bold text-sm">
                {lowStockCount} product{lowStockCount > 1 ? 's are' : ' is'} running low on raw material stock.
              </p>
              <p className="text-xs mt-0.5">
                Click the <span className="font-bold">inventory</span> icon on any product row to top up its stock.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('LowStock')}
              className="ml-auto text-xs font-bold underline underline-offset-2 whitespace-nowrap"
            >
              View all
            </button>
          </div>
        )}

        {/* Product Table */}
        <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-card">

          {/* Tabs */}
          <div className="p-6 border-b border-surface-container-low flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-low/30">
            <div className="flex flex-wrap gap-2">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === t.key
                      ? 'bg-primary-container text-on-primary-container'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {t.warn && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                  )}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="py-20 text-center">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-3 block">inventory_2</span>
              <p className="text-on-surface-variant font-medium">No products found</p>
              {activeTab === 'All' && (
                <button onClick={() => openProductModal()} className="mt-4 text-primary font-bold hover:underline">
                  Add your first product
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[11px] uppercase tracking-[0.15em] text-on-surface-variant font-extrabold border-b border-surface-container-low">
                    <th className="py-5 px-8">Product Details</th>
                    <th className="py-5 px-4">Raw Material</th>
                    <th className="py-5 px-4">Grinding Charge</th>
                    <th className="py-5 px-4">Stock</th>
                    <th className="py-5 px-4">Status</th>
                    <th className="py-5 px-8 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {displayed.map(product => {
                    const img = getProductImage(product.name);
                    const low = isLowStock(product);
                    return (
                      <tr
                        key={product._id}
                        className={`group hover:bg-surface-container-low/50 transition-colors ${!product.isActive ? 'opacity-60' : ''}`}
                      >
                        {/* Product details */}
                        <td className="py-6 px-8">
                          <div className="flex items-center gap-4">
                            <div className={`w-16 h-16 rounded-xl overflow-hidden bg-surface-container flex-shrink-0 ${!product.isActive ? 'grayscale' : ''}`}>
                              {img ? (
                                <img src={img} alt={product.name} className="w-full h-full object-cover"
                                  onError={e => { e.target.style.display = 'none'; }} />
                              ) : (
                                <div className="w-full h-full bg-primary-container flex items-center justify-center">
                                  <span className="material-symbols-outlined text-primary text-2xl">grain</span>
                                </div>
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold text-on-surface text-base">{product.name}</h4>
                              {product.description && (
                                <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">{product.description}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Raw material price */}
                        <td className="py-6 px-4">
                          <span className="font-bold text-on-surface">₹{product.rawMaterialPricePerKg}</span>
                          <span className="text-[10px] text-on-surface-variant block uppercase font-bold mt-0.5">Per KG</span>
                        </td>

                        {/* Grinding charge */}
                        <td className="py-6 px-4">
                          <span className="font-bold text-primary">₹{product.grindingChargePerKg}</span>
                          <span className="text-[10px] text-on-surface-variant block uppercase font-bold mt-0.5">Per KG</span>
                        </td>

                        {/* Stock */}
                        <td className="py-6 px-4">
                          <StockBadge product={product} />
                        </td>

                        {/* Status */}
                        <td className="py-6 px-4">
                          {product.isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-container text-on-primary-container rounded-full text-xs font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container-high text-on-surface-variant rounded-full text-xs font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-outline" />
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-6 px-8 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Stock update */}
                            <button
                              onClick={() => openStockModal(product)}
                              className={`p-2 rounded-xl transition-colors ${
                                low
                                  ? 'text-amber-500 hover:bg-amber-100 opacity-100'
                                  : 'text-on-surface-variant hover:text-primary hover:bg-primary-container/20'
                              }`}
                              title="Update stock"
                            >
                              <span className="material-symbols-outlined">inventory</span>
                            </button>
                            {/* Edit */}
                            <button
                              onClick={() => openProductModal(product)}
                              className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary-container/20 rounded-xl transition-colors"
                              title="Edit product"
                            >
                              <span className="material-symbols-outlined">edit_note</span>
                            </button>
                            {/* Toggle active */}
                            <button
                              onClick={() => handleToggle(product._id, product.isActive)}
                              className={`p-2 rounded-xl transition-colors ${
                                product.isActive
                                  ? 'text-on-surface-variant hover:text-error hover:bg-error-container/10'
                                  : 'text-primary hover:bg-primary-container/20'
                              }`}
                              title={product.isActive ? 'Disable' : 'Enable'}
                            >
                              <span className="material-symbols-outlined">
                                {product.isActive ? 'block' : 'check_circle'}
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="p-6 border-t border-surface-container-low flex justify-between items-center text-sm font-medium text-on-surface-variant">
            <span>Showing {displayed.length} of {products.length} products</span>
          </div>
        </div>

        {/* Info Cards */}
        <section className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-primary-container/30 p-6 rounded-xl flex items-center gap-5">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-3xl">trending_up</span>
            </div>
            <div>
              <h5 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Avg. Material Cost</h5>
              <p className="font-headline text-2xl font-extrabold text-on-surface">
                ₹{avgMaterial} <span className="text-xs font-bold text-on-surface-variant">/ KG</span>
              </p>
            </div>
          </div>
          <div className="bg-secondary-container/30 p-6 rounded-xl flex items-center gap-5">
            <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-3xl">precision_manufacturing</span>
            </div>
            <div>
              <h5 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Active Products</h5>
              <p className="font-headline text-2xl font-extrabold text-on-surface">
                {activeCount} <span className="text-[10px] font-bold">ITEMS</span>
              </p>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl flex items-center gap-5 shadow-card border border-surface-container-low">
            <div className="w-14 h-14 rounded-full bg-on-surface/5 flex items-center justify-center text-on-surface">
              <span className="material-symbols-outlined text-3xl">inventory_2</span>
            </div>
            <div>
              <h5 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Inactive</h5>
              <p className="font-headline text-2xl font-extrabold text-on-surface">
                {inactiveCount} <span className="text-xs font-bold text-on-surface-variant/40">ITEMS</span>
              </p>
            </div>
          </div>
          <div className={`p-6 rounded-xl flex items-center gap-5 ${lowStockCount > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-surface-container-lowest shadow-card border border-surface-container-low'}`}>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${lowStockCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-on-surface/5 text-on-surface-variant'}`}>
              <span className="material-symbols-outlined text-3xl">
                {lowStockCount > 0 ? 'warning' : 'check_circle'}
              </span>
            </div>
            <div>
              <h5 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Low Stock</h5>
              <p className={`font-headline text-2xl font-extrabold ${lowStockCount > 0 ? 'text-amber-600' : 'text-on-surface'}`}>
                {lowStockCount} <span className="text-xs font-bold text-on-surface-variant/40">ITEMS</span>
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ── Product Form Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
      >
        <div className="space-y-4">
          {[
            { label: 'Product Name', name: 'name', type: 'text', placeholder: 'e.g., Wheat, Rice, Turmeric' },
            { label: 'Raw Material Price (₹/kg)', name: 'rawMaterialPricePerKg', type: 'number', placeholder: '0.00' },
            { label: 'Grinding Charge (₹/kg)', name: 'grindingChargePerKg', type: 'number', placeholder: '0.00' },
          ].map(field => (
            <div key={field.name}>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1 mb-1 block">
                {field.label}
              </label>
              <input
                type={field.type}
                name={field.name}
                value={formData[field.name]}
                onChange={e => setFormData(p => ({ ...p, [e.target.name]: e.target.value }))}
                placeholder={field.placeholder}
                min={field.type === 'number' ? '0' : undefined}
                step={field.type === 'number' ? '0.01' : undefined}
                className={`w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:outline-none text-on-surface ${formErrors[field.name] ? 'ring-2 ring-error' : ''}`}
                style={{ fontSize: '16px' }}
              />
              {formErrors[field.name] && (
                <p className="text-xs text-error mt-1 ml-1">{formErrors[field.name]}</p>
              )}
            </div>
          ))}
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1 mb-1 block">
              Description (optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              placeholder="Brief product description"
              rows="3"
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:outline-none text-on-surface resize-none"
              style={{ fontSize: '16px' }}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleProductSubmit}
              disabled={submitting}
              className="flex-1 sage-gradient text-on-primary font-headline font-bold py-3 rounded-full shadow-sage hover:shadow-sage-lg active:scale-95 transition-all disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
            </button>
            <button
              onClick={() => setIsProductModalOpen(false)}
              className="flex-1 bg-surface-container-low text-on-surface font-headline font-bold py-3 rounded-full hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Stock Update Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        title={`Update Stock — ${stockProduct?.name}`}
      >
        {stockProduct && (
          <div className="space-y-4">
            {/* Current stock info */}
            <div className="bg-surface-container-low rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Current Stock</p>
                <p className={`font-headline text-2xl font-extrabold mt-1 ${isLowStock(stockProduct) ? 'text-amber-600' : 'text-on-surface'}`}>
                  {stockProduct.stockKg?.toFixed(2) ?? '0.00'} kg
                </p>
              </div>
              {isLowStock(stockProduct) && (
                <div className="flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-xs font-bold">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  Low Stock
                </div>
              )}
            </div>

            <p className="text-xs text-on-surface-variant bg-surface-container-low rounded-xl px-4 py-3">
              <span className="font-bold">Note:</span> Set the total stock available in kg.
              Only <span className="font-bold">Buy &amp; Service</span> orders consume raw material stock.
              Service-only customers bring their own material.
            </p>

            {/* Stock fields */}
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1 mb-1 block">
                New Stock (kg)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={stockForm.stockKg}
                onChange={e => setStockForm(p => ({ ...p, stockKg: e.target.value }))}
                className={`w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:outline-none text-on-surface ${stockErrors.stockKg ? 'ring-2 ring-error' : ''}`}
                style={{ fontSize: '16px' }}
              />
              {stockErrors.stockKg && (
                <p className="text-xs text-error mt-1 ml-1">{stockErrors.stockKg}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1 mb-1 block">
                Low Stock Alert Threshold (kg)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={stockForm.lowStockThresholdKg}
                onChange={e => setStockForm(p => ({ ...p, lowStockThresholdKg: e.target.value }))}
                className={`w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:outline-none text-on-surface ${stockErrors.lowStockThresholdKg ? 'ring-2 ring-error' : ''}`}
                style={{ fontSize: '16px' }}
              />
              {stockErrors.lowStockThresholdKg && (
                <p className="text-xs text-error mt-1 ml-1">{stockErrors.lowStockThresholdKg}</p>
              )}
              <p className="text-xs text-on-surface-variant mt-1 ml-1">
                Alert appears when stock falls below this level.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleStockSubmit}
                disabled={stockSubmitting}
                className="flex-1 sage-gradient text-on-primary font-headline font-bold py-3 rounded-full shadow-sage hover:shadow-sage-lg active:scale-95 transition-all disabled:opacity-50"
              >
                {stockSubmitting ? 'Saving...' : 'Update Stock'}
              </button>
              <button
                onClick={() => setIsStockModalOpen(false)}
                className="flex-1 bg-surface-container-low text-on-surface font-headline font-bold py-3 rounded-full hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProductManagementPage;
