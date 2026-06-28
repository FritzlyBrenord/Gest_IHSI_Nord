'use client';

import { useRouter } from 'next/navigation';
import { EvenementsViewer, MeetingEvent, useCurrentUserEmployerId } from '@/components/shared/evenements-viewer';

export default function SuperviseurEvenementsPage() {
  const employerId = useCurrentUserEmployerId();
  const router = useRouter();

  function handleCompteRendu(meeting: MeetingEvent) {
    const existingReportId = meeting.reports?.[0]?.id;
    
    if (existingReportId) {
      // Modification: naviguer avec l'ID du document et la page de retour
      router.push(`/executant/documents?docId=${existingReportId}&back=/executant/evenements`);
    } else {
      // Création: stocker les données de l'événement dans sessionStorage
      sessionStorage.setItem(
        'evenement_compte_rendu',
        JSON.stringify({
          id: meeting.id,
          title: meeting.title,
          description: meeting.description,
          startAt: meeting.startAt,
          durationMins: meeting.durationMins,
          type: meeting.type,
          category: meeting.category,
          location: meeting.location,
          platform: meeting.platform,
          reportResponsible: meeting.reportResponsible,
          participants: meeting.participants,
          status: meeting.status,
          backUrl: '/executant/evenements',
        })
      );
      router.push('/executant/documents?back=/executant/evenements');
    }
  }

  return (
    <div className="p-4 md:p-6">
      <EvenementsViewer
        filterByEmployeeId={employerId}
        allowActions
        onCompteRendu={handleCompteRendu}
        docViewerPath='/executant/doc-viewer'
      />
    </div>
  );
}
