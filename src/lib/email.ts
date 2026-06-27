import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || 'ihsi.nord@gmail.com',
    pass: process.env.SMTP_PASSWORD || 'odgqsrlnywdrsizr',
  },
});

export const fromEmail = process.env.SMTP_FROM_EMAIL || 'ihsi.nord@gmail.com';

function formatDate(date: Date) {
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function formatTime(date: Date) {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ─── 1. Invitation initiale ───────────────────────────────────────────────────
export async function sendMeetingInvitation(to: string, details: {
  title: string; startAt: Date; durationMins: number;
  type: string; location?: string | null; platform?: string | null; meetingUrl?: string | null;
}) {
  const dateStr = formatDate(details.startAt);
  const timeStr = formatTime(details.startAt);
  const typeLabel = details.type === 'EN_LIGNE' ? 'En ligne' : details.type === 'HYBRIDE' ? 'Hybride' : 'Présentiel';

  await transporter.sendMail({
    from: `"Direction IHSI Nord" <${fromEmail}>`,
    to,
    subject: `Invitation : ${details.title}`,
    html: `
      <div style="font-family:Arial,sans-serif;padding:20px;max-width:600px">
        <h2 style="color:#059669">📅 Invitation à un événement</h2>
        <p>Bonjour,</p>
        <p>Vous êtes invité(e) à participer à l'événement suivant :</p>
        <table style="border-collapse:collapse;width:100%;margin:16px 0">
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb">Événement</td><td style="padding:8px;border:1px solid #e5e7eb">${details.title}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb">Date</td><td style="padding:8px;border:1px solid #e5e7eb">${dateStr} à ${timeStr}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb">Durée</td><td style="padding:8px;border:1px solid #e5e7eb">${details.durationMins} minutes</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb">Mode</td><td style="padding:8px;border:1px solid #e5e7eb">${typeLabel}</td></tr>
          ${details.location ? `<tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb">Lieu</td><td style="padding:8px;border:1px solid #e5e7eb">${details.location}</td></tr>` : ''}
          ${details.platform ? `<tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb">Plateforme</td><td style="padding:8px;border:1px solid #e5e7eb">${details.platform}</td></tr>` : ''}
          ${details.meetingUrl ? `<tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb">Lien</td><td style="padding:8px;border:1px solid #e5e7eb"><a href="${details.meetingUrl}">${details.meetingUrl}</a></td></tr>` : ''}
        </table>
        <p>Merci de votre présence.</p>
        <p style="color:#6b7280;font-size:13px">— IHSI Nord</p>
      </div>`,
  });
}

// ─── 2. Notification de reprogrammation ──────────────────────────────────────
export async function sendMeetingRescheduled(to: string, details: {
  title: string; startAt: Date; durationMins: number;
  type: string; location?: string | null; platform?: string | null; meetingUrl?: string | null;
}) {
  const dateStr = formatDate(details.startAt);
  const timeStr = formatTime(details.startAt);
  const typeLabel = details.type === 'EN_LIGNE' ? 'En ligne' : details.type === 'HYBRIDE' ? 'Hybride' : 'Présentiel';

  await transporter.sendMail({
    from: `"Direction IHSI Nord" <${fromEmail}>`,
    to,
    subject: `⚠️ Reprogrammation : ${details.title}`,
    html: `
      <div style="font-family:Arial,sans-serif;padding:20px;max-width:600px">
        <h2 style="color:#d97706">🔄 Événement reprogrammé</h2>
        <p>Bonjour,</p>
        <p>L'événement <strong>${details.title}</strong> a été <strong>reprogrammé</strong>. Voici les nouvelles informations :</p>
        <table style="border-collapse:collapse;width:100%;margin:16px 0">
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#fffbeb">Nouvelle date</td><td style="padding:8px;border:1px solid #e5e7eb">${dateStr} à ${timeStr}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#fffbeb">Durée</td><td style="padding:8px;border:1px solid #e5e7eb">${details.durationMins} minutes</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#fffbeb">Mode</td><td style="padding:8px;border:1px solid #e5e7eb">${typeLabel}</td></tr>
          ${details.location ? `<tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#fffbeb">Lieu</td><td style="padding:8px;border:1px solid #e5e7eb">${details.location}</td></tr>` : ''}
          ${details.platform ? `<tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#fffbeb">Plateforme</td><td style="padding:8px;border:1px solid #e5e7eb">${details.platform}</td></tr>` : ''}
          ${details.meetingUrl ? `<tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#fffbeb">Lien</td><td style="padding:8px;border:1px solid #e5e7eb"><a href="${details.meetingUrl}">${details.meetingUrl}</a></td></tr>` : ''}
        </table>
        <p>Merci de prendre note de ce changement.</p>
        <p style="color:#6b7280;font-size:13px">— IHSI Nord</p>
      </div>`,
  });
}

// ─── 3. Notification de changement de statut ─────────────────────────────────
const STATUS_INFO: Record<string, { label: string; emoji: string; color: string; message: string }> = {
  EN_COURS: {
    label: 'En cours',
    emoji: '🟢',
    color: '#059669',
    message: "L'événement vient de démarrer. Merci de vous y connecter ou de vous y rendre.",
  },
  TERMINEE: {
    label: 'Terminé',
    emoji: '✅',
    color: '#374151',
    message: "L'événement est maintenant terminé. Merci pour votre participation.",
  },
  ANNULEE: {
    label: 'Annulé',
    emoji: '❌',
    color: '#dc2626',
    message: "Cet événement a été annulé. Nous vous informerons de toute reprogrammation.",
  },
};

export async function sendStatusChangeNotification(to: string, details: {
  title: string; startAt: Date; status: string;
}) {
  const info = STATUS_INFO[details.status];
  if (!info) return; // Ne pas envoyer pour A_VENIR
  const dateStr = formatDate(details.startAt);

  await transporter.sendMail({
    from: `"Direction IHSI Nord" <${fromEmail}>`,
    to,
    subject: `${info.emoji} ${details.title} — ${info.label}`,
    html: `
      <div style="font-family:Arial,sans-serif;padding:20px;max-width:600px">
        <h2 style="color:${info.color}">${info.emoji} ${info.label} : ${details.title}</h2>
        <p>Bonjour,</p>
        <p>${info.message}</p>
        <p style="color:#6b7280;font-size:13px">Événement du ${dateStr}</p>
        <p style="color:#6b7280;font-size:13px">— IHSI Nord</p>
      </div>`,
  });
}

// ─── 4. Notification responsable rapport ─────────────────────────────────────
export async function sendReporterNotification(to: string, details: {
  title: string; startAt: Date;
}) {
  const dateStr = formatDate(details.startAt);
  const timeStr = formatTime(details.startAt);

  await transporter.sendMail({
    from: `"Direction IHSI Nord" <${fromEmail}>`,
    to,
    subject: `📝 Action requise : Rapport pour "${details.title}"`,
    html: `
      <div style="font-family:Arial,sans-serif;padding:20px;max-width:600px">
        <h2 style="color:#2563eb">📝 Vous êtes responsable du rapport</h2>
        <p>Bonjour,</p>
        <p>Vous avez été désigné(e) comme responsable pour rédiger le rapport de l'événement :</p>
        <ul>
          <li><strong>${details.title}</strong></li>
          <li>Date : ${dateStr} à ${timeStr}</li>
        </ul>
        <p>Merci de préparer vos notes et de soumettre le rapport après l'événement.</p>
        <p style="color:#6b7280;font-size:13px">— IHSI Nord</p>
      </div>`,
  });
}

// ─── Helper : envoyer en masse avec statistiques ──────────────────────────────
export async function sendBulkEmails(
  emails: string[],
  sendFn: (to: string) => Promise<void>
): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0; let failed = 0; const errors: string[] = [];
  await Promise.allSettled(
    emails.map((email) =>
      sendFn(email)
        .then(() => sent++)
        .catch((err) => { failed++; errors.push(err.message || email); })
    )
  );
  return { sent, failed, errors: errors.slice(0, 5) };
}

// ─── 5. Objectif assigné à un employé ────────────────────────────────────────
export async function sendObjectiveAssignedToEmployee(to: string, details: {
  title: string;
  description?: string | null;
  assigneeName: string;
}) {
  await transporter.sendMail({
    from: `"Direction IHSI Nord" <${fromEmail}>`,
    to,
    subject: `🎯 De nouvelles tâches vous sont assignées : ${details.title}`,
    html: `
      <div style="font-family:Arial,sans-serif;padding:20px;max-width:600px">
        <h2 style="color:#d97706">🎯 Tâches assignées</h2>
        <p>Bonjour <strong>${details.assigneeName}</strong>,</p>
        <p>De nouvelles tâches vous ont été assignées par l'administration dans le cadre de l'objectif suivant :</p>
        <table style="border-collapse:collapse;width:100%;margin:16px 0">
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#fffbeb">Objectif</td><td style="padding:8px;border:1px solid #e5e7eb">${details.title}</td></tr>
          ${details.description ? `<tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#fffbeb">Description</td><td style="padding:8px;border:1px solid #e5e7eb">${details.description}</td></tr>` : ''}
        </table>
        <p>Veuillez consulter votre espace de travail pour prendre connaissance des plans d'action et soumettre vos rapports.</p>
        <p style="color:#6b7280;font-size:13px">— IHSI Nord</p>
      </div>`,
  });
}

// ─── 6. Objectif assigné à une équipe (email au superviseur) ─────────────────
export async function sendObjectiveAssignedToSupervisor(to: string, details: {
  title: string;
  description?: string | null;
  supervisorName: string;
  teamName: string;
}) {
  await transporter.sendMail({
    from: `"Direction IHSI Nord" <${fromEmail}>`,
    to,
    subject: `🎯 De nouvelles tâches pour votre équipe : ${details.title}`,
    html: `
      <div style="font-family:Arial,sans-serif;padding:20px;max-width:600px">
        <h2 style="color:#d97706">🎯 Tâches assignées à votre équipe</h2>
        <p>Bonjour <strong>${details.supervisorName}</strong>,</p>
        <p>De nouvelles tâches ont été assignées à votre équipe <strong>${details.teamName}</strong> dans le cadre de l'objectif suivant :</p>
        <table style="border-collapse:collapse;width:100%;margin:16px 0">
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#fffbeb">Objectif</td><td style="padding:8px;border:1px solid #e5e7eb">${details.title}</td></tr>
          ${details.description ? `<tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#fffbeb">Description</td><td style="padding:8px;border:1px solid #e5e7eb">${details.description}</td></tr>` : ''}
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#fffbeb">Équipe</td><td style="padding:8px;border:1px solid #e5e7eb">${details.teamName}</td></tr>
        </table>
        <p>En tant que superviseur, vous êtes responsable du suivi des rapports de votre équipe pour cet objectif.</p>
        <p style="color:#6b7280;font-size:13px">— IHSI Nord</p>
      </div>`,
  });
}

