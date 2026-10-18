import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { orderBy } from 'firebase/firestore';
import { GraduationCap, Plus } from 'lucide-react';
import { phoneSchema, schoolCol, skillProgress, type Student, type StudentStatus } from '@steerly/shared';
import { call } from '../lib/callables';
import { useLiveCollection } from '../lib/hooks';
import { useSchool, useSchoolId } from '../lib/school';
import { formatINR, downloadCsv, fmt, TEST_STATUS_LABELS } from '../lib/format';
import { Avatar, Badge, Button, FormField, Input, PageHeader, ProgressBar, SearchInput, Select, type Tone } from '../components/ui';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { EnrolFields, emptyEnrol, enrolPayload, type EnrolValues } from '../components/StudentFormFields';

export const STUDENT_STATUS_TONE: Record<StudentStatus, Tone> = { active: 'emerald', completed: 'blue', dropped: 'slate' };

function AddStudentModal({ onClose }: { onClose: () => void }) {
  const schoolId = useSchoolId();
  const toast = useToast();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: '', phone: '', email: '' });
  const [enrol, setEnrol] = useState<EnrolValues>(emptyEnrol);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const phone = phoneSchema.safeParse(f.phone);
    if (f.name.trim().length < 2) return toast.error('Enter the student name.');
    if (!phone.success) return toast.error('Enter a valid 10-digit mobile number.');
    if (!enrol.courseId) return toast.error('Pick a course.');
    setBusy(true);
    try {
      const { studentId } = await call('createStudent', {
        schoolId,
        name: f.name.trim(),
        phone: phone.data,
        email: f.email.trim() || null,
        ...enrolPayload(enrol),
      });
      toast.success('Student added.');
      onClose();
      navigate(`/students/${studentId}`);
    } catch (err) {
      toast.error(err);
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Add student"
      description="They can sign in to the Steerly app with this mobile number."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="student-form" loading={busy}>
            Add student
          </Button>
        </>
      }
    >
      <form id="student-form" onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Full name">
            <Input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
          </FormField>
          <FormField label="Mobile">
            <Input type="tel" inputMode="numeric" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} required placeholder="10 digits" />
          </FormField>
          <FormField label="Email (optional)" className="sm:col-span-2">
            <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </FormField>
        </div>
        <EnrolFields value={enrol} onChange={setEnrol} />
      </form>
    </Modal>
  );
}

export default function StudentsPage() {
  const schoolId = useSchoolId();
  const { courses, instructors } = useSchool();
  const navigate = useNavigate();
  const { data, loading } = useLiveCollection<Student>(schoolCol(schoolId, 'students'), [orderBy('createdAt', 'desc')], 'createdAt');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | StudentStatus>('active');
  const [instructor, setInstructor] = useState('');
  const [course, setCourse] = useState('');
  const [adding, setAdding] = useState(false);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter(
      (s) =>
        (!status || s.status === status) &&
        (!instructor || (instructor === 'none' ? !s.instructorId : s.instructorId === instructor)) &&
        (!course || s.courseId === course) &&
        (!q || s.name.toLowerCase().includes(q) || s.phone.includes(q)),
    );
  }, [data, search, status, instructor, course]);

  const columns: Column<Student>[] = [
    {
      key: 'name',
      header: 'Student',
      cell: (s) => (
        <div className="flex items-center gap-3">
          <Avatar name={s.name} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{s.name}</p>
            <p className="font-mono text-xs text-slate-500">+91 {s.phone}</p>
          </div>
        </div>
      ),
    },
    { key: 'course', header: 'Course', cell: (s) => <span className="text-slate-300">{s.courseName}</span> },
    { key: 'instructor', header: 'Instructor', cell: (s) => s.instructorName ?? <span className="text-slate-600">Unassigned</span>, hideOnMobile: true },
    {
      key: 'progress',
      header: 'Progress',
      cell: (s) => {
        const p = skillProgress(s.skills ?? {});
        return (
          <div className="w-28">
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-slate-400">{s.sessionsCompleted ?? 0}/{s.sessionsTotal ?? 0} lessons</span>
              <span className="font-semibold text-white">{p}%</span>
            </div>
            <ProgressBar value={p} />
          </div>
        );
      },
    },
    {
      key: 'fee',
      header: 'Fee paid',
      cell: (s) => (
        <span className={s.feePaid >= s.feeTotal ? 'text-emerald-300' : 'text-slate-300'}>
          {formatINR(s.feePaid ?? 0)} <span className="text-slate-600">/ {formatINR(s.feeTotal ?? 0)}</span>
        </span>
      ),
    },
    { key: 'll', header: 'LL / DL', cell: (s) => `${TEST_STATUS_LABELS[s.llStatus] ?? '—'} · ${TEST_STATUS_LABELS[s.dlStatus] ?? '—'}`, hideOnMobile: true },
    { key: 'status', header: 'Status', cell: (s) => <Badge tone={STUDENT_STATUS_TONE[s.status] ?? 'slate'}>{s.status}</Badge> },
  ];

  const exportCsv = () =>
    downloadCsv('students.csv', [
      ['Name', 'Phone', 'Course', 'Instructor', 'Status', 'Lessons done', 'Lessons total', 'Fee total (INR)', 'Fee paid (INR)', 'LL', 'DL', 'Enrolled'],
      ...rows.map((s) => [s.name, s.phone, s.courseName, s.instructorName ?? '', s.status, s.sessionsCompleted, s.sessionsTotal, s.feeTotal / 100, s.feePaid / 100, s.llStatus, s.dlStatus, fmt(s.enrolledAt, 'yyyy-MM-dd')]),
    ]);

  return (
    <>
      <PageHeader
        title="Students"
        subtitle={`${data.filter((s) => s.status === 'active').length} active · ${data.length} total`}
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv} disabled={!rows.length}>
              Export CSV
            </Button>
            <Button icon={Plus} onClick={() => setAdding(true)}>
              Add student
            </Button>
          </>
        }
      />
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or phone…" />
        <Select value={status} onChange={(e) => setStatus(e.target.value as '' | StudentStatus)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="dropped">Dropped</option>
        </Select>
        <Select value={instructor} onChange={(e) => setInstructor(e.target.value)}>
          <option value="">All instructors</option>
          <option value="none">Unassigned</option>
          {instructors.map((m) => (
            <option key={m.uid} value={m.uid}>
              {m.name}
            </option>
          ))}
        </Select>
        <Select value={course} onChange={(e) => setCourse(e.target.value)}>
          <option value="">All courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(s) => s.id}
        loading={loading}
        onRowClick={(s) => navigate(`/students/${s.id}`)}
        empty={{
          icon: GraduationCap,
          title: data.length ? 'No students match' : 'No students yet',
          description: data.length ? 'Try clearing the filters.' : 'Convert a lead or add a student directly.',
          action: !data.length && (
            <Button icon={Plus} onClick={() => setAdding(true)}>
              Add student
            </Button>
          ),
        }}
      />
      {adding && <AddStudentModal onClose={() => setAdding(false)} />}
    </>
  );
}
