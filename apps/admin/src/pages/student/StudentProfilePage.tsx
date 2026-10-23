import { lazy, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, CalendarDays, FileText, Gauge, IndianRupee, MessageCircle, Phone, UserRound } from 'lucide-react';
import { schoolCol, skillProgress, type Student } from '@steerly/shared';
import { useLiveDoc } from '../../lib/hooks';
import { useSchoolId } from '../../lib/school';
import { formatINR, telLink, waLink } from '../../lib/format';
import { Avatar, Badge, Button, EmptyState, FullPageSpinner, ProgressBar, Tabs } from '../../components/ui';
import { STUDENT_STATUS_TONE } from '../../lib/labels';
import OverviewTab from './OverviewTab';

const LessonsTab = lazy(() => import('./LessonsTab'));
const SkillsTab = lazy(() => import('./SkillsTab'));
const PaymentsTab = lazy(() => import('./PaymentsTab'));
const DocumentsTab = lazy(() => import('./DocumentsTab'));

type Tab = 'overview' | 'lessons' | 'skills' | 'payments' | 'documents';

export interface StudentTabProps {
  student: Student;
}

export default function StudentProfilePage() {
  const { studentId = '' } = useParams();
  const schoolId = useSchoolId();
  const { data: student, loading } = useLiveDoc<Student>(`${schoolCol(schoolId, 'students')}/${studentId}`);
  const [tab, setTab] = useState<Tab>('overview');

  if (loading) return <FullPageSpinner />;
  if (!student)
    return (
      <EmptyState
        icon={UserRound}
        title="Student not found"
        action={
          <Link to="/students">
            <Button variant="secondary">Back to students</Button>
          </Link>
        }
      />
    );

  const progress = skillProgress(student.skills ?? {});
  const due = Math.max(0, (student.feeTotal ?? 0) - (student.feePaid ?? 0));

  return (
    <>
      <Link to="/students" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Students
      </Link>
      <div className="card mb-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar name={student.name} className="h-14 w-14 text-lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold text-white">{student.name}</h1>
              <Badge tone={STUDENT_STATUS_TONE[student.status] ?? 'slate'}>{student.status}</Badge>
              {student.uid ? <Badge tone="emerald">App linked</Badge> : <Badge>Not on app yet</Badge>}
            </div>
            <p className="mt-0.5 text-sm text-slate-400">
              {student.courseName} · {student.instructorName ?? 'No instructor'} · <span className="font-mono">+91 {student.phone}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <a href={telLink(student.phone)}>
              <Button variant="secondary" size="sm" icon={Phone}>
                Call
              </Button>
            </a>
            <a href={waLink(student.phone)} target="_blank" rel="noreferrer">
              <Button variant="success" size="sm" icon={MessageCircle}>
                WhatsApp
              </Button>
            </a>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl bg-slate-900/70 p-3">
            <p className="text-xs text-slate-500">Lessons</p>
            <p className="text-lg font-bold text-white">
              {student.sessionsCompleted ?? 0}
              <span className="text-sm text-slate-500"> / {student.sessionsTotal ?? 0}</span>
            </p>
          </div>
          <div className="rounded-xl bg-slate-900/70 p-3">
            <p className="text-xs text-slate-500">Skills</p>
            <p className="text-lg font-bold text-white">{progress}%</p>
            <ProgressBar value={progress} className="mt-1 h-1.5" />
          </div>
          <div className="rounded-xl bg-slate-900/70 p-3">
            <p className="text-xs text-slate-500">Paid</p>
            <p className="text-lg font-bold text-emerald-300">{formatINR(student.feePaid ?? 0)}</p>
          </div>
          <div className="rounded-xl bg-slate-900/70 p-3">
            <p className="text-xs text-slate-500">Due</p>
            <p className={due > 0 ? 'text-lg font-bold text-amber-300' : 'text-lg font-bold text-white'}>{formatINR(due)}</p>
          </div>
        </div>
      </div>

      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Overview', icon: UserRound },
          { id: 'lessons', label: 'Lessons', icon: CalendarDays },
          { id: 'skills', label: 'Skills', icon: Gauge },
          { id: 'payments', label: 'Payments', icon: IndianRupee },
          { id: 'documents', label: 'Documents', icon: FileText },
        ]}
      />
      {tab === 'overview' && <OverviewTab key={student.id} student={student} />}
      {tab === 'lessons' && <LessonsTab student={student} />}
      {tab === 'skills' && <SkillsTab student={student} />}
      {tab === 'payments' && <PaymentsTab student={student} />}
      {tab === 'documents' && <DocumentsTab student={student} />}
    </>
  );
}
