'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const issuer = process.env.NEXT_PUBLIC_AUTH_ISSUER_URL;

function discoveryUrl() {
  return `${issuer?.replace(/\/+$/, '')}/.well-known/openid-configuration`;
}
const clientId = process.env.NEXT_PUBLIC_AUTH_CLIENT_ID;

function base64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('code')) {
      void finishLogin(params.get('code') ?? '', params.get('state') ?? '');
    }
  }, []);

  async function finishLogin(code: string, receivedState: string) {
    try {
      const expectedState = sessionStorage.getItem('wh_oidc_state');
      const verifier = sessionStorage.getItem('wh_oidc_verifier');
      if (!expectedState || receivedState !== expectedState || !verifier || !issuer || !clientId) {
        throw new Error('Xaqiijinta gelitaanku ma ansaxin. Mar kale isku day.');
      }
      const discoveryResponse = await fetch(discoveryUrl());
      if (!discoveryResponse.ok) throw new Error('Adeegga aqoonsiga lama heli karo.');
      const metadata = (await discoveryResponse.json()) as {
        token_endpoint?: string;
        issuer?: string;
      };
      if (metadata.issuer !== issuer || !metadata.token_endpoint)
        throw new Error('Xogta aqoonsiga ma ansaxna.');
      const tokenResponse = await fetch(metadata.token_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          code,
          redirect_uri: `${window.location.origin}/admin/login`,
          code_verifier: verifier,
        }),
      });
      if (!tokenResponse.ok) throw new Error('Gelitaanka waa la diiday. Hubi dejinta OIDC.');
      const tokens = (await tokenResponse.json()) as { access_token?: string; token_type?: string };
      if (!tokens.access_token || tokens.token_type?.toLowerCase() !== 'bearer')
        throw new Error('Aqoonsiga la helay ma dhammaystirna.');
      sessionStorage.setItem('wh_admin_access_token', tokens.access_token);
      sessionStorage.removeItem('wh_oidc_state');
      sessionStorage.removeItem('wh_oidc_verifier');
      router.replace('/admin');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Gelitaanka ma suuragelin.');
    }
  }

  async function startLogin() {
    setError('');
    if (!issuer || !clientId) {
      setError(
        'Dejinta OIDC ma dhammaystirna. Ku dar NEXT_PUBLIC_AUTH_ISSUER_URL iyo NEXT_PUBLIC_AUTH_CLIENT_ID.',
      );
      return;
    }
    try {
      const discoveryResponse = await fetch(discoveryUrl());
      if (!discoveryResponse.ok) throw new Error('Adeegga aqoonsiga lama heli karo.');
      const metadata = (await discoveryResponse.json()) as {
        authorization_endpoint?: string;
        issuer?: string;
      };
      if (metadata.issuer !== issuer || !metadata.authorization_endpoint)
        throw new Error('Xogta aqoonsiga ma ansaxna.');
      const random = crypto.getRandomValues(new Uint8Array(32));
      const state = base64Url(crypto.getRandomValues(new Uint8Array(32)));
      const verifier = base64Url(random);
      const challenge = base64Url(
        new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))),
      );
      sessionStorage.setItem('wh_oidc_state', state);
      sessionStorage.setItem('wh_oidc_verifier', verifier);
      const url = new URL(metadata.authorization_endpoint);
      const authParams = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: `${window.location.origin}/admin/login`,
        scope: 'openid profile',
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
      });
      const audience = process.env.NEXT_PUBLIC_AUTH_AUDIENCE;
      if (audience) authParams.set('audience', audience);
      url.search = authParams.toString();
      window.location.assign(url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Adeegga aqoonsiga lama heli karo.');
    }
  }

  return (
    <main className="admin-login">
      <div className="admin-login-card">
        <p className="admin-kicker">WORLDHERITAGE · MAAMUL</p>
        <h1>Ku gal akoonkaaga</h1>
        <p>Gelitaanka maamulka waxaa ilaaliya adeegga aqoonsiga ee mashruuca.</p>
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
        <button className="admin-primary-button" onClick={() => void startLogin()}>
          Ku gal OIDC
        </button>
        <a href="/">Ku noqo bogga hore</a>
      </div>
    </main>
  );
}
