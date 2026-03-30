import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Server } from '../types';
import { nonEmptyTrim } from '../lib/utils';
import { LINODE_LOGO_URL } from '../lib/cloudAssets';
import { parseLinodeNetworkExtras } from '../lib/linodeNetworkExtras';

const GAP = 8;
/** Rough min height to prefer flipping above; real popover is clamped with maxHeight + scroll. */
const EST_POPOVER_HEIGHT = 280;
const POPOVER_MAX_W = 340;


export function ServerAddressPopoverCell({ server }: { server: Server }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({
    top: 0,
    left: 0,
    placement: 'below' as 'above' | 'below',
    maxH: 420,
  });
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const extras = parseLinodeNetworkExtras(server.linode_network_extras);
  const showLinodeLogo = Boolean(server.cloud_provider_id);

  const primary =
    nonEmptyTrim(server.ip_address) ||
    nonEmptyTrim(server.ipv6_address) ||
    extras?.additional_public_ipv4[0] ||
    extras?.vpc_ipv4[0] ||
    extras?.nat_1_1_ipv4[0] ||
    extras?.vpc_subnet_lines[0] ||
    '\u2014';

  const updatePos = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const popoverW = Math.min(POPOVER_MAX_W, vw - GAP * 2);
    const left = Math.max(GAP, Math.min(r.left, vw - popoverW - GAP));

    /** Vertical room for the popover (scrolls inside if content is taller). */
    const maxBelow = Math.max(80, vh - r.bottom - GAP * 2);
    const maxAbove = Math.max(80, r.top - GAP * 2);
    const cap = 420;

    if (maxBelow >= EST_POPOVER_HEIGHT) {
      setPos({
        top: r.bottom,
        left,
        placement: 'below',
        maxH: Math.min(cap, maxBelow),
      });
    } else if (maxAbove > maxBelow) {
      setPos({
        top: r.top - GAP,
        left,
        placement: 'above',
        maxH: Math.min(cap, maxAbove),
      });
    } else {
      setPos({
        top: r.bottom,
        left,
        placement: 'below',
        maxH: Math.min(cap, maxBelow),
      });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onMove = () => updatePos();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open, updatePos]);

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

  const hasIpDetails =
    nonEmptyTrim(server.ip_address) ||
    nonEmptyTrim(server.private_ip) ||
    nonEmptyTrim(server.ipv6_address) ||
    nonEmptyTrim(server.private_ipv6) ||
    (extras?.additional_public_ipv4?.length ?? 0) > 0 ||
    (extras?.additional_public_ipv6?.length ?? 0) > 0 ||
    (extras?.vpc_ipv4?.length ?? 0) > 0 ||
    (extras?.vpc_ipv6?.length ?? 0) > 0 ||
    (extras?.nat_1_1_ipv4?.length ?? 0) > 0 ||
    (extras?.vpc_subnet_lines?.length ?? 0) > 0;

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
              transform: pos.placement === 'above' ? 'translateY(-100%)' : undefined,
              marginTop: pos.placement === 'below' ? -1 : 0,
              zIndex: 10050,
              minWidth: 260,
              maxWidth: POPOVER_MAX_W,
              maxHeight: pos.maxH,
              overflowY: 'auto',
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
            {!hasIpDetails ? (
              <p style={{ margin: 0, fontSize: 12, color: 'hsl(var(--fg-3))' }}>No addresses stored</p>
            ) : (
              <dl style={{ margin: 0, display: 'grid', gap: 6, fontSize: 11 }}>
                {nonEmptyTrim(server.ip_address) && (
                  <IpRow label="Public IPv4" value={nonEmptyTrim(server.ip_address)!} />
                )}
                {nonEmptyTrim(server.private_ip) && (
                  <IpRow label="Private IPv4" value={nonEmptyTrim(server.private_ip)!} />
                )}
                {nonEmptyTrim(server.ipv6_address) && (
                  <IpRow label="Public IPv6" value={nonEmptyTrim(server.ipv6_address)!} />
                )}
                {nonEmptyTrim(server.private_ipv6) && (
                  <IpRow label="Private IPv6" value={nonEmptyTrim(server.private_ipv6)!} />
                )}
                {(extras?.additional_public_ipv4?.length ?? 0) > 0 && (
                  <IpRow
                    label="Additional public IPv4"
                    value={extras!.additional_public_ipv4.join(', ')}
                    multiline
                  />
                )}
                {(extras?.additional_public_ipv6?.length ?? 0) > 0 && (
                  <IpRow
                    label="Additional public IPv6"
                    value={extras!.additional_public_ipv6.join(', ')}
                    multiline
                  />
                )}
                {(extras?.vpc_ipv4?.length ?? 0) > 0 && (
                  <IpRow label="VPC IPv4 (private)" value={extras!.vpc_ipv4.join(', ')} multiline />
                )}
                {(extras?.vpc_ipv6?.length ?? 0) > 0 && (
                  <IpRow label="VPC IPv6 (private)" value={extras!.vpc_ipv6.join(', ')} multiline />
                )}
                {(extras?.nat_1_1_ipv4?.length ?? 0) > 0 && (
                  <IpRow label="NAT 1:1 (public)" value={extras!.nat_1_1_ipv4.join(', ')} multiline />
                )}
                {(extras?.vpc_subnet_lines?.length ?? 0) > 0 && (
                  <IpRow label="VPC subnet" value={extras!.vpc_subnet_lines.join('\n')} multiline />
                )}
              </dl>
            )}
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
          whiteSpace: multiline ? 'pre-line' : 'nowrap',
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
