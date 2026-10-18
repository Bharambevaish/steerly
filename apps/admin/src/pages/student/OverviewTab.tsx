import { useState, type FormEvent } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { Save } from 'lucide-react';
import { phoneSchema, schoolCol, type StudentStatus, type TestStatus } from '@steerly/shared';
import { db } from '../../lib/firebase';
import { useSchool, useSchoolId } from '../../lib/school';
import { fmt, TEST_STATUS_LABELS, toPaise, tsToYmd, ymdToTs } from '../../lib/format';
import { Button, Card, FormField, Input, Select, Textarea } from '../../components/ui';
import { useToast } from '../../components/Toast';
import type { StudentTabProps } from './StudentProfilePage';

const TEST_STATUSES = Object.keys(TEST_STATUS_LABELS) as TestStatus[];

export default function OverviewTab({ student }: StudentTabProps) {
  const schoolId = useSchoolId();
  const { courses, instructors, branches, members } = useSchool();
  const toast = useToast();
  const [f, setF] = useState({
    name: student.name,
    phone: student.phone,
    email: student.email ?? '',
    address: student.address ?? '',
    dob: student.dob ?? '',
    status: student.status,
    courseId: student.courseId,
    instructorId: student.instructorId ?? '',
    branchId: student.branchId ?? '',
    feeTotal: String((student.feeTotal ?? 0) / 100),
    sessionsTotal: String(student.sessionsTotal ?? 0),
    llStatus: student.llStatus ?? 'not_applied',
    llNumber: student.llNumber ?? '',
    llTestDate: tsToYmd(student.llTestDate),
    dlStatus: student.dlStatus ?? 'not_applied',
    dlNumber: student.dlNumber ?? '',
    dlTestDate: tsToYmd(student.dlTestDate),
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  const onCourse = (courseId: string) => {
    const c = courses.find((x) => x.id === courseId);
    setF((x) => ({ ...x, courseId, sessionsTotal: c ? String(c.sessions) : x.sessionsTotal }));
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const phone = phoneSchema.safeParse(f.phone);
    if (!phone.success) return toast.error('Enter a valid 10-digit mobile number.');
    if (f.name.trim().length < 2) return toast.error('Enter a name.');
    const course = courses.find((c) => c.id === f.courseId);
    const instructor = members.find((m) => m.uid === f.instructorId);
    setBusy(true);
    try {
      await updateDoc(doc(db, schoolCol(schoolId, 'students'), student.id), {
        name: f.name.trim(),
        phone: phone.data,
        email: f.email.trim() || null,
        address: f.address.trim() || null,
        dob: f.dob || null,
        status: f.status,
        courseId: f.courseId,
        courseName: course?.name ?? student.courseName,
        instructorId: f.instructorId || null,
        instructorName: instructor?.name ?? null,
        branchId: f.branchId || null,
        feeTotal: toPaise(Number(f.feeTotal) || 0),
        sessionsTotal: Math.max(0, Math.round(Number(f.sessionsTotal) || 0)),
        llStatus: f.llStatus,
        llNumber: f.llNumber.trim() || null,
        llTestDate: ymdToTs(f.llTestDate, '09:00'),
        dlStatus: f.dlStatus,
        dlNumber: f.dlNumber.trim() || null,
        dlTestDate: ymdToTs(f.dlTestDate, '09:00'),
      });
      toast.success('Student updated.');
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4 p-4 sm:p-5">
          <h3 className="text-sm font-bold text-white">Details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name">
              <Input value={f.name} onChange={set('name')} required />
            </FormField>
            <FormField label="Mobile" hint={student.uid ? 'Linked to the app — changing it won’t move the login.' : undefined}>
              <Input type="tel" value={f.phone} onChange={set('phone')} required />
            </FormField>
            <FormField label="Email">
              <Input type="email" value={f.email} onChange={set('email')} />
            </FormField>
            <FormField label="Date of birth">
              <Input type="date" value={f.dob} onChange={set('dob')} />
            </FormField>
            <FormField label="Address" className="sm:col-span-2">
              <Textarea value={f.address} onChange={set('address')} rows={2} />
            </FormField>
          </div>
        </Card>
        <Card className="space-y-4 p-4 sm:p-5">
          <h3 className="text-sm font-bold text-white">Course</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Course" className="sm:col-span-2">
              <Select value={f.courseId} onChange={(e) => onCourse(e.target.value)}>
                {!courses.some((c) => c.id === f.courseId) && <option value={f.courseId}>{student.courseName}</option>}
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Instructor">
              <Select value={f.instructorId} onChange={set('instructorId')}>
                <option value="">Unassigned</option>
                {instructors.map((m) => (
                  <option key={m.uid} value={m.uid}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Branch">
              <Select value={f.branchId} onChange={set('branchId')}>
                <option value="">None</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Total fee (₹)">
              <Input type="number" min={0} value={f.feeTotal} onChange={set('feeTotal')} />
            </FormField>
            <FormField label="Total lessons">
              <Input type="number" min={0} value={f.sessionsTotal} onChange={set('sessionsTotal')} />
            </FormField>
            <FormField label="Status">
              <Select value={f.status} onChange={(e) => setF((x) => ({ ...x, status: e.target.value as StudentStatus }))}>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="dropped">Dropped</option>
              </Select>
            </FormField>
            <FormField label="Enrolled">
              <Input value={fmt(student.enrolledAt)} disabled />
            </FormField>
          </div>
        </Card>
      </div>
      <Card className="p-4 sm:p-5">
        <h3 className="mb-4 text-sm font-bold text-white">Licence</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Learner licence (LL)">
            <Select value={f.llStatus} onChange={(e) => setF((x) => ({ ...x, llStatus: e.target.value as TestStatus }))}>
              {TEST_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {TEST_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="LL number">
            <Input value={f.llNumber} onChange={set('llNumber')} placeholder="MH12 2026…" />
          </FormField>
          <FormField label="LL test date">
            <Input type="date" value={f.llTestDate} onChange={set('llTestDate')} />
          </FormField>
          <FormField label="Driving licence (DL)">
            <Select value={f.dlStatus} onChange={(e) => setF((x) => ({ ...x, dlStatus: e.target.value as TestStatus }))}>
              {TEST_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {TEST_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="DL number">
            <Input value={f.dlNumber} onChange={set('dlNumber')} placeholder="MH12 2026…" />
          </FormField>
          <FormField label="DL test date">
            <Input type="date" value={f.dlTestDate} onChange={set('dlTestDate')} />
          </FormField>
        </div>
      </Card>
      <div className="flex justify-end">
        <Button type="submit" loading={busy} icon={Save}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
