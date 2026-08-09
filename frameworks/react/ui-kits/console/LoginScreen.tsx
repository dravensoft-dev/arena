import React, { useState } from 'react';
import { ArenaButton } from '../../components/forms/arena-button/ArenaButton.tsx';
import { ArenaInput } from '../../components/forms/arena-input/ArenaInput.tsx';
import { ArenaAppLogo } from '../../components/brand/arena-app-logo/ArenaAppLogo.tsx';
import { ArenaUnauthCard } from '../../components/display/arena-unauth-card/ArenaUnauthCard.tsx';

export interface LoginScreenProps {
  onLogin?: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('ana@dravensoft.dev');
  const [password, setPassword] = useState('dravensoft');
  return (
    <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 'calc(var(--sp-1) * 6)' }}>
      <ArenaUnauthCard
        brand={<ArenaAppLogo size="md" mark={<img src="../../../../assets/rotor-crimson.svg" alt="" />} name="Draven" dim="soft" />}
        eyebrow="Delivery console"
        title="Welcome back"
        footer="Forgot your password?">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--rhythm-component)' }}>
          <ArenaInput label="Email" value={email} onChange={setEmail} />
          <ArenaInput label="Password" type="password" value={password} onChange={setPassword} />
          <ArenaButton variant="primary" full onClick={onLogin}>Sign in</ArenaButton>
        </div>
      </ArenaUnauthCard>
    </div>
  );
}
