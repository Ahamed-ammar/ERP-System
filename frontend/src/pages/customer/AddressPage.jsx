import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getCustomerProfile } from '../../api/customerApi';
import { CartContext } from '../../context/CartContext';

const AddressPage = () => {
  const navigate = useNavigate();
  const { items, totalAmount, isEmpty, removeFromCart } = useContext(CartContext);

  const [formData, setFormData] = useState({
    name: '', phone: '', streetType: '', houseName: '', doorNo: '', landmark: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCustomerProfile()
      .then(res => {
        const p = res.data;
        setFormData({
          name: p.name || '', phone: p.phone || '',
          streetType: p.streetType || '', houseName: p.houseName || '',
          doorNo: p.doorNo || '', landmark: p.landmark || ''
        });
      })
      .catch(() => toast.error('Failed to load profile data'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && isEmpty()) {
      toast.error('Your cart is empty.');
      navigate('/order/products');
    }
  }, [loading, isEmpty, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!formData.name.trim()) e.name = 'Name is required';
    if (!formData.phone.trim()) e.phone = 'Phone is required';
    else if (!/^\d{10}$/.test(formData.phone)) e.phone = 'Must be 10 digits';
    if (!formData.streetType) e.streetType = 'Street type is required';
    if (!formData.houseName.trim()) e.houseName = 'House name is required';
    if (!formData.doorNo.trim()) e.doorNo = 'Door number is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      localStorage.setItem('deliveryAddress', JSON.stringify(formData));
      navigate('/order/review');
    } else {
      toast.error('Please fix the errors in the form');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const inputClass = (field) =>
    `w-full px-6 py-4 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all font-medium text-on-surface placeholder:text-outline-variant ${errors[field] ? 'ring-2 ring-error' : ''}`;

  return (
    <div className="min-h-screen bg-background text-on-background">
      {/* Header */}
      <header className="w-full sticky top-0 z-50 bg-background/80 backdrop-blur-xl shadow-nav h-20 flex items-center">
        <div className="flex justify-between items-center max-w-7xl mx-auto px-6 md:px-8 w-full">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/order/products')}
              className="text-on-background/60 hover:text-primary transition-all active:scale-95">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <span className="font-headline text-xl font-bold tracking-tight text-on-background">Flour &amp; Spice Mill</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm font-medium text-on-surface-variant">
            <span className="material-symbols-outlined text-primary text-sm">lock</span>
            Secure Checkout
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-16 pb-32 md:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">

          {/* Left: Form */}
          <div className="lg:col-span-7 space-y-10">
            <div>
              <h1 className="font-headline text-4xl font-extrabold tracking-tight mb-2">Finalize Your Order</h1>
              <p className="text-on-surface-variant font-medium">Please provide your delivery details to complete the order.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
              {/* Delivery Address */}
              <section className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">location_on</span>
                  </div>
                  <h2 className="font-headline text-xl font-bold">Delivery Address</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-4">Full Name *</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange}
                      placeholder="Enter your full name" className={inputClass('name')} style={{ fontSize: '16px' }} />
                    {errors.name && <p className="mt-1 ml-4 text-xs text-error">{errors.name}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-4">Street Type *</label>
                    <select name="streetType" value={formData.streetType} onChange={handleChange}
                      className={inputClass('streetType')} style={{ fontSize: '16px' }}>
                      <option value="">Select street type</option>
                      <option value="Center">Center</option>
                      <option value="Top">Top</option>
                      <option value="Down side">Down side</option>
                    </select>
                    {errors.streetType && <p className="mt-1 ml-4 text-xs text-error">{errors.streetType}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-4">House Name *</label>
                    <input type="text" name="houseName" value={formData.houseName} onChange={handleChange}
                      placeholder="Enter house name" className={inputClass('houseName')} style={{ fontSize: '16px' }} />
                    {errors.houseName && <p className="mt-1 ml-4 text-xs text-error">{errors.houseName}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-4">Door Number *</label>
                    <input type="text" name="doorNo" value={formData.doorNo} onChange={handleChange}
                      placeholder="Enter door number" className={inputClass('doorNo')} style={{ fontSize: '16px' }} />
                    {errors.doorNo && <p className="mt-1 ml-4 text-xs text-error">{errors.doorNo}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-4">Landmark <span className="normal-case font-normal">(optional)</span></label>
                    <input type="text" name="landmark" value={formData.landmark} onChange={handleChange}
                      placeholder="Nearby landmark or directions" className={inputClass('landmark')} style={{ fontSize: '16px' }} />
                  </div>
                </div>
              </section>

              {/* Contact */}
              <section className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">call</span>
                  </div>
                  <h2 className="font-headline text-xl font-bold">Contact Information</h2>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-4">Phone Number *</label>
                  <input type="tel" inputMode="numeric" name="phone" value={formData.phone} onChange={handleChange}
                    placeholder="10 digit phone number" maxLength="10"
                    className={inputClass('phone')} style={{ fontSize: '16px' }} />
                  {errors.phone && <p className="mt-1 ml-4 text-xs text-error">{errors.phone}</p>}
                  <p className="mt-2 ml-4 text-xs text-on-surface-variant">We'll use this for delivery updates only.</p>
                </div>
              </section>

              {/* Mobile submit */}
              <div className="lg:hidden">
                <button type="submit"
                  className="w-full py-5 sage-gradient text-on-primary rounded-full font-headline font-bold text-lg shadow-sage hover:shadow-sage-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                  Continue to Review
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right: Order Summary */}
          <aside className="lg:col-span-5 lg:sticky lg:top-28">
            <div className="bg-surface-container-lowest rounded-xl p-8 shadow-card border border-outline-variant/10">
              <h2 className="font-headline text-2xl font-extrabold tracking-tight mb-8 flex items-center">
                Order Summary
                <button onClick={() => navigate('/order/products')}
                  className="text-sm font-medium text-primary hover:underline ml-auto">
                  Edit Cart
                </button>
              </h2>

              <div className="space-y-5 mb-8">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-container-low flex-shrink-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-2xl">grain</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-on-surface truncate">{item.productName}</h3>
                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                          <span className="font-bold text-on-surface">₹{item.itemTotal?.toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.productId, item.grindType, item.orderType)}
                            aria-label="Remove item"
                            className="text-on-surface-variant hover:text-error transition-colors p-1 active:scale-90"
                          >
                            <span className="material-symbols-outlined text-xl">close</span>
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-on-surface-variant mt-0.5">
                        {item.quantity} kg · {item.grindType} · {item.orderType === 'serviceOnly' ? 'Service Only' : 'Buy + Grinding'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-6 border-t border-outline-variant/20">
                <div className="flex justify-between text-on-surface-variant font-medium text-sm">
                  <span>Subtotal ({items.length} item{items.length !== 1 ? 's' : ''})</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-xl pt-3 text-on-surface">
                  <span>Total</span>
                  <span className="text-primary">₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <button onClick={handleSubmit}
                className="w-full mt-8 py-5 sage-gradient text-on-primary rounded-full font-headline font-bold text-lg shadow-sage hover:shadow-sage-lg active:scale-[0.98] transition-all hidden lg:flex items-center justify-center gap-3">
                Continue to Review
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>

              <div className="mt-5 flex items-center justify-center gap-2 text-on-surface-variant text-xs font-semibold uppercase tracking-widest">
                <span className="material-symbols-outlined text-sm">verified_user</span>
                Secure Checkout
              </div>
            </div>

            {/* Info card */}
            <div className="mt-5 bg-secondary-container p-5 rounded-xl flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-primary flex-shrink-0">
                <span className="material-symbols-outlined">schedule</span>
              </div>
              <div>
                <h4 className="font-headline font-bold text-on-secondary-container text-sm">Ready in 2 Business Days</h4>
                <p className="text-xs text-on-secondary-container/80 mt-0.5">We'll notify you when your order is ready for pickup or delivery.</p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 md:px-8 pb-10 pt-6 text-center border-t border-outline-variant/10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-on-surface-variant text-sm font-medium">© 2026 Flour &amp; Spice Mill. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-on-surface-variant text-sm hover:text-primary transition-colors font-medium">Privacy Policy</a>
            <a href="#" className="text-on-surface-variant text-sm hover:text-primary transition-colors font-medium">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AddressPage;
