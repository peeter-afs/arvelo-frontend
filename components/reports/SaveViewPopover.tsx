'use client';

/** "★ Salvesta vaade" popover (handoff §5): filters only, personal or shared. */

import { useEffect, useRef, useState } from 'react';
import { reportViewsApi } from '@/lib/api/reportViews.api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useReports } from './ReportsProvider';
import type { UseReport } from './useReport';
import styles from './Reports.module.css';

const errorText = (e: unknown) => {
  const status = (e as { response?: { status?: number } }).response?.status;
  if (status === 409) return 'Sellise nimega vaade on juba olemas';
  if (status === 403) return 'Seda vaadet saab muuta ainult selle looja';
  return 'Salvestamine ebaõnnestus';
};

export function SaveViewPopover({ report, onClose }: { report: UseReport; onClose: () => void }) {
  const { view, def, filters, openView } = report;
  const { reloadViews, toast } = useReports();
  const userId = useAuthStore((s) => s.user?.id);
  const role = useAuthStore((s) => s.role);
  const [name, setName] = useState(view?.name ?? '');
  const [shared, setShared] = useState(view?.shared ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const canEdit = !view || view.owner_user_id === userId || (view.shared && (role === 'owner' || role === 'admin'));

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (view) {
        await reportViewsApi.update(view.id, { name: name.trim() || view.name, shared, filters });
        await reloadViews();
        openView(view.id, filters);
        toast('Vaade uuendatud');
      } else {
        const created = await reportViewsApi.create({ name: name.trim() || def.name, report: def.slug, filters, shared });
        await reloadViews();
        openView(created.id, filters);
        toast('Vaade salvestatud');
      }
      onClose();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!view || busy) return;
    setBusy(true);
    try {
      await reportViewsApi.remove(view.id);
      await reloadViews();
      openView(null, filters);
      toast('Vaade kustutatud');
      onClose();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${styles.pop} ${styles.popRight}`} style={{ width: 270 }}>
      <div className={styles.lbl}>{view ? 'Vaade' : 'Uus vaade'}</div>
      <input
        ref={inputRef}
        className={styles.inp}
        value={name}
        placeholder="nt Kuu lõpu bilanss"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') void save(); }}
        disabled={!canEdit}
        maxLength={120}
      />
      <label className={styles.chk} style={{ marginTop: 8 }}>
        <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} disabled={!canEdit} />
        Näita kõigile kasutajatele
      </label>
      {error && <div className={styles.dnote} style={{ color: 'var(--a-neg)' }}>{error}</div>}
      <div className={styles.popfoot}>
        {view ? (
          <>
            {canEdit && <button className={`${styles.btn} ${styles.sm} ${styles.ghost} ${styles.danger}`} onClick={remove} disabled={busy}>Kustuta</button>}
            <span className={styles.hint}>{canEdit ? '' : 'Jagatud vaade · ainult vaatamiseks'}</span>
            {canEdit && <button className={`${styles.btn} ${styles.sm} ${styles.primary}`} onClick={save} disabled={busy}>Salvesta muudatused</button>}
          </>
        ) : (
          <>
            <span className={styles.hint}>Salvestab perioodi, võrdluse ja filtrid</span>
            <button className={`${styles.btn} ${styles.sm} ${styles.primary}`} onClick={save} disabled={busy}>Salvesta</button>
          </>
        )}
      </div>
    </div>
  );
}
