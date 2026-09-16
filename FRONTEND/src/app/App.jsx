import Providers from './providers';
import AppRoutes from './routes';

/**
 * Root application component.
 * Wraps routes with all providers.
 */
export default function App() {
  return (
    <Providers>
      <AppRoutes />
    </Providers>
  );
}
