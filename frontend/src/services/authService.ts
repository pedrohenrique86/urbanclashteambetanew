/**
 * Inicia o fluxo de login/registro com Google usando o fluxo PKCE.
 * Esta função é a única fonte de verdade para iniciar a autenticação com Google.
 * @param intent - A intenção do fluxo, 'login' ou 'register'.
 * @param country - O código do país do usuário, opcional, usado durante o registro.
 */
export const startGoogleLoginFlow = async (
  intent: 'login' | 'register',
  country?: string | null,
) => {
  try {
    const generateRandomString = (length: number): string => {
      const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let text = '';
      for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
      }
      return text;
    };

    const sha256 = async (plain: string): Promise<ArrayBuffer> => {
      const encoder = new TextEncoder();
      const data = encoder.encode(plain);
      return window.crypto.subtle.digest('SHA-256', data);
    };

    const base64urlencode = (a: ArrayBuffer): string => {
      return btoa(String.fromCharCode(...new Uint8Array(a)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    };

    const codeVerifier = generateRandomString(128);
    sessionStorage.setItem('google_code_verifier', codeVerifier);
    sessionStorage.setItem('google_auth_intent', intent);

    if (country) {
      sessionStorage.setItem('google_auth_country', country);
    } else {
      sessionStorage.removeItem('google_auth_country');
    }

    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64urlencode(hashed);

    const redirectUri = `${window.location.origin}/auth/google/callback`;

    const state = {
      intent: intent,
      country: country || null,
    };

    const params = new URLSearchParams({
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: JSON.stringify(state),
    });

    const startUrl = `${import.meta.env.VITE_API_URL || ''}/api/auth/google/start?${params.toString()}`;

    // Redireciona o usuário para iniciar o fluxo
    window.location.href = startUrl;
  } catch (error) {
    console.error('Erro ao iniciar o fluxo de login com Google:', error);
    // Lança o erro para que o chamador possa tratá-lo (ex: exibir uma mensagem na UI)
    throw new Error('Falha ao iniciar o processo de autenticação com Google.');
  }
};