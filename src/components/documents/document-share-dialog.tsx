'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Users, Globe, Lock, Share2, Trash2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { DocumentVisibility, DocumentPermission, DocumentShare } from '@/types/document';

interface DocumentShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  currentVisibility: DocumentVisibility;
  currentShares: DocumentShare[];
  onVisibilityChange: (visibility: DocumentVisibility) => void;
  onShareAdd: (employeeId: string, permission: DocumentPermission, expiresAt?: string) => void;
  onShareRemove: (shareId: string) => void;
  employees: Array<{ id: string; firstName: string; lastName: string; email: string; poste: string }>;
  currentUserId: string;
}

export function DocumentShareDialog({
  open,
  onOpenChange,
  documentId,
  currentVisibility,
  currentShares,
  onVisibilityChange,
  onShareAdd,
  onShareRemove,
  employees,
  currentUserId,
}: DocumentShareDialogProps) {
  const [visibility, setVisibility] = useState<DocumentVisibility>(currentVisibility);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [permission, setPermission] = useState<DocumentPermission>('read');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    setVisibility(currentVisibility);
  }, [currentVisibility]);

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.id !== currentUserId &&
      !currentShares.some((share) => share.sharedWithId === emp.id) &&
      (emp.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddShare = () => {
    if (!selectedEmployee) {
      toast({ title: 'Erreur', description: 'Veuillez sélectionner un employé', variant: 'destructive' });
      return;
    }
    onShareAdd(selectedEmployee, permission, expiresAt || undefined);
    setSelectedEmployee('');
    setPermission('read');
    setExpiresAt('');
    setSearchQuery('');
    toast({ title: 'Partage ajouté', description: 'Le document a été partagé avec succès' });
  };

  const handleVisibilityChange = (newVisibility: DocumentVisibility) => {
    setVisibility(newVisibility);
    onVisibilityChange(newVisibility);
    toast({ title: 'Visibilité mise à jour', description: `Le document est maintenant ${newVisibility === 'public' ? 'public' : newVisibility === 'prive' ? 'privé' : 'partagé'}` });
  };

  const getVisibilityIcon = (v: DocumentVisibility) => {
    switch (v) {
      case 'public':
        return <Globe className="w-4 h-4" />;
      case 'prive':
        return <Lock className="w-4 h-4" />;
      case 'partage':
        return <Users className="w-4 h-4" />;
    }
  };

  const getVisibilityLabel = (v: DocumentVisibility) => {
    switch (v) {
      case 'public':
        return 'Public';
      case 'prive':
        return 'Privé';
      case 'partage':
        return 'Partagé';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Partager le document
          </DialogTitle>
          <DialogDescription>
            Gérez la visibilité et les permissions d'accès à ce document
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Visibilité */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Visibilité du document</Label>
            <div className="grid grid-cols-3 gap-3">
              {(['prive', 'public', 'partage'] as DocumentVisibility[]).map((v) => (
                <button
                  key={v}
                  onClick={() => handleVisibilityChange(v)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    visibility === v
                      ? 'border-violet-500 bg-violet-50 text-violet-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  {getVisibilityIcon(v)}
                  <span className="text-sm font-medium">{getVisibilityLabel(v)}</span>
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-500">
              {visibility === 'prive' && 'Seul vous pouvez accéder à ce document'}
              {visibility === 'public' && 'Tous les employés peuvent accéder à ce document'}
              {visibility === 'partage' && 'Seules les personnes sélectionnées peuvent accéder à ce document'}
            </div>
          </div>

          {/* Partages spécifiques */}
          {visibility === 'partage' && (
            <div className="space-y-4">
              <Label className="text-sm font-semibold">Partager avec des personnes spécifiques</Label>

              {/* Liste des partages actuels */}
              {currentShares.length > 0 && (
                <div className="space-y-2">
                  {currentShares.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-semibold">
                          {share.sharedWith?.firstName?.[0]}{share.sharedWith?.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {share.sharedWith?.firstName} {share.sharedWith?.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{share.sharedWith?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={share.permission === 'write' ? 'default' : 'secondary'}>
                          {share.permission === 'write' ? 'Écriture' : 'Lecture seule'}
                        </Badge>
                        {share.expiresAt && (
                          <span className="text-xs text-gray-400">
                            Expire: {new Date(share.expiresAt).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onShareRemove(share.id)}
                          className="h-8 w-8 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Ajouter un partage */}
              <div className="p-4 border rounded-lg space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher un employé..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {searchQuery && filteredEmployees.length > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {filteredEmployees.map((emp) => (
                      <button
                        key={emp.id}
                        onClick={() => {
                          setSelectedEmployee(emp.id);
                          setSearchQuery('');
                        }}
                        className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-semibold text-sm">
                          {emp.firstName[0]}{emp.lastName[0]}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{emp.email}</p>
                        </div>
                        <p className="text-xs text-gray-400">{emp.poste}</p>
                      </button>
                    ))}
                  </div>
                )}

                {selectedEmployee && (
                  <div className="flex items-center gap-2 p-2 bg-violet-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-semibold text-sm">
                      {employees.find((e) => e.id === selectedEmployee)?.firstName[0]}
                      {employees.find((e) => e.id === selectedEmployee)?.lastName[0]}
                    </div>
                    <span className="text-sm font-medium flex-1">
                      {employees.find((e) => e.id === selectedEmployee)?.firstName}{' '}
                      {employees.find((e) => e.id === selectedEmployee)?.lastName}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedEmployee('')}
                      className="h-6 w-6"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label className="text-xs text-gray-500 mb-1">Permission</Label>
                    <Select value={permission} onValueChange={(v: DocumentPermission) => setPermission(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="read">Lecture seule</SelectItem>
                        <SelectItem value="write">Écriture</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-gray-500 mb-1">Expiration (optionnel)</Label>
                    <Input
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleAddShare}
                  disabled={!selectedEmployee}
                  className="w-full"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Partager
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
