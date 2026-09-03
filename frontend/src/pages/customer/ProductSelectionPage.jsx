import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { getProducts } from '../../api/productApi';
import { toast } from 'react-toastify';
import CustomerHeader from '../../components/common/CustomerHeader';

const getProductImage = (product) => {
  const map = {
    wheat: '/images/wheat.jpg', rice: '/images/rice.jpg',
    turmeric: '/images/turmeric-powder.jpg', chili: '/images/chilli.jpg',
    chilli: '/images/chilli.jpg', coriander: '/images/Coriander.jpg',
    'garam masala': '/images/garam masala.jpg', ragi: '/images/ragi.jpg',
  };
  if (product?.name) {
    const key = Object.keys(map).find(k => product.name.toLowerCase().includes(k));
    if (key) return map[key];
  }
  return null;
};

const ProductSelectionPage = () => {
  const navigate = useNavigate();
  const { items, totalAmount, addToCart, removeFromCart, getItemCount } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState({});
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    getProducts()
      .then(data => setProducts(data || []))
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  }, []);

  const updateSelection = (id, field, value) =>
    setSelections(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const handleAddToCart = (product) => {
    const sel = selections[product._id] || {};
    if (!sel.quantity || sel.quantity <= 0) return toast.error('Enter a valid quantity');
    if (!sel.grindType) return toast.error('Select a grind level');
    if (!sel.orderType) return toast.error('Select an order type');
    addToCart(product, sel.quantity, sel.grindType, sel.orderType);
    toast.success(`${product.name} added to cart`);
    setSelections(prev => ({ ...prev, [product._id]: { quantity: 0, grindType: '', orderType: '' } }));
  };

  const handleContinue = () => {
    if (items.length === 0) return toast.error('Add at least one item to your cart');
    navigate('/order/address');
  };

  if (loading) {
    return (
      <>
        <CustomerHeader />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <CustomerHeader />
      <div className="min-h-screen bg-background pb-32">
        <main className="max-w-7xl mx-auto px-6 md:px-8 py-16">
          {/* Progress */}
          <div className="flex items-center justify-center mb-16">
            <div className="flex items-center w-full max-w-lg">
              {[['1', 'Select Products', true], ['2', 'Address', false], ['3', 'Review', false]].map(([num, label, active], i, arr) => (
                <div key={num} className={`flex items-center ${i < arr.length - 1 ? 'flex-1' : ''}`}>
                  <div className="flex flex-col items-center">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-headline font-bold ${active ? 'sage-gradient text-on-primary shadow-sage' : 'bg-surface-container-highest text-on-surface opacity-40'}`}>{num}</div>
                    <span className={`mt-2 text-xs font-headline font-bold whitespace-nowrap ${active ? 'text-primary' : 'text-on-surface-variant opacity-40'}`}>{label}</span>
                  </div>
                  {i < arr.length - 1 && <div className={`h-1 flex-1 mx-3 rounded-full ${active ? 'bg-primary-container' : 'bg-surface-container-highest'}`} />}
                </div>
              ))}
            </div>
          </div>

          <header className="text-center mb-16 max-w-3xl mx-auto">
            <h1 className="font-headline text-5xl font-extrabold text-on-background mb-4 tracking-tighter">Browse Our Products</h1>
            <p className="text-on-surface-variant text-lg font-body leading-relaxed">
              Explore our range of premium flour and spices, precision-ground to your preference.
            </p>
          </header>

          {products.length === 0 ? (
            <div className="text-center py-16 text-on-surface-variant">No products available.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {products.map((product) => {
                const sel = selections[product._id] || { quantity: 0, grindType: '', orderType: '' };
                const img = getProductImage(product);
                return (
                  <div key={product._id} className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-card border border-outline-variant/10 transition-all duration-300 hover:-translate-y-2 hover:shadow-card-hover">
                    {/* Image */}
                    <div className="relative h-64 overflow-hidden bg-surface-container-low">
                      {img ? (
                        <img src={img} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                      ) : null}
                      <div className={`${img ? 'hidden' : 'flex'} absolute inset-0 bg-primary-container items-center justify-center`}>
                        <span className="material-symbols-outlined text-5xl text-primary">grain</span>
                      </div>
                      <div className="absolute top-4 right-4 bg-secondary-container/90 backdrop-blur text-on-secondary-container px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
                        Mill-Fresh
                      </div>
                    </div>

                    <div className="p-8">
                      <h3 className="font-headline text-2xl font-bold text-on-background mb-5">{product.name}</h3>

                      {/* Pricing */}
                      <div className="space-y-3 mb-7 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-on-surface-variant font-medium">Raw Material Price</span>
                          <span className="font-bold">₹{product.rawMaterialPricePerKg} / kg</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-on-surface-variant font-medium">Grinding Service</span>
                          <span className="font-bold">₹{product.grindingChargePerKg} / kg</span>
                        </div>
                        <div className="pt-4 border-t border-outline-variant/10 flex justify-between items-center">
                          <span className="font-bold text-on-surface">Total (Buy + Grind)</span>
                          <span className="text-2xl font-extrabold text-primary tracking-tighter">
                            ₹{(product.rawMaterialPricePerKg + product.grindingChargePerKg).toFixed(0)}
                          </span>
                        </div>
                      </div>

                      {/* Order Type */}
                      <div className="space-y-2 mb-7">
                        {[
                          {
                            value: 'serviceOnly',
                            label: 'Service Only',
                            desc: `₹${product.grindingChargePerKg}/kg — Bring your own materials`,
                            disabled: false,
                          },
                          {
                            value: 'buyAndService',
                            label: 'Buy + Grinding',
                            desc: `₹${(product.rawMaterialPricePerKg + product.grindingChargePerKg).toFixed(0)}/kg — We provide materials`,
                            disabled: product.stockKg != null && product.stockKg <= 0,
                            outOfStock: product.stockKg != null && product.stockKg <= 0,
                          },
                        ].map(({ value, label, desc, disabled, outOfStock }) => (
                          <label
                            key={value}
                            className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
                              disabled
                                ? 'opacity-50 cursor-not-allowed border-outline-variant/20 bg-surface-container'
                                : `cursor-pointer ${sel.orderType === value ? 'bg-primary-container/40 border-2 border-primary/20' : 'border-outline-variant/30 hover:bg-surface-container-low'}`
                            }`}
                          >
                            <input
                              type="radio"
                              name={`orderType-${product._id}`}
                              value={value}
                              checked={sel.orderType === value}
                              disabled={disabled}
                              onChange={() => !disabled && updateSelection(product._id, 'orderType', value)}
                              className="mt-1 text-primary focus:ring-primary w-4 h-4"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`block text-sm font-bold ${sel.orderType === value ? 'text-primary' : 'text-on-background'}`}>
                                  {label}
                                </span>
                                {outOfStock && (
                                  <span className="text-[9px] font-black uppercase tracking-wide bg-error-container/30 text-error px-2 py-0.5 rounded-full">
                                    Out of Stock
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-on-surface-variant">{desc}</span>
                            </div>
                          </label>
                        ))}
                      </div>

                      {/* Quantity & Grind */}
                      <div className="grid grid-cols-2 gap-4 mb-7">
                        <div className="space-y-2">
                          <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest ml-1">Quantity (kg)</label>
                          <input
                            type="number" inputMode="decimal" step="0.1" min="0"
                            value={sel.quantity || ''}
                            onChange={(e) => updateSelection(product._id, 'quantity', parseFloat(e.target.value) || 0)}
                            placeholder="0.0"
                            className="w-full bg-surface-container-low rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-base p-3 font-bold text-on-surface"
                            style={{ fontSize: '16px' }}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest ml-1">Grind Level</label>
                          <div className="flex gap-1 bg-surface-container-low p-1 rounded-xl">
                            {['Fine', 'Medium', 'Coarse'].map((level) => (
                              <button key={level}
                                onClick={() => updateSelection(product._id, 'grindType', level)}
                                className={`flex-1 text-[9px] py-2.5 rounded-lg font-bold uppercase transition-colors ${sel.grindType === level ? 'sage-gradient text-on-primary shadow-sm' : 'hover:bg-white'}`}
                              >
                                {level === 'Medium' ? 'Med' : level}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddToCart(product)}
                        className="w-full sage-gradient py-4 rounded-full text-on-primary font-headline font-bold text-base shadow-sage hover:shadow-sage-lg hover:opacity-95 active:scale-[0.97] transition-all mb-3"
                      >
                        Add to Cart
                      </button>
                      <button
                        onClick={() => navigate(`/product/${product._id}`)}
                        className="flex items-center justify-center gap-1.5 w-full text-sm font-bold text-primary hover:underline underline-offset-4 transition-all"
                      >
                        View Product Details <span className="material-symbols-outlined text-base">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Sticky Cart Bar */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-outline-variant/20 p-4 z-40 md:bottom-0">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-on-surface-variant font-medium">{getItemCount()} item{getItemCount() !== 1 ? 's' : ''} in cart</p>
              <p className="font-headline font-extrabold text-xl text-on-background">₹{totalAmount.toFixed(2)}</p>
            </div>
            <button onClick={handleContinue} className="sage-gradient text-on-primary font-headline font-bold px-10 py-4 rounded-full shadow-sage hover:shadow-sage-lg active:scale-95 transition-all">
              Continue →
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductSelectionPage;
