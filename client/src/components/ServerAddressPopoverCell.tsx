import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Server } from '../types';
import { formatIpDisplay } from '../lib/utils';
import { LINODE_LOGO_URL } from '../lib/cloudAssets';
import { parseLinodeNetworkExtras } from '../lib/linodeNetworkExtras';

function joinList(list: string[] | undefined): string {
  if (!list?.length) return 'N/A';
  return list.join(', ');
}

export function ServerAddressPopoverCell({ server }: { server: Server }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const extras = parseLinodeNetworkExtras(server.linode_network_extras);
  const showLinodeLogo = Boolean(server.cloud_provider_id);

  const primary =
    server.ip_address?.trim() ||
    server.ipv6_address?.trim() ||
    (extras?.vpc_ipv4[0] ?? extras?.nat_1_1_ipv4[0]) ||
    'N/A';

  const updatePos = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const maxLeft = Math.max(8, Math.min(r.left, window.innerWidth - 300));
    setPos({ top: r.bottom, left: maxLeft });
  }, []);

  const clearHide = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const clearShow = () => {
    if (showTimer.current) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
  };

  const scheduleHide = () => {
    clearHide();
    hideTimer.current = setTimeout(() => setOpen(false), 220);
  };

  const handleEnter = () => {
    clearHide();
    clearShow();
    showTimer.current = setTimeout(() => {
      updatePos();
      setOpen(true);
    }, 120);
  };

  const handleLeave = () => {
    clearShow();
    scheduleHide();
  };

  return (
    <>
      <div
        ref={wrapRef}
        className="relative min-w-0 max-w-[11rem]"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onMouseMove={() => {
          if (open) updatePos();
        }}
      >
        <span
          className="font-mono block truncate cursor-default border-b border-dashed border-transparent hover:border-[hsl(var(--fg-3))]"
          style={{ fontSize: 12, color: 'hsl(var(--fg-2))' }}
          title="Hover for full addressing (VPC, NAT, IPv6)"
        >
          {primary}
        </span>
      </div>
      {open &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              marginTop: -1,
              zIndex: 10050,
              minWidth: 260,
              maxWidth: 340,
              padding: 12,
              borderRadius: 10,
              background: 'hsl(var(--surface))',
              border: '1px solid hsl(var(--border))',
              boxShadow: '0 12px 40px hsl(0 0% 0% / 0.35)',
            }}
            onMouseEnter={clearHide}
            onMouseLeave={scheduleHide}
          >
            {showLinodeLogo && (
              <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <img
                  src={LINODE_LOGO_URL}
                  alt="Linode"
                  width={112}
                  height={28}
                  style={{ height: 28, width: 'auto', maxWidth: 140, objectFit: 'contain' }}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              </div>
            )}
            <dl style={{ margin: 0, display: 'grid', gap: 6, fontSize: 11 }}>
              <IpRow label="Public IPv4" value={formatIpDisplay(server.ip_address)} />
              <IpRow label="Private IPv4" value={formatIpDisplay(server.private_ip)} />
              <IpRow label="Public IPv6" value={formatIpDisplay(server.ipv6_address)} />
              <IpRow label="Private IPv6" value={formatIpDisplay(server.private_ipv6)} />
              <IpRow label="VPC IPv4" value={joinList(extras?.vpc_ipv4)} multiline />
              <IpRow label="VPC IPv6" value={joinList(extras?.vpc_ipv6)} multiline />
              <IpRow label="NAT 1:1 (public)" value={joinList(extras?.nat_1_1_ipv4)} multiline />
            </dl>
          </div>,
          document.body
        )}
    </>
  );
}

function IpRow({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '7.5rem 1fr', gap: 8, alignItems: 'start' }}>
      <dt style={{ margin: 0, color: 'hsl(var(--fg-3))', fontWeight: 500 }}>{label}</dt>
      <dd
        style={{
          margin: 0,
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'hsl(var(--fg))',
          wordBreak: multiline ? 'break-all' : 'normal',
          whiteSpace: multiline ? 'normal' : 'nowrap',
          overflow: multiline ? undefined : 'hidden',
          textOverflow: multiline ? undefined : 'ellipsis',
        }}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}
