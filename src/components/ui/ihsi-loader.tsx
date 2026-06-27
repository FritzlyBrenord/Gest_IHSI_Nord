'use client';

import Image from 'next/image';

export function IHSILoader() {
  return (
    <>
      <style>{`
        @keyframes ihsi-cw   { to { transform: rotate(360deg);  } }
        @keyframes ihsi-ccw  { to { transform: rotate(-360deg); } }
        @keyframes ihsi-pulse {
          0%,100% { transform: scale(1);    opacity: .5;  }
          50%     { transform: scale(1.1);  opacity: .15; }
        }
        @keyframes ihsi-scan {
          0%   { transform: translateY(-44px); opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateY(44px);  opacity: 0; }
        }
        @keyframes ihsi-glow {
          0%,100% { box-shadow: 0 0 0 0   rgba(59,130,246,0);    }
          50%     { box-shadow: 0 0 28px 8px rgba(59,130,246,.2); }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg,#06112B 0%,#0C1E45 50%,#091730 100%)',
        }}
      >
        <div style={{ position: 'relative', width: 140, height: 140 }}>
          <div
            style={{
              position: 'absolute',
              inset: -10,
              borderRadius: '50%',
              border: '1px solid rgba(59,130,246,.22)',
              animation: 'ihsi-pulse 2.4s ease-in-out infinite',
            }}
          />

          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '1.5px dashed rgba(59,130,246,.28)',
              animation: 'ihsi-cw 3.6s linear infinite',
            }}
          />

          <div
            style={{
              position: 'absolute',
              inset: 12,
              borderRadius: '50%',
              border: '2px solid transparent',
              borderTopColor: 'rgba(96,165,250,.85)',
              borderRightColor: 'rgba(96,165,250,.30)',
              animation: 'ihsi-ccw 2.8s linear infinite',
            }}
          />

          <div
            style={{
              position: 'absolute',
              inset: 20,
              borderRadius: '50%',
              border: '1.5px solid transparent',
              borderBottomColor: 'rgba(147,197,253,.6)',
              borderLeftColor: 'rgba(147,197,253,.2)',
              animation: 'ihsi-cw 2s linear infinite',
            }}
          />

          <div
            style={{
              position: 'absolute',
              inset: 28,
              borderRadius: '50%',
              background: 'rgba(255,255,255,.96)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              animation: 'ihsi-glow 2.8s ease-in-out infinite',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: 2,
                background:
                  'linear-gradient(90deg,transparent,rgba(59,130,246,.5) 30%,rgba(96,165,250,.85) 50%,rgba(59,130,246,.5) 70%,transparent)',
                animation: 'ihsi-scan 2.2s ease-in-out infinite',
                pointerEvents: 'none',
              }}
            />
            <Image
              src="/logo.webp"
              alt="IHSI"
              width={52}
              height={52}
              style={{ objectFit: 'contain', position: 'relative', zIndex: 1 }}
              priority
            />
          </div>
        </div>
      </div>
    </>
  );
}
