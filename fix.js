const fs = require('fs');
const file = 'C:/Projet Management UDN/udn/src/components/documents/documents.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'function DashboardView({ onNewDocument, onOpenDocument }: {\n  onNewDocument: () => void;\n  onOpenDocument: (doc: DocumentItem) => void;\n}) {\n  const user = useCurrentUser();',
  'function DashboardView({ onNewDocument, onOpenDocument }: {\n  onNewDocument: () => void;\n  onOpenDocument: (doc: DocumentItem) => void;\n}) {\n  const user = useCurrentUser();\n  const { user: authUser } = useAuth();'
);

content = content.replace(/{doc\.visibility === 'partage' && doc\.employerId !== user\?\.id && \(/g, "{doc.visibility === 'partage' && doc.employerId !== authUser?.employerId && (");
content = content.replace(/{doc\.accessPermission === 'read' && doc\.employerId !== user\?\.id && \(/g, "{doc.accessPermission === 'read' && doc.employerId !== authUser?.employerId && (");

content = content.replace(/bg-gradient-to-br/g, 'bg-linear-to-br');
content = content.replace(/bg-gradient-to-r/g, 'bg-linear-to-r');
content = content.replace(/min-h-\[100px\]/g, 'min-h-25');
content = content.replace(/min-h-\[220px\]/g, 'min-h-55');
content = content.replace(/min-h-\[60px\]/g, 'min-h-15');
content = content.replace(/min-h-\[80px\]/g, 'min-h-20');
content = content.replace(/min-h-\[70px\]/g, 'min-h-17.5');
content = content.replace(/min-h-\[50px\]/g, 'min-h-12.5');
content = content.replace(/min-h-\[90px\]/g, 'min-h-22.5');
content = content.replace(/min-h-\[110px\]/g, 'min-h-27.5');
content = content.replace(/min-h-\[180px\]/g, 'min-h-45');
content = content.replace(/min-h-\[300px\]/g, 'min-h-75');
content = content.replace(/max-h-\[200px\]/g, 'max-h-50');

fs.writeFileSync(file, content);
console.log('Fixed');
