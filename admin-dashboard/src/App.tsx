import { useEffect, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export interface Enquiry {
  id: string;
  name: string;
  phone: string;
  course: string;
  preferredTime: string;
  status: 'New' | 'Contacted' | 'Enrolled';
  createdAt?: Timestamp | null;
}

function formatTimeAgo(timestamp?: Timestamp | null): string {
  if (!timestamp || !timestamp.toDate) return 'Just now';
  const now = Date.now();
  const date = timestamp.toDate().getTime();
  const diffInSeconds = Math.max(0, Math.floor((now - date) / 1000));

  if (diffInSeconds < 60) return 'Just now';
  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function App() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'New' | 'Contacted' | 'Enrolled'>('All');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    // Real-time Firestore subscription ordered by createdAt descending
    const q = query(collection(db, 'enquiries'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: Enquiry[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            name: data.name || 'Anonymous',
            phone: data.phone || '',
            course: data.course || 'Beginner Car Driving',
            preferredTime: data.preferredTime || 'Flexible',
            status: data.status || 'New',
            createdAt: data.createdAt || null,
          });
        });
        setEnquiries(items);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to enquiries:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (
    id: string,
    newStatus: 'New' | 'Contacted' | 'Enrolled'
  ) => {
    setUpdatingId(id);
    try {
      const enquiryDoc = doc(db, 'enquiries', id);
      await updateDoc(enquiryDoc, { status: newStatus });
    } catch (err) {
      console.error('Failed to update enquiry status:', err);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const newCount = enquiries.filter((e) => e.status === 'New').length;
  const contactedCount = enquiries.filter((e) => e.status === 'Contacted').length;
  const enrolledCount = enquiries.filter((e) => e.status === 'Enrolled').length;

  const filteredEnquiries = enquiries.filter((item) => {
    if (filter === 'All') return true;
    return item.status === filter;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-400 text-xl">
              S
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">
                Steerly
              </h1>
              <p className="text-xs text-slate-400">Admin Live Portal</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
              <span className="w-2 h-2 mr-2 rounded-full bg-emerald-400 animate-ping"></span>
              Live Sync
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Summary & Metrics */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/60 border border-slate-800 rounded-2xl p-5 sm:p-6">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Customer Enquiries
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Live submissions from the mobile app. Updates appear automatically without refreshing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <span className="text-2xl font-black text-amber-400">{newCount}</span>
              <div className="text-left">
                <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  New Enquiries
                </p>
                <p className="text-xs text-slate-400">Awaiting contact</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setFilter('All')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'All'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All ({enquiries.length})
          </button>
          <button
            onClick={() => setFilter('New')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              filter === 'New'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            New ({newCount})
          </button>
          <button
            onClick={() => setFilter('Contacted')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              filter === 'Contacted'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            Contacted ({contactedCount})
          </button>
          <button
            onClick={() => setFilter('Enrolled')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              filter === 'Enrolled'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Enrolled ({enrolledCount})
          </button>
        </div>

        {/* Live Enquiries List */}
        {loading ? (
          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-12 text-center">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-slate-400 text-sm">Connecting to Firestore live feed...</p>
          </div>
        ) : filteredEnquiries.length === 0 ? (
          <div className="bg-slate-800/30 border border-slate-800 border-dashed rounded-2xl p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 text-2xl mx-auto mb-3">
              📋
            </div>
            <h3 className="text-base font-semibold text-white mb-1">
              {filter === 'All'
                ? 'No enquiries yet'
                : `No enquiries marked as "${filter}"`}
            </h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              {filter === 'All'
                ? 'When customers submit the enquiry form from the mobile app, their requests will appear here instantly.'
                : 'Try selecting a different filter tab above to view other enquiries.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredEnquiries.map((enquiry) => (
              <div
                key={enquiry.id}
                className="bg-slate-800/70 border border-slate-800 hover:border-slate-700 transition-all rounded-xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Customer Details */}
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-lg font-bold text-white tracking-wide">
                      {enquiry.name}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        enquiry.status === 'New'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : enquiry.status === 'Contacted'
                          ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                          : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {enquiry.status}
                    </span>
                    <span className="text-xs text-slate-500">
                      • {formatTimeAgo(enquiry.createdAt)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs sm:text-sm text-slate-300">
                    <a
                      href={`tel:${enquiry.phone}`}
                      className="inline-flex items-center text-amber-400 hover:text-amber-300 font-mono font-medium hover:underline"
                    >
                      <span className="mr-1">📞</span>
                      {enquiry.phone}
                    </a>
                    <span className="inline-flex items-center text-slate-300">
                      <span className="mr-1">🚗</span>
                      <strong className="text-white font-medium mr-1">Course:</strong>{' '}
                      {enquiry.course}
                    </span>
                    <span className="inline-flex items-center text-slate-300">
                      <span className="mr-1">⏰</span>
                      <strong className="text-white font-medium mr-1">Time:</strong>{' '}
                      {enquiry.preferredTime}
                    </span>
                  </div>
                </div>

                {/* Status Changer Buttons */}
                <div className="flex items-center gap-1.5 self-start md:self-center bg-slate-900/90 border border-slate-700/60 p-1.5 rounded-xl">
                  <span className="text-xs text-slate-400 font-medium px-2 hidden sm:inline">
                    Status:
                  </span>
                  <button
                    disabled={updatingId === enquiry.id}
                    onClick={() => handleStatusChange(enquiry.id, 'New')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      enquiry.status === 'New'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    New
                  </button>
                  <button
                    disabled={updatingId === enquiry.id}
                    onClick={() => handleStatusChange(enquiry.id, 'Contacted')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      enquiry.status === 'Contacted'
                        ? 'bg-blue-500 text-white font-bold shadow'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    Contacted
                  </button>
                  <button
                    disabled={updatingId === enquiry.id}
                    onClick={() => handleStatusChange(enquiry.id, 'Enrolled')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      enquiry.status === 'Enrolled'
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    Enrolled
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        Steerly &copy; {new Date().getFullYear()} • Live Real-time Dashboard
      </footer>
    </div>
  );
}
