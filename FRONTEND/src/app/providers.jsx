import { BrowserRouter } from 'react-router-dom';

/**
 * App-level providers wrapper.
 * Currently wraps with BrowserRouter for client-side routing.
 * Future providers (auth context, theme, etc.) will be added here.
 */
export default function Providers({ children }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}
