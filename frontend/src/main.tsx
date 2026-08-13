import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ColorModeProvider } from './ColorModeContext';
import { AuthProvider } from './context/AuthContext';
import App from './App.tsx';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!googleClientId) {
  throw new Error('VITE_GOOGLE_CLIENT_ID is not set. Add it to frontend/.env');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <ColorModeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ColorModeProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
);
