import { Route, Routes } from 'react-router-dom';
import { ProductPage } from '@/features/products/ProductPage';
import { CheckoutPlaceholder } from '@/features/checkout/CheckoutPlaceholder';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ProductPage />} />
      <Route
        path="/checkout/details"
        element={<CheckoutPlaceholder title="Card & delivery details" />}
      />
      <Route path="/checkout/summary" element={<CheckoutPlaceholder title="Payment summary" />} />
      <Route path="/checkout/status" element={<CheckoutPlaceholder title="Payment status" />} />
    </Routes>
  );
}
