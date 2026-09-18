import { broadcastResponseToMainFrame } from '@azure/msal-browser/redirect-bridge';

// Runs inside the sign-in popup and passes Microsoft's response back to Gaia.
broadcastResponseToMainFrame().catch(() => window.close());
