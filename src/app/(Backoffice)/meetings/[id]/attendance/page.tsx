'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardCheck, Download, ArrowLeft, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Participant {
  id: string;
  employeeId: string;
  wasPresent: boolean;
  attendanceMode: AttendanceMode;
  employee: { id: string; firstName: string; lastName: string; poste: string; photoUrl: string | null };
}

interface MeetingInfo {
  id: string;
  title: string;
  startAt: string;
  status: string;
  type: string;
  participants: Participant[];
}

type AttendanceMode = 'PRESENTIEL' | 'EN_LIGNE' | null;
type AttendanceSelection = 'ABSENT' | 'PRESENTIEL' | 'EN_LIGNE';

function attendanceLabel(mode: AttendanceMode) {
  if (mode === 'PRESENTIEL') return 'Présentiel';
  if (mode === 'EN_LIGNE') return 'En ligne';
  return 'Absent';
}

function getAllowedAttendanceModes(meetingType: string) {
  if (meetingType === 'EN_LIGNE') return ['EN_LIGNE'] as const;
  if (meetingType === 'HYBRIDE') return ['PRESENTIEL', 'EN_LIGNE'] as const;
  return ['PRESENTIEL'] as const;
}

function getInitialAttendanceMode(meetingType: string, participant: Participant): AttendanceMode {
  if (participant.attendanceMode) {
    return participant.attendanceMode;
  }

  if (participant.wasPresent) {
    return meetingType === 'EN_LIGNE' ? 'EN_LIGNE' : 'PRESENTIEL';
  }

  return null;
}

function toAttendanceSelection(mode: AttendanceMode): AttendanceSelection {
  return mode ?? 'ABSENT';
}

function fromAttendanceSelection(selection: AttendanceSelection): AttendanceMode {
  return selection === 'ABSENT' ? null : selection;
}

export default function MeetingAttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const [meeting, setMeeting] = useState<MeetingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [participantStates, setParticipantStates] = useState<Record<string, AttendanceSelection>>({});
  const [meetings, setMeetings] = useState<Array<{ id: string; title: string; startAt: string }>>([]);
  const router = useRouter();
  const [meetingId, setMeetingId] = useState('');

  useEffect(() => {
    params.then(p => setMeetingId(p.id));
  }, [params]);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all meetings for selector
        const meetRes = await fetch('/api/meetings');
        const meetData = await meetRes.json();
        setMeetings(meetData.meetings || []);

        // Fetch current meeting
        if (meetingId) {
          const res = await fetch(`/api/meetings/${meetingId}/attendance`);
          if (!res.ok) throw new Error('Réunion non trouvée');
          const data = await res.json();
          setMeeting(data.meeting);
          const states: Record<string, AttendanceSelection> = {};
          data.meeting.participants.forEach((p: Participant) => {
            states[p.id] = toAttendanceSelection(getInitialAttendanceMode(data.meeting.type, p));
          });
          setParticipantStates(states);
        }
      } catch {
        toast.error('Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [meetingId]);

  const toggleAll = (markPresent: boolean) => {
    const states: Record<string, AttendanceSelection> = {};
    if (meeting) {
      const defaultMode = getAllowedAttendanceModes(meeting.type)[0] ?? 'PRESENTIEL';
      meeting.participants.forEach(p => {
        states[p.id] = markPresent ? defaultMode : 'ABSENT';
      });
    }
    setParticipantStates(states);
  };

  const setParticipantMode = (participantId: string, mode: AttendanceSelection) => {
    setParticipantStates(prev => ({ ...prev, [participantId]: mode }));
  };

  const handleSave = async () => {
    if (!meeting) return;
    setSaving(true);
    try {
      const participantUpdates = Object.entries(participantStates).map(([id, attendanceMode]) => ({
        id,
        attendanceMode: fromAttendanceSelection(attendanceMode),
      }));
      const res = await fetch(`/api/meetings/${meeting.id}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantUpdates }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Appel enregistré avec succès');
      router.push(`/meetings/${meeting.id}`);
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    if (!meeting) return;
    const headers = 'Nom,Prénom,Poste,Présentiel,En ligne,Statut\n';
    const rows = meeting.participants.map(p =>
      `${p.employee.lastName},${p.employee.firstName},${p.employee.poste},${participantStates[p.id] === 'PRESENTIEL' ? 'Oui' : 'Non'},${participantStates[p.id] === 'EN_LIGNE' ? 'Oui' : 'Non'},${attendanceLabel(fromAttendanceSelection(participantStates[p.id] ?? 'ABSENT'))}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appel-${meeting.title.replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export téléchargé');
  };

  const allChecked = meeting ? meeting.participants.length > 0 && meeting.participants.every(p => (participantStates[p.id] ?? 'ABSENT') !== 'ABSENT') : false;
  const presentCount = meeting ? meeting.participants.filter(p => (participantStates[p.id] ?? 'ABSENT') !== 'ABSENT').length : 0;

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/meetings/${meetingId}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-emerald-600" />
            Appel - {meeting?.title || 'Réunion'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {presentCount}/{meeting?.participants.length || 0} présents
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="w-4 h-4 mr-1" /> Export
        </Button>
      </div>

      {/* Meeting selector */}
      {meetings.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <Select value={meetingId} onValueChange={(v) => router.push(`/meetings/${v}/attendance`)}>
              <SelectTrigger>
                <SelectValue placeholder="Changer de réunion" />
              </SelectTrigger>
              <SelectContent>
                {meetings.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.title} - {new Date(m.startAt).toLocaleDateString('fr-FR')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              Participants
            </CardTitle>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Tous présents</label>
              <Button variant="outline" size="sm" onClick={() => toggleAll(!allChecked)}>
                {allChecked ? 'Tout mettre absent' : 'Tout marquer présent'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {meeting && meeting.participants.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun participant</p>
          ) : (
            <div className="space-y-2">
              {meeting?.participants.map((p) => (
                <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${(participantStates[p.id] ?? 'ABSENT') !== 'ABSENT' ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                        {p.employee.firstName.charAt(0)}{p.employee.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{p.employee.firstName} {p.employee.lastName}</p>
                      <p className="text-xs text-muted-foreground">{p.employee.poste}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={(participantStates[p.id] ?? 'ABSENT') !== 'ABSENT' ? 'default' : 'outline'} className={(participantStates[p.id] ?? 'ABSENT') !== 'ABSENT' ? 'bg-emerald-600' : ''}>
                      {attendanceLabel(fromAttendanceSelection(participantStates[p.id] ?? 'ABSENT'))}
                    </Badge>
                    <Select
                      value={participantStates[p.id] ?? 'ABSENT'}
                      onValueChange={(value) => setParticipantMode(p.id, value as AttendanceSelection)}
                    >
                      <SelectTrigger className="w-[170px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ABSENT">Absent</SelectItem>
                        {meeting && getAllowedAttendanceModes(meeting.type).map((mode) => (
                          <SelectItem key={mode} value={mode}>
                            {attendanceLabel(mode)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={saving}>
          <ClipboardCheck className="w-4 h-4 mr-1" />
          {saving ? 'Enregistrement...' : 'Enregistrer l\'appel'}
        </Button>
      </div>
    </div>
  );
}
