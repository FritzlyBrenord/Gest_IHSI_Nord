import { createUploadthing, type FileRouter } from 'uploadthing/next';

const f = createUploadthing();

export const ourFileRouter = {
  trainingDocumentUploader: f({
    pdf: { maxFileSize: '32MB', maxFileCount: 10 },
    'application/msword': { maxFileSize: '16MB', maxFileCount: 10 },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { maxFileSize: '16MB', maxFileCount: 10 },
    'application/vnd.ms-powerpoint': { maxFileSize: '32MB', maxFileCount: 10 },
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': { maxFileSize: '32MB', maxFileCount: 10 },
    'application/vnd.ms-excel': { maxFileSize: '16MB', maxFileCount: 10 },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { maxFileSize: '16MB', maxFileCount: 10 },
    image: { maxFileSize: '8MB', maxFileCount: 10 },
    text: { maxFileSize: '4MB', maxFileCount: 10 },
  })
    .middleware(async () => {
      return {};
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.url, key: file.key, name: file.name, size: file.size };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
