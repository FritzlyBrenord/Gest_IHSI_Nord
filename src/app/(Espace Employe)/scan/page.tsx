'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, RotateCcw, ShieldAlert, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

interface ClientMe {
  employeeId: string | null;
  employee?: {
    firstName: string;
    lastName: string;
  } | null;
}

type ScanStatus = 'ready' | 'scanning' | 'success' | 'error';

export default function ClientScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopControlsRef = useRef<{ stop: () => void } | null>(null);
  const [client, setClient] = useState<ClientMe | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isVpn, setIsVpn] = useState(false);
  const [status, setStatus] = useState<ScanStatus>('ready');
  const [message, setMessage] = useState('Placez le QR code dans le cadre pour enregistrer votre présence.');

  useEffect(() => {
    fetch('/api/compte-employer/me')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setClient(data?.client || null))
      .catch(() => setClient(null));

    navigator.geolocation?.getCurrentPosition(
      (position) => setCoords({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => toast.error('GPS requis pour enregistrer la présence'),
      { enableHighAccuracy: true, timeout: 10000 }
    );

    fetch('/api/check-vpn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ipAddress: 'auto' }) })
      .then((response) => response.json())
      .then((data) => setIsVpn(Boolean(data.vpn)))
      .catch(() => setIsVpn(false));
  }, []);

  const stopScanner = useCallback(() => {
    stopControlsRef.current?.stop();
    stopControlsRef.current = null;
    if (videoRef.current?.srcObject instanceof MediaStream) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const submitAttendance = useCallback(
    async (qrData: string) => {
      if (!client?.employeeId) {
        setStatus('error');
        setMessage('Compte client non lié à un employé.');
        return;
      }
      if (!coords) {
        setStatus('error');
        setMessage('Position GPS indisponible. Activez la localisation puis réessayez.');
        return;
      }

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: client.employeeId,
          latitude: coords.lat,
          longitude: coords.lng,
          wifiDetected: false,
          isVpn,
          qrData,
          qrSizePixels: 150,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.isValid) {
        setStatus('error');
        setMessage(data.refusalReason || data.error || 'Présence refusée.');
        return;
      }
      setStatus('success');
      setMessage('Présence enregistrée correctement.');
    },
    [client, coords, isVpn]
  );

  const startScanner = useCallback(async () => {
    if (!coords) {
      toast.error('GPS requis avant le scan');
      return;
    }
    setStatus('scanning');
    setMessage('Caméra active. Visez le QR code.');
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current || undefined, async (result) => {
        if (!result) return;
        stopScanner();
        await submitAttendance(result.getText());
      });
      stopControlsRef.current = controls;
    } catch {
      setStatus('error');
      setMessage("Impossible d'ouvrir la caméra.");
    }
  }, [coords, stopScanner, submitAttendance]);

  useEffect(() => () => stopScanner(), [stopScanner]);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-4xl bg-linear-to-br from-[#003087] via-[#003d9e] to-[#00215d] p-6 text-white shadow-2xl shadow-blue-900/25 md:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 shadow-lg ring-1 ring-white/20 backdrop-blur-sm">
            <Camera className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black leading-tight md:text-3xl">Scanner QR</h2>
            <p className="mt-1 text-sm text-blue-100/70">Présence mobile sécurisée par compte client, GPS et QR code.</p>
          </div>
        </div>
      </section>

      <Card className="overflow-hidden border-0 shadow-2xl shadow-slate-900/20">
        <CardContent className="p-0">
          <div className="relative aspect-3/4 bg-slate-950 md:aspect-video">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute inset-6 rounded-3xl border-4 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.4)] md:inset-20" />
            </div>
            {/* Scanning indicator */}
            {status === 'scanning' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-white/20 border-t-white" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className={`rounded-2xl p-4 text-sm shadow-md backdrop-blur-sm transition-all duration-300 ${status === 'success' ? 'bg-emerald-50 ring-1 ring-emerald-200' : status === 'error' ? 'bg-red-50 ring-1 ring-red-200' : 'bg-white/80 ring-1 ring-slate-100'}`}>
        <div className="flex items-center gap-3">
          {status === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : null}
          {status === 'error' ? <XCircle className="h-5 w-5 shrink-0 text-red-600" /> : null}
          {status !== 'success' && status !== 'error' ? <ShieldAlert className="h-5 w-5 shrink-0 text-[#003087]" /> : null}
          <p className={`font-semibold ${status === 'success' ? 'text-emerald-800' : status === 'error' ? 'text-red-800' : 'text-slate-700'}`}>{message}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button className="h-12 rounded-xl bg-[#003087] text-sm font-semibold shadow-lg shadow-blue-900/20 transition-all hover:bg-[#00215d] hover:shadow-xl hover:shadow-blue-900/30" disabled={status === 'scanning'} onClick={startScanner}>
          {status === 'scanning' ? 'Scan en cours...' : 'Démarrer le scan'}
        </Button>
        <Button variant="outline" className="h-12 rounded-xl border-slate-200 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900" onClick={() => { stopScanner(); setStatus('ready'); setMessage('Placez le QR code dans le cadre pour enregistrer votre présence.'); }}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Refaire
        </Button>
      </div>
    </div>
  );
}
