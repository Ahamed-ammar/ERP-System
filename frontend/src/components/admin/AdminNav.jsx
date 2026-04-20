import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const AdminNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  if (!location.pathname.startsWith('/admin') || location.pathname === '/admin/login') {
    return null;
  }

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard' },
    { name: 'Orders', path: '/admin/orders', icon: 'shopping_bag' },
    { name: 'Products', path: '/admin/products', icon: 'inventory_2' },
    { name: 'Staff', path: '/admin/staff', icon: 'group' },
    { name: 'Reports', path: '/admin/reports', icon: 'analytics' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full flex-col p-6 gap-2 bg-surface-container-low w-64 z-50">
        {/* Logo */}
        <div className="mb-8 px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl sage-gradient flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined">restaurant_menu</span>
            </div>
            <div>
              <h1 className="font-headline font-black text-on-background text-lg leading-tight">Admin Panel</h1>
              <p className="text-xs text-on-surface-variant">Flour &amp; Spice Mill</p>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium transition-all ${
                isActive(item.path)
                  ? 'bg-surface-container-lowest text-on-background font-bold shadow-sm'
                  : 'text-on-background/70 hover:translate-x-1 hover:bg-primary-container/30'
              }`}
            >
              <span className="material-symbols-outlined text-xl"
                style={isActive(item.path) ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {item.icon}
              </span>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="mt-auto">
          <button
            onClick={() => { logout(); navigate('/admin/login'); }}
            className="w-full sage-gradient text-on-primary py-3 rounded-full font-headline font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <nav className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-outline-variant/20 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg sage-gradient flex items-center justify-center text-on-primary">
            <span className="material-symbols-outlined text-sm">restaurant_menu</span>
          </div>
          <span className="font-headline font-black text-on-background">Admin Panel</span>
        </div>
        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`p-2 rounded-full transition-all ${isActive(item.path) ? 'bg-primary-container text-primary' : 'text-on-surface-variant'}`}
              title={item.name}
            >
              <span className="material-symbols-outlined text-xl"
                style={isActive(item.path) ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {item.icon}
              </span>
            </button>
          ))}
          <button
            onClick={() => { logout(); navigate('/admin/login'); }}
            className="p-2 rounded-full text-error"
            title="Logout"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default AdminNav;
