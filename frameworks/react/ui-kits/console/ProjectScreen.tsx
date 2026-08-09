import type { ArenaTone, ArenaTableColumn } from '../../Api.generated';
import type { ConsoleProject } from './DashboardScreen.tsx';
import React, { useState } from 'react';
import { Shell } from './Shell.tsx';
import { ArenaCard } from '../../components/display/arena-card/ArenaCard.tsx';
import { ArenaBadge } from '../../components/display/arena-badge/ArenaBadge.tsx';
import { ArenaTag } from '../../components/display/arena-tag/ArenaTag.tsx';
import { ArenaTable } from '../../components/display/arena-table/ArenaTable.tsx';
import { ArenaTableRow } from '../../components/display/arena-table-row/ArenaTableRow.tsx';
import { ArenaTableCell } from '../../components/display/arena-table-cell/ArenaTableCell.tsx';
import { ArenaActivityFeed } from '../../components/display/arena-activity-feed/ArenaActivityFeed.tsx';
import { ArenaTabs } from '../../components/navigation/arena-tabs/ArenaTabs.tsx';
import { ArenaTab } from '../../components/navigation/arena-tab/ArenaTab.tsx';
import { ArenaButton } from '../../components/forms/arena-button/ArenaButton.tsx';
import { ArenaSwitch } from '../../components/forms/arena-switch/ArenaSwitch.tsx';
import { ArenaDialog } from '../../components/feedback/arena-dialog/ArenaDialog.tsx';

const DEPLOYS: { build: string; env: string; status: [ArenaTone, string]; author: string; dur: string }[] = [
  { build: '#4821', env: 'Production', status: ['success', 'Active'], author: 'CI · main', dur: '3m 41s' },
  { build: '#4820', env: 'Staging', status: ['success', 'OK'], author: 'ana@', dur: '3m 12s' },
  { build: '#4818', env: 'Production', status: ['neutral', 'Rolled back'], author: 'CI · main', dur: '4m 02s' },
  { build: '#4815', env: 'QA', status: ['danger', 'Failed'], author: 'diego@', dur: '1m 08s' },
];

const DEPLOY_COLUMNS: ArenaTableColumn[] = [
  { header: 'Build', mono: true, width: 'calc(var(--sp-1) * 24)' },
  { header: 'Environment' },
  { header: 'Status' },
  { header: 'Author' },
  { header: 'Duration', mono: true },

  { header: '', mobileLayout: 'block' },
];
const ACTIVITY = [
  { id: '1', actor: 'ana@', action: 'approved the release', target: 'build #4821', time: '2h ago' },
  { id: '2', actor: 'CI', action: 'deployed to production', target: 'build #4821', time: '2h ago' },
  { id: '3', actor: 'diego@', action: 'opened incident', target: 'checkout latency', time: '3h ago' },
  { id: '4', actor: 'nora@', action: 'merged', target: 'PR #338 · session cache', time: '5h ago' },
];

export interface ProjectScreenProps {
  onNav?: (id: string) => void;
  project?: ConsoleProject | null;
  onToast?: () => void;
}

export function ProjectScreen({ onNav, project, onToast }: ProjectScreenProps) {
  const p = project || { name: 'Customer portal', client: 'Aurora Bank', tags: ['React', 'Node', 'AWS'] };
  const [tab, setTab] = useState('Deployments');
  const [open, setOpen] = useState(false);
  const [auto, setAuto] = useState(true);

  const deploy = () => { setOpen(false); onToast && onToast(); };

  return (
    <Shell active="dashboard" onNav={onNav} title={p.name}
      actions={<ArenaButton variant="primary" size="sm" icon="ph-bold ph-rocket-launch" onClick={() => setOpen(true)}>Deploy</ArenaButton>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--rhythm-group)', marginBottom: 'var(--rhythm-section)' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--dz-text-sm)', letterSpacing: 'var(--ls-field-label)', textTransform: 'uppercase', color: 'var(--mute)' }}>{p.client}</span>
        <ArenaBadge tone="success" dot>Deployed</ArenaBadge>
        {(p.tags || []).map((t: string) => <ArenaTag key={t}>{t}</ArenaTag>)}
      </div>
      <ArenaTabs value={tab} onChange={setTab}>
        <ArenaTab value="Overview" label="Overview">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--rhythm-component)' }}>
            <ArenaCard eyebrow="Status" title="Service health">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'calc(var(--sp-1) * 4)' }}>
                {[['Uptime', '99.98%', 'var(--success)'], ['p95', '186 ms', 'var(--bone)'], ['Errors', '0.02%', 'var(--gold)']].map(([k, v, c]) => (
                  <div key={k}><div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--dz-text-xs)', letterSpacing: 'var(--ls-field-label)', textTransform: 'uppercase', color: 'var(--mute)' }}>{k}</div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--fw-black)', fontSize: 'var(--fs-h3)', color: c, marginTop: 'calc(var(--sp-1) * 1.5)' }}>{v}</div></div>
                ))}
              </div>
            </ArenaCard>
            <ArenaCard eyebrow="Delivery" title="Next milestone">
              <div style={{ fontSize: 'var(--dz-text)', color: 'var(--bone-dim)', lineHeight: 'var(--lh-body)' }}>Release 2.5 — SEPA gateway.</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--dz-text-sm)', color: 'var(--gold)', marginTop: 'calc(var(--sp-1) * 2.5)' }}>in 6 days</div>
            </ArenaCard>
          </div>
        </ArenaTab>
        <ArenaTab value="Deployments" label="Deployments">
          <ArenaTable columns={DEPLOY_COLUMNS} label="Deployments">
            {
}
            {DEPLOYS.map((d) => (
              <ArenaTableRow key={d.build}>
                <ArenaTableCell>{d.build}</ArenaTableCell>
                <ArenaTableCell>{d.env}</ArenaTableCell>
                <ArenaTableCell><ArenaBadge tone={d.status[0]} dot>{d.status[1]}</ArenaBadge></ArenaTableCell>
                <ArenaTableCell>{d.author}</ArenaTableCell>
                <ArenaTableCell>{d.dur}</ArenaTableCell>
                <ArenaTableCell><ArenaButton variant="ghost" size="sm">Details</ArenaButton></ArenaTableCell>
              </ArenaTableRow>
            ))}
          </ArenaTable>
        </ArenaTab>
        <ArenaTab value="Activity" label="Activity">
          <ArenaCard><ArenaActivityFeed label="Project activity" items={ACTIVITY} /></ArenaCard>
        </ArenaTab>
        <ArenaTab value="Settings" label="Settings">
          <div style={{ maxWidth: 'calc(var(--sp-1) * 130)' }}>
            <ArenaCard title="Automation">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--rhythm-component)' }}>
                <ArenaSwitch state={auto} onFuncOn={() => setAuto(true)} onFuncOff={() => setAuto(false)} label="Auto-deploy on approval" />
                <ArenaSwitch state={false} label="Notify Slack on every release" />
                <ArenaSwitch state label="Require 2 approvals for production" />
              </div>
            </ArenaCard>
          </div>
        </ArenaTab>
      </ArenaTabs>

      <ArenaDialog open={open} onClose={() => setOpen(false)} eyebrow="Confirm" title="Deploy to production"
        footer={<><ArenaButton variant="ghost" onClick={() => setOpen(false)}>Cancel</ArenaButton><ArenaButton variant="primary" icon="ph-bold ph-rocket-launch" onClick={deploy}>Deploy #4822</ArenaButton></>}>
        You'll publish build <b style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>#4822</b> of <b style={{ color: 'var(--bone)' }}>{p.name}</b> to all {p.client} users. You can roll back at any time.
      </ArenaDialog>
    </Shell>
  );
}
