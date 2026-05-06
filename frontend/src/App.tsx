import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { AuthProvider } from './contexts/AuthContext';
import AppRoutes from './routes/AppRoutes';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--color-surface-high)',
                color: 'var(--color-on-surface)',
                border: '1px solid var(--color-outline)',
              },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </Provider>
  );
}

export default App;
