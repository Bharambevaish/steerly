import { useState, type FormEvent } from 'react';
import { collection, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { BookOpen, Clock, Pencil, Plus, Trash2 } from 'lucide-react';
import { schoolCol, type Course, type VehicleType } from '@steerly/shared';
import { db } from '../lib/firebase';
import { useSchool, useSchoolId } from '../lib/school';
import { formatINR, toPaise, VEHICLE_TYPE_LABELS } from '../lib/format';
import { Badge, Button, Card, EmptyState, FormField, IconButton, Input, PageHeader, Select, Textarea, Toggle } from '../components/ui';
import { ConfirmDialog, Modal } from '../components/Modal';
import { useToast } from '../components/Toast';

function CourseModal({ course, nextOrder, onClose }: { course: Course | null; nextOrder: number; onClose: () => void }) {
  const schoolId = useSchoolId();
  const toast = useToast();
  const [f, setF] = useState({
    name: course?.name ?? '',
    description: course?.description ?? '',
    vehicleType: (course?.vehicleType ?? 'car_manual') as VehicleType,
    sessions: String(course?.sessions ?? 15),
    sessionMinutes: String(course?.sessionMinutes ?? 60),
    price: course ? String(course.price / 100) : '',
    active: course?.active ?? true,
    order: String(course?.order ?? nextOrder),
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (f.name.trim().length < 2) return toast.error('Enter a course name.');
    const price = toPaise(Number(f.price));
    if (!(price >= 0)) return toast.error('Enter a price.');
    setBusy(true);
    try {
      const ref = course ? doc(db, schoolCol(schoolId, 'courses'), course.id) : doc(collection(db, schoolCol(schoolId, 'courses')));
      const data: Course = {
        id: ref.id,
        name: f.name.trim().slice(0, 80),
        description: f.description.trim(),
        vehicleType: f.vehicleType,
        sessions: Math.max(1, Math.round(Number(f.sessions) || 1)),
        sessionMinutes: Math.max(15, Math.round(Number(f.sessionMinutes) || 60)),
        price,
        active: f.active,
        order: Math.round(Number(f.order) || 0),
      };
      await setDoc(ref, data);
      toast.success(course ? 'Course updated.' : 'Course added.');
      onClose();
    } catch (err) {
      toast.error(err);
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={course ? 'Edit course' : 'New course'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="course-form" loading={busy}>
            Save
          </Button>
        </>
      }
    >
      <form id="course-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <FormField label="Name" className="sm:col-span-2">
          <Input autoFocus value={f.name} onChange={set('name')} placeholder="Beginner Car Driving" required />
        </FormField>
        <FormField label="Description" className="sm:col-span-2">
          <Textarea value={f.description} onChange={set('description')} rows={3} placeholder="What students learn, who it's for…" />
        </FormField>
        <FormField label="Vehicle">
          <Select value={f.vehicleType} onChange={set('vehicleType')}>
            {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Price (₹)">
          <Input type="number" min={0} step="0.01" inputMode="decimal" value={f.price} onChange={set('price')} required placeholder="4500" />
        </FormField>
        <FormField label="Lessons">
          <Input type="number" min={1} value={f.sessions} onChange={set('sessions')} />
        </FormField>
        <FormField label="Minutes per lesson">
          <Input type="number" min={15} step={15} value={f.sessionMinutes} onChange={set('sessionMinutes')} />
        </FormField>
        <FormField label="Display order" hint="Lower shows first">
          <Input type="number" value={f.order} onChange={set('order')} />
        </FormField>
        <div className="flex items-end pb-2">
          <Toggle checked={f.active} onChange={(v) => setF((x) => ({ ...x, active: v }))} label="Visible to students" />
        </div>
      </form>
    </Modal>
  );
}

export default function CoursesPage() {
  const schoolId = useSchoolId();
  const { courses } = useSchool();
  const toast = useToast();
  const [editing, setEditing] = useState<Course | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Course | null>(null);

  return (
    <>
      <PageHeader
        title="Courses"
        subtitle="Packages students can enquire about and enrol in. Prices are public on your school page."
        actions={
          <Button icon={Plus} onClick={() => setEditing('new')}>
            New course
          </Button>
        }
      />
      {courses.length === 0 ? (
        <EmptyState icon={BookOpen} title="No courses yet" description="Add your first package — e.g. 15 lessons of manual car training." action={<Button icon={Plus} onClick={() => setEditing('new')}>New course</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => (
            <Card key={c.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold text-white">{c.name}</h3>
                  <p className="text-xs text-slate-500">{VEHICLE_TYPE_LABELS[c.vehicleType] ?? c.vehicleType}</p>
                </div>
                {c.active === false ? <Badge>Hidden</Badge> : <Badge tone="emerald">Live</Badge>}
              </div>
              {c.description && <p className="mt-3 line-clamp-3 text-sm text-slate-400">{c.description}</p>}
              <div className="mt-auto flex items-end justify-between pt-4">
                <div>
                  <p className="text-2xl font-black text-white">{formatINR(c.price)}</p>
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5" /> {c.sessions} × {c.sessionMinutes} min
                  </p>
                </div>
                <div className="flex">
                  <IconButton icon={Pencil} label="Edit" onClick={() => setEditing(c)} />
                  <IconButton icon={Trash2} label="Delete" onClick={() => setToDelete(c)} className="hover:text-red-300" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing && <CourseModal course={editing === 'new' ? null : editing} nextOrder={courses.length} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        danger
        title="Delete course?"
        message={`"${toDelete?.name}" will be removed. Existing students keep their course name. Consider hiding it instead.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          try {
            await deleteDoc(doc(db, schoolCol(schoolId, 'courses'), toDelete!.id));
            toast.success('Course deleted.');
          } catch (err) {
            toast.error(err);
            throw err;
          }
        }}
      />
    </>
  );
}
