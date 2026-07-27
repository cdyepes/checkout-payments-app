import { Route, Routes, useLocation, type Location } from 'react-router-dom';
import { ProductPage } from '@/features/products/ProductPage';
import { CheckoutModal } from '@/features/checkout/CheckoutModal';

interface AppLocationState {
  background?: Location;
}

export function AppRoutes() {
  const location = useLocation();
  const background = (location.state as AppLocationState | null)?.background;

  return (
    <>
      {/* Matched against the background location when one is set, so the product
          page keeps rendering underneath the checkout modal instead of being
          replaced by it. Deep-linking straight to a /checkout/* URL (no
          background in history — e.g. a refresh) falls back to this same block
          rendering CheckoutModal full-page. */}
      <Routes location={background ?? location}>
        <Route path="/" element={<ProductPage />} />
        <Route path="/checkout/*" element={<CheckoutModal />} />
      </Routes>

      {background && (
        <Routes>
          <Route path="/checkout/*" element={<CheckoutModal />} />
        </Routes>
      )}
    </>
  );
}
