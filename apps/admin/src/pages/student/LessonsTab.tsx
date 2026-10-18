import { useState } from 'react';
import { where } from 'firebase/firestore';
import { CalendarPlus } from 'lucide-react';
import { schoolCol, type Booking } from '@steerly/shared';
import { useLiveCollection } from '../../lib/hooks';
import { useSchoolId } from '../../lib/school';
import { BookingList, BookingModal, BookSlotModal } from '../../components/BookingDialogs';
import { Button, Card } from '../../components/ui';
import type { StudentTabProps } from './StudentProfilePage';

export default function LessonsTab({ student }: StudentTabProps) {
  const schoolId = useSchoolId();
  const { data, loading } = useLiveCollection<Booking>(schoolCol(schoolId, 'bookings'), [where('studentId', '==', student.id)], student.id);
  const [open, setOpen] = useState<Booking | null>(null);
  const [booking, setBooking] = useState(false);

  const now = Date.now();
  const upcoming = data.filter((b) => b.status === 'booked' && b.end.toMillis() >= now).sort((a, b) => a.start.toMillis() - b.start.toMillis());
  const past = data.filter((b) => !upcoming.includes(b)).sort((a, b) => b.start.toMillis() - a.start.toMillis());
  const live = open ? (data.find((b) => b.id === open.id) ?? open) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Upcoming</h3>
          <Button size="sm" icon={CalendarPlus} onClick={() => setBooking(true)} disabled={student.status !== 'active'}>
            Book a slot
          </Button>
        </div>
        <BookingList rows={upcoming} loading={loading} onOpen={setOpen} emptyText="No upcoming lessons" />
      </Card>
      <Card className="p-4 sm:p-5">
        <h3 className="mb-3 text-sm font-bold text-white">History</h3>
        <BookingList rows={past} loading={loading} onOpen={setOpen} emptyText="No past lessons yet" />
      </Card>
      {live && <BookingModal key={live.id + live.status} booking={live} onClose={() => setOpen(null)} />}
      {booking && <BookSlotModal student={student} onClose={() => setBooking(false)} />}
    </div>
  );
}
