import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { BrowserRouter } from 'react-router-dom';
import { persistor, store } from '@/app/store';
import { AppRoutes } from '@/routes/AppRoutes';
import '@/styles/global.css';

export function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter>
          <div className="app-shell">
            <AppRoutes />
          </div>
        </BrowserRouter>
      </PersistGate>
    </Provider>
  );
}
