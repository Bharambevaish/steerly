import type { Course } from '@steerly/shared';
import { instructorLabel, useSchool } from '../lib/school';
import { formatINR } from '../lib/format';
import type { EnrolValues } from '../lib/enrol';
import { FormField, Input, Select } from './ui';

/** Course / instructor / branch / fee override fields shared by "Add student" and "Convert lead". */
export function EnrolFields({ value, onChange }: { value: EnrolValues; onChange: (v: EnrolValues) => void }) {
  const { courses, instructors, branches } = useSchool();
  const active = courses.filter((c) => c.active !== false);
  const course: Course | undefined = courses.find((c) => c.id === value.courseId);

  const set = (k: keyof EnrolValues) => (e: { target: { value: string } }) => onChange({ ...value, [k]: e.target.value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField label="Course" className="sm:col-span-2" hint={active.length === 0 ? 'Add a course first under Setup → Courses.' : course ? `${course.sessions} sessions · ${formatINR(course.price)}` : undefined}>
        <Select value={value.courseId} onChange={set('courseId')} required>
          <option value="">Select course</option>
          {active.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Instructor" hint={instructors.length === 0 ? 'Nobody gives lessons yet — invite an instructor or switch on “Also gives lessons” on the Team page.' : undefined}>
        <Select value={value.instructorId} onChange={set('instructorId')}>
          <option value="">Assign later</option>
          {instructors.map((m) => (
            <option key={m.uid} value={m.uid}>
              {instructorLabel(m)}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Branch">
        <Select value={value.branchId} onChange={set('branchId')}>
          <option value="">{branches.length ? 'Main / none' : 'No branches'}</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Fee (₹)" className="sm:col-span-2" hint={course ? `Leave empty to use the course price (${formatINR(course.price)}). Lower it for a discount.` : undefined}>
        <Input type="number" min={0} step="0.01" inputMode="decimal" placeholder={course ? String(course.price / 100) : '0'} value={value.fee} onChange={set('fee')} />
      </FormField>
    </div>
  );
}
