import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import CustomerHeader from '../../components/common/CustomerHeader';
import { getProducts } from '../../api/productApi';
import Loader from '../../components/common/Loader';
import { toast } from 'react-toastify';

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

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  }, []);

  const handleOrder = () => navigate(isAuthenticated() ? '/order/products' : '/login');

  return (
    <div className="min-h-screen bg-background text-on-background">
      <CustomerHeader />

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-6 md:px-8 py-16 md:py-24">
        <header className="mb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="font-headline text-5xl lg:text-7xl font-extrabold tracking-tighter text-on-background leading-[1.1]">
                Fresh Ground <span className="text-primary italic">Flour & Spices</span> at Your Door.   
              </h1>
              <p className="text-on-surface-variant text-lg font-body leading-relaxed max-w-md">
                Experience the authentic taste of traditionally ground flour and spices. From farm to your kitchen, we preserve the natural goodness.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleOrder}
                  className="sage-gradient text-on-primary font-headline font-bold px-10 py-5 rounded-full shadow-sage hover:shadow-sage-lg hover:opacity-95 active:scale-[0.97] transition-all text-lg"
                >
                  Order Now
                </button>
                {isAuthenticated() && (
                  <button
                    onClick={() => navigate('/orders')}
                    className="bg-surface-container-low text-on-surface font-headline font-bold px-10 py-5 rounded-full hover:bg-surface-container-high active:scale-[0.97] transition-all text-lg"
                  >
                    My Orders
                  </button>
                )}
              </div>
              {/* Stats */}
              <div className="flex gap-8 pt-4">
                {[['10+', 'Years Experience'], ['10K+', 'Happy Customers'], ['100%', 'Quality Assured']].map(([val, label]) => (
                  <div key={label}>
                    <div className="text-2xl font-headline font-extrabold text-primary">{val}</div>
                    <div className="text-xs text-on-surface-variant font-medium">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero image */}
            <div className="relative hidden lg:block">
              <div className="rounded-xl overflow-hidden aspect-[4/5] shadow-[0_40px_80px_rgba(50,50,50,0.12)] bg-surface-container-low">
                <img
                  src="/images/wheat.jpg"
                  alt="Fresh ground flour"
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
              <div className="absolute -bottom-8 -left-8 bg-surface-container-lowest/90 backdrop-blur-xl p-6 rounded-xl shadow-card max-w-xs border border-outline-variant/10">
                <p className="font-headline font-bold text-primary mb-1 italic">Mill Fresh</p>
                <p className="text-on-background font-body text-sm leading-snug">Traditional stone grinding preserves natural aroma and nutrients.</p>
              </div>
            </div>
          </div>
        </header>

        {/* Products Section */}
        <section className="space-y-10">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="font-headline text-3xl font-bold tracking-tight text-on-background">Our Products</h2>
              <p className="text-on-surface-variant mt-2">Premium flour and spices, precision-ground to your preference</p>
            </div>
            <button
              onClick={handleOrder}
              className="hidden md:flex items-center gap-2 text-primary font-headline font-bold hover:underline underline-offset-4"
            >
              View All <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader /></div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 text-on-surface-variant">No products available at the moment.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {products.map((product) => {
                const img = getProductImage(product);
                return (
                  <div
                    key={product._id}
                    className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-card border border-outline-variant/10 transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 flex flex-col"
                  >
                    {/* Image */}
                    <div className="relative aspect-square overflow-hidden bg-surface-container-low">
                      {img ? (
                        <img
                          src={img}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                        />
                      ) : null}
                      <div className={`${img ? 'hidden' : 'flex'} absolute inset-0 bg-primary-container items-center justify-center`}>
                        <span className="material-symbols-outlined text-5xl text-primary">grain</span>
                      </div>
                      <div className="absolute top-3 right-3 bg-secondary-container/90 backdrop-blur text-on-secondary-container px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest">
                        Mill-Fresh
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="font-headline font-bold text-lg text-on-background mb-3">{product.name}</h3>
                      <div className="space-y-2 text-sm mb-4 flex-1">
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Raw Material</span>
                          <span className="font-bold">₹{product.rawMaterialPricePerKg}/kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Grinding Service</span>
                          <span className="font-bold">₹{product.grindingChargePerKg}/kg</span>
                        </div>
                        <div className="pt-3 border-t border-outline-variant/10 flex justify-between items-center">
                          <span className="font-bold text-on-surface text-xs">Buy + Grind</span>
                          <span className="text-xl font-extrabold text-primary tracking-tighter">
                            ₹{(product.rawMaterialPricePerKg + product.grindingChargePerKg).toFixed(0)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/product/${product._id}`)}
                          className="flex-1 py-2.5 text-sm font-headline font-bold text-primary border-2 border-primary/20 rounded-full hover:bg-primary/5 transition-all"
                        >
                          Details
                        </button>
                        <button
                          onClick={handleOrder}
                          className="flex-1 py-2.5 text-sm sage-gradient text-on-primary font-headline font-bold rounded-full shadow-sage hover:shadow-sage-lg active:scale-95 transition-all"
                        >
                          Order
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Services Section */}
        <section className="mt-24 grid grid-cols-1 md:grid-cols-12 gap-8 md:h-[420px]">
          <div className="md:col-span-8 bg-surface-container-low rounded-xl overflow-hidden relative group">
            <img
              src="/images/wheat.jpg"
              alt="Mill"
              className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-10 text-white">
              <span className="text-xs font-bold tracking-widest uppercase mb-3 text-primary-container">About Our Mill</span>
              <h3 className="font-headline text-3xl font-bold mb-3">Traditional Stone Grinding</h3>
              <p className="max-w-lg font-body text-white/80 mb-6">For over 10 years, our family-owned mill has been serving the community with premium grinding services using traditional stone methods.</p>
              <button
                onClick={handleOrder}
                className="w-fit px-8 py-3 bg-white text-on-background rounded-full font-headline font-bold hover:bg-primary-container transition-colors"
              >
                Start Your Order
              </button>
            </div>
          </div>
          <div className="md:col-span-4 flex flex-col gap-6">
            <div className="flex-1 bg-secondary-container/30 rounded-xl p-8 flex flex-col justify-center items-center text-center">
              <span className="material-symbols-outlined text-4xl text-primary mb-3">local_shipping</span>
              <h4 className="font-headline font-bold text-xl mb-2">Home Delivery</h4>
              <p className="text-sm text-on-surface-variant font-body">Fresh ground products delivered to your doorstep.</p>
            </div>
            <div className="flex-1 bg-tertiary-container/30 rounded-xl p-8 flex flex-col justify-center items-center text-center">
              <span className="material-symbols-outlined text-4xl text-tertiary mb-3">verified</span>
              <h4 className="font-headline font-bold text-xl mb-2">Quality Assured</h4>
              <p className="text-sm text-on-surface-variant font-body">Every batch inspected for consistency and freshness.</p>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="mt-24">
          <div className="bg-surface-container-low rounded-xl p-10">
            <div className="text-center mb-10">
              <h3 className="font-headline text-3xl font-bold text-on-background mb-2">Get In Touch</h3>
              <p className="text-on-surface-variant">We're here to help with your grinding needs</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: 'call', title: 'Phone', content: '+91 98765 43210', href: 'tel:+919876543210' },
                { icon: 'schedule', title: 'Working Hours', content: 'Mon–Sat: 8AM – 7PM', href: null },
                { icon: 'location_on', title: 'Location', content: 'Kerala, India', href: 'https://maps.app.goo.gl/HytNPx4N8q6tYvpbA' },
              ].map(({ icon, title, content, href }) => (
                <div key={title} className="bg-surface-container-lowest rounded-xl p-6 flex items-start gap-4 shadow-card">
                  <div className="bg-primary-container p-3 rounded-xl">
                    <span className="material-symbols-outlined text-primary">{icon}</span>
                  </div>
                  <div>
                    <h4 className="font-headline font-bold text-on-background mb-1">{title}</h4>
                    {href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">{content}</a>
                    ) : (
                      <p className="text-on-surface-variant">{content}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-24 border-t border-outline-variant/10 bg-surface-container-low pt-16 pb-20">
        <div className="max-w-7xl mx-auto px-6 md:px-8 grid grid-cols-1 md:grid-cols-3 gap-10 items-center">
          <div>
            <div className="font-headline font-black text-2xl tracking-tighter text-on-background mb-3 italic">Flour &amp; Spice Mill</div>
            <p className="text-on-surface-variant text-sm font-body max-w-xs">Artisanal grinding since 1990. Quality that spans generations.</p>
          </div>
          <div className="flex justify-center gap-8 font-headline font-semibold text-sm">
            <a href="#contact" className="text-on-surface-variant hover:text-primary transition-colors">Contact</a>
            <a href="#" className="text-on-surface-variant hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="text-on-surface-variant hover:text-primary transition-colors">Terms</a>
          </div>
          <div className="md:text-right">
            <p className="text-xs text-on-surface-variant">© 2026 Flour &amp; Spice Mill. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Mobile bottom padding */}
      <div className="md:hidden h-24" />
    </div>
  );
};

export default HomePage;
