export type StudioDocumentType = 'LETTRE' | 'COMPTE_RENDU' | 'RAPPORT'

export type StudioDocumentVariant =
  | 'DEMANDE'
  | 'ADMINISTRATIVE'
  | 'CONVOCATION'
  | 'REUNION'
  | 'VISITE'
  | 'ENTRETIEN'
  | 'ACTIVITE'
  | 'MENSUEL'
  | 'TECHNIQUE'
  | 'FINANCIER'
  | 'SYNTHETIQUE'

export interface StudioImage {
  id: string
  name: string
  dataUrl: string
  mimeType: string
}

export interface StudioDocument {
  id: string
  type: StudioDocumentType
  variant: StudioDocumentVariant
  title: string
  prompt: string
  content: string
  images: StudioImage[]
  createdAt: string
  updatedAt: string
}

export interface StudioVariantOption {
  value: StudioDocumentVariant
  label: string
  description: string
}

export interface BuildDocumentPayload {
  type: StudioDocumentType
  variant: StudioDocumentVariant
  title: string
  prompt: string
  content?: string
  images?: StudioImage[]
}

export const DOCUMENT_VARIANTS: Record<StudioDocumentType, StudioVariantOption[]> = {
  LETTRE: [
    { value: 'DEMANDE', label: 'Lettre de demande', description: 'Demande formelle, courte et claire.' },
    { value: 'ADMINISTRATIVE', label: 'Lettre administrative', description: 'Correspondance institutionnelle ou interne.' },
    { value: 'CONVOCATION', label: 'Lettre de convocation', description: 'Invitation officielle avec date, heure et lieu.' },
  ],
  COMPTE_RENDU: [
    { value: 'REUNION', label: 'Compte rendu de reunion', description: 'Resume structuré d une reunion.' },
    { value: 'VISITE', label: 'Compte rendu de visite', description: 'Retour sur une visite terrain ou institutionnelle.' },
    { value: 'ENTRETIEN', label: 'Compte rendu d entretien', description: 'Synthese d un entretien ou d un echange.' },
  ],
  RAPPORT: [
    { value: 'ACTIVITE', label: 'Rapport d activite', description: 'Bilan des activites menees sur une periode.' },
    { value: 'MENSUEL', label: 'Rapport mensuel', description: 'Synthese mensuelle avec indicateurs.' },
    { value: 'TECHNIQUE', label: 'Rapport technique', description: 'Constat, analyse et recommandations techniques.' },
    { value: 'FINANCIER', label: 'Rapport financier', description: 'Suivi budgetaire, ecarts et justifications.' },
    { value: 'SYNTHETIQUE', label: 'Rapport synthetique', description: 'Rapport court, analytique et executive.' },
  ],
}

export const DOCUMENT_TYPE_META: Record<
  StudioDocumentType,
  {
    label: string
    description: string
    pagesHint: string
    structure: string[]
    promptGuide: string
    allowImages: boolean
    requiresTableOfContents: boolean
  }
> = {
  LETTRE: {
    label: 'Lettre',
    description: 'Document court, formel et direct. Une seule page en general.',
    pagesHint: '1 page',
    structure: ['En tete', 'Objet', 'Corps du texte', 'Formule de politesse', 'Signature'],
    promptGuide:
      'Ecris une lettre professionnelle francaise, concise, polie, avec ton institutionnel. Reste sur une seule page et evite les digressions.',
    allowImages: false,
    requiresTableOfContents: false,
  },
  COMPTE_RENDU: {
    label: 'Compte rendu',
    description: 'Document structuré avec couverture, contexte, contenu et decisions.',
    pagesHint: '2 pages ou plus',
    structure: ['Page de couverture', 'Contexte', 'Participants', 'Points abordes', 'Decisions', 'Actions a suivre'],
    promptGuide:
      'Ecris un compte rendu structuré, professionnel et factuel. Ajoute une page de couverture, un resume, les points abordes, les decisions et les actions a suivre.',
    allowImages: false,
    requiresTableOfContents: false,
  },
  RAPPORT: {
    label: 'Rapport',
    description: 'Document detaille pouvant contenir plusieurs pages, tableaux et images.',
    pagesHint: 'Plusieurs pages',
    structure: ['Page de couverture', 'Sommaire', 'Introduction', 'Analyse', 'Tableaux', 'Illustrations', 'Conclusion', 'Recommandations'],
    promptGuide:
      'Ecris un rapport detaille, professionnel et bien structure. Utilise des titres numerotes, un sommaire, des tableaux markdown si necessaire, des sous-sections et des recommandations claires.',
    allowImages: true,
    requiresTableOfContents: true,
  },
}

export function getVariantOptions(type: StudioDocumentType): StudioVariantOption[] {
  return DOCUMENT_VARIANTS[type]
}

export function getTypeMeta(type: StudioDocumentType) {
  return DOCUMENT_TYPE_META[type]
}

export function getVariantLabel(type: StudioDocumentType, variant: StudioDocumentVariant) {
  return DOCUMENT_VARIANTS[type].find((item) => item.value === variant)?.label ?? variant
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildDocumentPrompt(payload: BuildDocumentPayload) {
  const meta = getTypeMeta(payload.type)
  const imagesHint = payload.images && payload.images.length > 0
    ? `Images disponibles: ${payload.images.map((image, index) => `${index + 1}. ${image.name}`).join(' | ')}. Integre les images de facon coherente si cela enrichit le document.`
    : 'Aucune image fournie.'

  return [
    `Type de document: ${meta.label}`,
    `Variant: ${getVariantLabel(payload.type, payload.variant)}`,
    `Titre: ${payload.title}`,
    '',
    meta.promptGuide,
    '',
    'Consignes de production:',
    '- Redige en francais professionnel.',
    '- Utilise exclusivement du markdown propre.',
    '- Cree une structure claire avec titres, sous-titres et listes numerotees si utile.',
    '- Si des informations manquent, utilise des placeholders evidents comme [A completer].',
    '- Ne fabrique pas de faits precis non fournis.',
    payload.type === 'LETTRE'
      ? '- La lettre doit tenir sur une seule page et rester concise.'
      : '- Le document peut etre plus developpe et contenir des tableaux si necessaire.',
    payload.type === 'COMPTE_RENDU'
      ? '- Commence par une page de couverture puis enchaine avec le resume, les participants, les points abordes et les decisions.'
      : '',
    payload.type === 'RAPPORT'
      ? '- Inclue une page de couverture, un sommaire, une introduction, une analyse detaillee, des tableaux markdown et une conclusion.'
      : '',
    imagesHint,
    '',
    'Contexte utilisateur / brief:',
    payload.prompt,
    ...(payload.content ? ['Contenu precedent a reviser:', payload.content] : []),
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildFallbackMarkdown(payload: BuildDocumentPayload) {
  const typeMeta = getTypeMeta(payload.type)
  const title = payload.title.trim() || typeMeta.label
  const variantLabel = getVariantLabel(payload.type, payload.variant)

  if (payload.type === 'LETTRE') {
    return `# ${title}

**Type :** ${variantLabel}

**Date :** [A completer]

**Objet :** ${title}

Madame, Monsieur,

${payload.prompt || 'Veuillez rediger ici le corps de la lettre en respectant un ton professionnel.'}

Je vous prie d agreer, Madame, Monsieur, l expression de ma consideration distinguee.

**Signature**

[Nom et titre]
`
  }

  if (payload.type === 'COMPTE_RENDU') {
    return `# ${title}

## Page de couverture

- **Type :** ${variantLabel}
- **Date :** [A completer]
- **Lieu :** [A completer]
- **Rappel :** Compte rendu structure et factuel.

## 1. Contexte

${payload.prompt || 'Decrire le contexte de la rencontre ou de la visite.'}

## 2. Participants

- [A completer]
- [A completer]

## 3. Points abordes

1. Point principal
2. Point secondaire
3. Suivi a effectuer

## 4. Decisions prises

| Decision | Responsable | Echeance |
| --- | --- | --- |
| [A completer] | [A completer] | [A completer] |

## 5. Actions a suivre

- [A completer]
- [A completer]
`
  }

  const imagesSection = payload.images && payload.images.length > 0
    ? payload.images
        .map(
          (image, index) => `![${image.name}](${image.dataUrl})

*Figure ${index + 1} - ${image.name}*`
        )
        .join('\n\n')
    : ''

  return `# ${title}

## Page de couverture

- **Type :** ${variantLabel}
- **Periode :** [A completer]
- **Auteur :** [A completer]
- **Institution :** [A completer]

## Sommaire

1. Introduction
2. Analyse
3. Resultats
4. Tableau de synthese
5. Conclusion
6. Recommandations

## 1. Introduction

${payload.prompt || 'Rediger une introduction claire et professionnelle.'}

## 2. Analyse detaillee

### 2.1 Constat general

[A completer]

### 2.2 Elements par axe

- Axe 1: [A completer]
- Axe 2: [A completer]
- Axe 3: [A completer]

## 3. Tableaux et synthese

| Indicateur | Valeur | Observation |
| --- | --- | --- |
| [A completer] | [A completer] | [A completer] |

## 4. Illustrations

${imagesSection || '_Aucune image renseignee._'}

## 5. Conclusion

[A completer]

## 6. Recommandations

1. [A completer]
2. [A completer]
3. [A completer]
`
}

export function estimatePages(content: string, type: StudioDocumentType, imageCount = 0) {
  const words = content.trim().split(/\s+/).filter(Boolean).length

  if (type === 'LETTRE') {
    return 1
  }

  if (type === 'COMPTE_RENDU') {
    return Math.max(2, Math.ceil(words / 280))
  }

  const tableCount = (content.match(/\n\|.*\|\n/g) || []).length
  const base = Math.max(3, Math.ceil(words / 220))
  return base + Math.min(3, Math.floor(imageCount / 2)) + Math.min(2, tableCount)
}

export function createSampleDocuments(): StudioDocument[] {
  const now = new Date().toISOString()

  return [
    {
      id: 'studio-sample-letter',
      type: 'LETTRE',
      variant: 'DEMANDE',
      title: 'Lettre de demande de collaboration',
      prompt: 'Demander un rendez-vous officiel pour discuter d une collaboration technique.',
      content: buildFallbackMarkdown({
        type: 'LETTRE',
        variant: 'DEMANDE',
        title: 'Lettre de demande de collaboration',
        prompt: 'Demander un rendez-vous officiel pour discuter d une collaboration technique.',
      }),
      images: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'studio-sample-minutes',
      type: 'COMPTE_RENDU',
      variant: 'REUNION',
      title: 'Compte rendu de reunion de coordination',
      prompt: 'Faire le point sur les activites de la semaine et definir les actions prioritaires.',
      content: buildFallbackMarkdown({
        type: 'COMPTE_RENDU',
        variant: 'REUNION',
        title: 'Compte rendu de reunion de coordination',
        prompt: 'Faire le point sur les activites de la semaine et definir les actions prioritaires.',
      }),
      images: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'studio-sample-report',
      type: 'RAPPORT',
      variant: 'ACTIVITE',
      title: 'Rapport mensuel des activites',
      prompt: 'Presenter les activites realises, les resultats, les obstacles et les recommandations.',
      content: buildFallbackMarkdown({
        type: 'RAPPORT',
        variant: 'ACTIVITE',
        title: 'Rapport mensuel des activites',
        prompt: 'Presenter les activites realises, les resultats, les obstacles et les recommandations.',
      }),
      images: [],
      createdAt: now,
      updatedAt: now,
    },
  ]
}
