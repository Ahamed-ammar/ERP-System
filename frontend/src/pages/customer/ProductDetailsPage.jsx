import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProductById } from '../../api/productApi';
import { toast } from 'react-toastify';
import CustomerHeader from '../../components/common/CustomerHeader';
import Loader from '../../components/common/Loader';

const ProductDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProductDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      console.log('Fetching product with ID:', id);
      const data = await getProductById(id);
      console.log('Product data received:', data);
      setProduct(data);
    } catch (error) {
      console.error('Error fetching product details:', error);
      toast.error('Failed to load product details');
      // Don't navigate away immediately, let user see the error
      setTimeout(() => navigate('/'), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderNow = () => {
    navigate('/order/products');
  };

  // Get product image with fallback
  const getProductImage = (product) => {
    const productImages = {
      'wheat': '/images/wheat.jpg',
      'rice': '/images/rice.jpg',
      'turmeric': '/images/turmeric-powder.jpg',
      'chili': '/images/chilli.jpg',
      'chilli': '/images/chilli.jpg',
      'coriander': '/images/Coriander.jpg',
      'garam masala': '/images/garam masala.jpg',
      'ragi': '/images/ragi.jpg',
    };

    if (product && product.name) {
      const nameLower = product.name.toLowerCase();
      const matchedKey = Object.keys(productImages).find(key => nameLower.includes(key));
      if (matchedKey) return productImages[matchedKey];
    }

    return '/placeholder-product.svg';
  };

  if (loading) {
    return (
      <>
        <CustomerHeader />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader />
        </div>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <CustomerHeader />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Product not found</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 text-amber-600 hover:text-amber-700 font-medium"
            >
              Go back to home
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <CustomerHeader />
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Background Pattern - Same as HomePage */}
        <div className="fixed inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 -z-10">
          {/* Organic flour/spice texture pattern using CSS */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `
              radial-gradient(circle at 20% 50%, rgba(251, 191, 36, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(249, 115, 22, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 40% 20%, rgba(234, 179, 8, 0.2) 0%, transparent 50%),
              radial-gradient(circle at 60% 70%, rgba(217, 119, 6, 0.2) 0%, transparent 50%)
            `,
            backgroundSize: '400px 400px, 300px 300px, 500px 500px, 350px 350px',
            backgroundPosition: '0 0, 100px 100px, 200px 50px, 300px 200px'
          }}></div>
          
          {/* Subtle grain texture */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 2px,
              rgba(251, 191, 36, 0.1) 2px,
              rgba(251, 191, 36, 0.1) 4px
            )`
          }}></div>
        </div>

        {/* Back Button */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">Back</span>
            </button>
          </div>
        </div>

        {/* Product Details */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Product Image — Cloudinary URL takes priority, keyword map as fallback */}
              <div className="relative h-96 lg:h-full bg-gradient-to-br from-amber-50 to-orange-50">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                ) : (
                  <img
                    src={getProductImage(product)}
                    alt={product.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                )}
                {/* Fallback icon */}
                <div className="hidden absolute inset-0 bg-gradient-to-br from-amber-200 to-orange-300 items-center justify-center">
                  <svg className="w-32 h-32 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>

              {/* Product Info */}
              <div className="p-8 lg:p-12">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">{product.name}</h1>
                
                {product.description && (
                  <p className="text-lg text-gray-600 mb-6">{product.description}</p>
                )}

                {/* Pricing Section */}
                <div className="bg-amber-50 rounded-xl p-6 mb-8 border-2 border-amber-200">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Pricing</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Raw Material:</span>
                      <span className="text-2xl font-bold text-amber-700">₹{product.rawMaterialPricePerKg}/kg</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Grinding Service:</span>
                      <span className="text-2xl font-bold text-green-700">₹{product.grindingChargePerKg}/kg</span>
                    </div>
                    <div className="pt-3 border-t-2 border-amber-300">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-900 font-semibold">Total (Buy + Grind):</span>
                        <span className="text-3xl font-bold text-amber-600">
                          ₹{(product.rawMaterialPricePerKg + product.grindingChargePerKg).toFixed(2)}/kg
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Button */}
                <button
                  onClick={handleOrderNow}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 px-8 rounded-xl text-lg shadow-lg transform transition hover:scale-105 active:scale-95 mb-6"
                >
                  Order Now
                </button>
              </div>
            </div>

            {/* Grinding Process Section */}
            <div className="border-t-2 border-gray-200 p-8 lg:p-12 bg-gradient-to-br from-white to-amber-50">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Our Grinding Process</h2>
              <p className="text-lg text-gray-600 mb-8 text-center max-w-3xl mx-auto">
                We use traditional stone grinding methods to preserve the natural aroma, flavor, and nutritional value of your {product.name.toLowerCase()}. 
                Our process ensures the perfect texture while maintaining the authentic taste.
              </p>

              {/* Grinding Levels */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Fine Grind */}
                <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-green-200 hover:border-green-400 transition">
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Fine Grind</h3>
                  </div>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Powder-like consistency</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Perfect for baking and smooth batters</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Dissolves easily in liquids</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Ideal for baby food and elderly</span>
                    </li>
                  </ul>
                </div>

                {/* Medium Grind */}
                <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-amber-200 hover:border-amber-400 transition">
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Medium Grind</h3>
                  </div>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-600 mt-1">✓</span>
                      <span>Balanced texture</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-600 mt-1">✓</span>
                      <span>Most popular choice</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-600 mt-1">✓</span>
                      <span>Versatile for all cooking</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-600 mt-1">✓</span>
                      <span>Great for traditional recipes</span>
                    </li>
                  </ul>
                </div>

                {/* Coarse Grind */}
                <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-orange-200 hover:border-orange-400 transition">
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Coarse Grind</h3>
                  </div>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 mt-1">✓</span>
                      <span>Chunky texture</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 mt-1">✓</span>
                      <span>Retains maximum nutrients</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 mt-1">✓</span>
                      <span>Perfect for porridge and rustic dishes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 mt-1">✓</span>
                      <span>Longer shelf life</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Process Steps */}
              <div className="bg-white rounded-xl p-8 shadow-lg">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">How We Grind</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-3xl font-bold text-amber-700">1</span>
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">Cleaning</h4>
                    <p className="text-sm text-gray-600">Raw materials are thoroughly cleaned and sorted</p>
                  </div>
                  <div className="text-center">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-3xl font-bold text-amber-700">2</span>
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">Stone Grinding</h4>
                    <p className="text-sm text-gray-600">Traditional stone mills grind at optimal speed</p>
                  </div>
                  <div className="text-center">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-3xl font-bold text-amber-700">3</span>
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">Quality Check</h4>
                    <p className="text-sm text-gray-600">Each batch is inspected for consistency</p>
                  </div>
                  <div className="text-center">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-3xl font-bold text-amber-700">4</span>
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">Packaging</h4>
                    <p className="text-sm text-gray-600">Freshly ground and hygienically packed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Benefits Section */}
            <div className="border-t-2 border-gray-200 p-8 lg:p-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Why Choose Our Grinding Service?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                  <div className="w-16 h-16 bg-green-200 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">100% Natural</h4>
                  <p className="text-sm text-gray-600">No additives or preservatives</p>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                  <div className="w-16 h-16 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">Cool Grinding</h4>
                  <p className="text-sm text-gray-600">Low temperature preserves nutrients</p>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                  <div className="w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">Hygienic</h4>
                  <p className="text-sm text-gray-600">Clean equipment and process</p>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl">
                  <div className="w-16 h-16 bg-orange-200 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">Fast Service</h4>
                  <p className="text-sm text-gray-600">Ready in 2 business days</p>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-8 lg:p-12 text-center text-white">
              <h2 className="text-3xl font-bold mb-4">Ready to Order?</h2>
              <p className="text-xl text-amber-100 mb-6">
                Get freshly ground {product.name.toLowerCase()} delivered to your doorstep
              </p>
              <button
                onClick={handleOrderNow}
                className="bg-white text-amber-700 px-12 py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-amber-50 transform transition hover:scale-105 active:scale-95"
              >
                Start Your Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductDetailsPage;
