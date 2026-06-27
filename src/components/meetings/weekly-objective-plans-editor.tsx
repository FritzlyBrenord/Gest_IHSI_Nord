'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OBJECTIVE_STATUS_LABELS, type WeeklyObjectivePlan, type WeeklyObjective, type WeeklyObjectiveStatus } from '@/lib/weekly-objectives';

interface WeeklyObjectivePlansEditorProps {
  plans: WeeklyObjectivePlan[];
  employees?: any[];
  teams?: any[];
  departments?: any[];
  onChange: (plans: WeeklyObjectivePlan[]) => void;
}

export function WeeklyObjectivePlansEditor({ plans, onChange }: WeeklyObjectivePlansEditorProps) {
  const addPlan = () => {
    const newPlan: WeeklyObjectivePlan = {
      id: crypto.randomUUID(),
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      objectives: [],
    };
    onChange([...plans, newPlan]);
  };

  const removePlan = (planId: string) => {
    onChange(plans.filter((p) => p.id !== planId));
  };

  const addObjective = (planId: string) => {
    const newPlans = plans.map((plan) => {
      if (plan.id === planId) {
        return {
          ...plan,
          objectives: [
            ...plan.objectives,
            { id: crypto.randomUUID(), title: '', status: 'NON_COMMENCE' },
          ],
        };
      }
      return plan;
    });
    onChange(newPlans);
  };

  const updateObjective = (planId: string, objectiveId: string, updates: Partial<WeeklyObjective>) => {
    const newPlans = plans.map((plan) => {
      if (plan.id === planId) {
        return {
          ...plan,
          objectives: plan.objectives.map((obj) =>
            obj.id === objectiveId ? { ...obj, ...updates } : obj
          ),
        };
      }
      return plan;
    });
    onChange(newPlans);
  };

  const removeObjective = (planId: string, objectiveId: string) => {
    const newPlans = plans.map((plan) => {
      if (plan.id === planId) {
        return {
          ...plan,
          objectives: plan.objectives.filter((obj) => obj.id !== objectiveId),
        };
      }
      return plan;
    });
    onChange(newPlans);
  };

  const updatePlanDates = (planId: string, field: 'startsAt' | 'endsAt', value: string) => {
    const newPlans = plans.map((plan) => {
      if (plan.id === planId) {
        return { ...plan, [field]: value };
      }
      return plan;
    });
    onChange(newPlans);
  };

  return (
    <div className="space-y-6">
      {plans.map((plan, planIndex) => (
        <div key={plan.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Plan Hebdomadaire {planIndex + 1}</h3>
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => removePlan(plan.id)}>
              <Trash2 className="h-4 w-4 mr-2" /> Supprimer le plan
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date de début</Label>
              <Input
                type="date"
                value={plan.startsAt ? new Date(plan.startsAt).toISOString().split('T')[0] : ''}
                onChange={(e) => updatePlanDates(plan.id, 'startsAt', new Date(e.target.value).toISOString())}
              />
            </div>
            <div className="space-y-2">
              <Label>Date de fin</Label>
              <Input
                type="date"
                value={plan.endsAt ? new Date(plan.endsAt).toISOString().split('T')[0] : ''}
                onChange={(e) => updatePlanDates(plan.id, 'endsAt', new Date(e.target.value).toISOString())}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Objectifs de ce plan</Label>
            {plan.objectives.map((objective) => (
              <div key={objective.id} className="flex items-start gap-2 bg-white p-3 rounded-lg border">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Titre de l'objectif..."
                    value={objective.title}
                    onChange={(e) => updateObjective(plan.id, objective.id, { title: e.target.value })}
                  />
                </div>
                <div className="w-48">
                  <Select
                    value={objective.status}
                    onValueChange={(val) => updateObjective(plan.id, objective.id, { status: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(OBJECTIVE_STATUS_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => removeObjective(plan.id, objective.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            <Button type="button" variant="outline" size="sm" className="w-full mt-2 border-dashed" onClick={() => addObjective(plan.id)}>
              <Plus className="mr-2 h-4 w-4" /> Ajouter un objectif à ce plan
            </Button>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" className="w-full border-dashed" onClick={addPlan}>
        <Plus className="mr-2 h-4 w-4" /> Ajouter un nouveau plan hebdomadaire
      </Button>
    </div>
  );
}
