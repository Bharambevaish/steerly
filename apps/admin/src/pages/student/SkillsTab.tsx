import { doc, updateDoc } from 'firebase/firestore';
import clsx from 'clsx';
import { schoolCol, SKILL_LEVEL_LABELS, SKILLS, skillProgress, type SkillLevel } from '@steerly/shared';
import { db } from '../../lib/firebase';
import { useSchoolId } from '../../lib/school';
import { Card, ProgressBar } from '../../components/ui';
import { useToast } from '../../components/Toast';
import type { StudentTabProps } from './StudentProfilePage';

const LEVELS: SkillLevel[] = [0, 1, 2, 3];

export default function SkillsTab({ student }: StudentTabProps) {
  const schoolId = useSchoolId();
  const toast = useToast();
  const skills = student.skills ?? {};

  const setLevel = async (id: string, level: SkillLevel) => {
    try {
      await updateDoc(doc(db, schoolCol(schoolId, 'students'), student.id), { [`skills.${id}`]: level });
    } catch (err) {
      toast.error(err);
    }
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-5 flex items-center gap-4">
        <div className="flex-1">
          <h3 className="text-sm font-bold text-white">Driving skills</h3>
          <p className="text-xs text-slate-500">Instructors update these after each lesson. Tap a level to change it.</p>
        </div>
        <div className="w-32 text-right">
          <p className="text-2xl font-black text-white">{skillProgress(skills)}%</p>
          <ProgressBar value={skillProgress(skills)} className="mt-1" />
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {SKILLS.map((s) => {
          const lvl = skills[s.id] ?? 0;
          return (
            <div key={s.id} className="rounded-xl border border-slate-800 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">{s.label}</p>
                <span className="text-xs text-slate-400">{SKILL_LEVEL_LABELS[lvl]}</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {LEVELS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    title={SKILL_LEVEL_LABELS[l]}
                    onClick={() => setLevel(s.id, l)}
                    className={clsx('h-2.5 rounded-full transition', l === 0 ? (lvl === 0 ? 'bg-slate-500' : 'bg-slate-800 hover:bg-slate-700') : l <= lvl ? 'bg-brand' : 'bg-slate-800 hover:bg-slate-700')}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
