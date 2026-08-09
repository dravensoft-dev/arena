import React from 'react';
import type { ArenaTone } from '../../Api.generated';
import { Shell } from './Shell.tsx';
import { ArenaCard } from '../../components/display/arena-card/ArenaCard.tsx';
import { ArenaBadge } from '../../components/display/arena-badge/ArenaBadge.tsx';
import { ArenaTag } from '../../components/display/arena-tag/ArenaTag.tsx';
import { ArenaStatCard } from '../../components/display/arena-stat-card/ArenaStatCard.tsx';
import { ArenaButton } from '../../components/forms/arena-button/ArenaButton.tsx';

const METRICS: { k: string; v: string; tone?: ArenaTone }[] = [
  { k: 'Active projects', v: '12' },
  { k: 'Deployments (7d)', v: '48' },
  { k: 'Average uptime', v: '99.98%', tone: 'success' },
  { k: 'Incidents', v: '2', tone: 'danger' },
];
export interface ConsoleProject {
  name: string;
  client: string;
  status: [ArenaTone, string];
  build: string;
  when: string;
  tags: string[];
}

const PROJECTS: ConsoleProject[] = [
  { name: 'Customer portal', client: 'Aurora Bank', status: ['success', 'Deployed'], build: '#4821', when: '2h ago', tags: ['React', 'Node', 'AWS'] },
  { name: 'Billing engine', client: 'Nebula Retail', status: ['warning', 'In review'], build: '#1190', when: '40 min ago', tags: ['Go', 'PostgreSQL'] },
  { name: 'Field app', client: 'Terra Log', status: ['info', 'QA'], build: '#0327', when: 'yesterday', tags: ['Flutter', 'gRPC'] },
  { name: 'Payment gateway', client: 'Aurora Bank', status: ['danger', 'Down'], build: '#0918', when: '8 min ago', tags: ['Rust', 'Kafka'] },
  { name: 'Analytics dashboard', client: 'Vela Media', status: ['success', 'Deployed'], build: '#2204', when: '3h ago', tags: ['TypeScript', 'ClickHouse'] },
  { name: 'Internal CRM', client: 'Dravensoft', status: ['success', 'Deployed'], build: '#7781', when: '1d ago', tags: ['Next.js'] },
];

export interface DashboardScreenProps {
  onNav?: (id: string) => void;
  onOpenProject?: (project: ConsoleProject) => void;
}

export function DashboardScreen({ onNav, onOpenProject }: DashboardScreenProps) {
  return (
    <Shell active="dashboard" onNav={onNav} title="Projects"
      actions={<ArenaButton variant="primary" size="sm" icon="ph-bold ph-plus">New project</ArenaButton>}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 'var(--rhythm-component)', marginBottom: 'var(--rhythm-section)' }}>
        {METRICS.map((m) => <ArenaStatCard key={m.k} label={m.k} value={m.v} tone={m.tone} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--rhythm-component)' }}>
        {PROJECTS.map((p) => (
          <div key={p.name} onClick={() => onOpenProject && onOpenProject(p)} style={{ cursor: 'pointer', display: 'grid' }}>
            <ArenaCard accent={p.status[0] === 'danger'}
              eyebrow={p.client}
              title={p.name}
              action={<ArenaBadge tone={p.status[0]} dot>{p.status[1]}</ArenaBadge>}>
              <div style={{ display: 'flex', gap: 'calc(var(--sp-1) * 2)', flexWrap: 'wrap', margin: 'calc(var(--sp-1) * 1) 0 calc(var(--sp-1) * 4)' }}>
                {p.tags.map((t) => <ArenaTag key={t}>{t}</ArenaTag>)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: 'var(--bw) solid var(--color-base-300)', paddingTop: 'calc(var(--sp-1) * 3.5)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--dz-text-sm)', color: 'var(--gold)' }}>build {p.build}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--dz-text-sm)', color: 'var(--mute)' }}>{p.when}</span>
              </div>
            </ArenaCard>
          </div>
        ))}
      </div>
    </Shell>
  );
}
