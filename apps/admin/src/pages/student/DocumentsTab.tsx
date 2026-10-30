import { useRef, useState } from 'react';
import { collection, deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { Eye, FileText, Trash2, Upload } from 'lucide-react';
import { studentDocumentsCol, studentFilePath, type DocumentType, type StudentDocument } from '@steerly/shared';
import { db, storage } from '../../lib/firebase';
import { useLiveCollection } from '../../lib/hooks';
import { useSchoolId } from '../../lib/school';
import { fmt } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { Badge, Button, Card, EmptyState, IconButton, Select, Skeleton, Toggle } from '../../components/ui';
import { ConfirmDialog } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import type { StudentTabProps } from './StudentProfilePage';

const DOC_TYPES: Record<DocumentType, string> = {
  photo: 'Photo',
  id_proof: 'ID proof (Aadhaar / PAN)',
  address_proof: 'Address proof',
  medical: 'Medical certificate',
  learner_licence: 'Learner licence',
  driving_licence: 'Driving licence',
  other: 'Other',
};

const MAX_MB = 10;

export default function DocumentsTab({ student }: StudentTabProps) {
  const schoolId = useSchoolId();
  const { user } = useAuth();
  const toast = useToast();
  const col = studentDocumentsCol(schoolId, student.id);
  const { data, loading } = useLiveCollection<StudentDocument>(col);
  const [type, setType] = useState<DocumentType>('id_proof');
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<StudentDocument | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const rows = [...data].sort((a, b) => (b.uploadedAt?.toMillis() ?? 0) - (a.uploadedAt?.toMillis() ?? 0));

  const upload = async (file: File) => {
    if (!user) return;
    if (!/^image\/|^application\/pdf$/.test(file.type)) return toast.error('Upload an image or PDF.');
    if (file.size >= MAX_MB * 1024 * 1024) return toast.error(`Files must be under ${MAX_MB} MB.`);
    setUploading(true);
    try {
      const docRef = doc(collection(db, col));
      const path = studentFilePath(schoolId, student.id, docRef.id, file.name);
      await uploadBytes(storageRef(storage, path), file, { contentType: file.type });
      await setDoc(docRef, {
        id: docRef.id,
        type,
        fileName: file.name,
        contentType: file.type,
        storagePath: path,
        verified: false,
        uploadedBy: user.uid,
        uploadedAt: serverTimestamp(),
      });
      toast.success('Document uploaded.');
    } catch (err) {
      toast.error(err);
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  };

  const view = async (d: StudentDocument) => {
    const win = window.open('', '_blank');
    if (win) win.opener = null; // no link back to the dashboard (reverse tabnabbing)
    try {
      const url = await getDownloadURL(storageRef(storage, d.storagePath));
      if (win) win.location.href = url;
      else window.location.assign(url);
    } catch (err) {
      win?.close();
      toast.error(err);
    }
  };

  const setVerified = (d: StudentDocument, verified: boolean) => updateDoc(doc(db, col, d.id), { verified }).catch((e) => toast.error(e));

  const remove = async (d: StudentDocument) => {
    try {
      await deleteObject(storageRef(storage, d.storagePath)).catch(() => undefined);
      await deleteDoc(doc(db, col, d.id));
      toast.success('Document deleted.');
    } catch (err) {
      toast.error(err);
      throw err;
    }
  };

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:p-5">
        <div className="flex-1">
          <p className="mb-1.5 text-xs font-semibold text-slate-300">Document type</p>
          <Select value={type} onChange={(e) => setType(e.target.value as DocumentType)}>
            {Object.entries(DOC_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
        <input ref={input} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        <Button icon={Upload} loading={uploading} onClick={() => input.current?.click()}>
          Upload file
        </Button>
      </Card>

      {loading ? (
        <Skeleton className="h-32" />
      ) : rows.length === 0 ? (
        <EmptyState icon={FileText} title="No documents yet" description={`Upload ID, address proof or licence scans (image or PDF, up to ${MAX_MB} MB). Students can also upload from the app.`} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((d) => (
            <Card key={d.id} className="flex items-center gap-3 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-white">{DOC_TYPES[d.type] ?? d.type}</p>
                  {d.verified ? <Badge tone="emerald">Verified</Badge> : <Badge tone="amber">Pending</Badge>}
                </div>
                <p className="truncate text-xs text-slate-500">
                  {d.fileName} · {fmt(d.uploadedAt)}
                </p>
              </div>
              <Toggle checked={d.verified} onChange={(v) => setVerified(d, v)} />
              <IconButton icon={Eye} label="View" onClick={() => view(d)} />
              <IconButton icon={Trash2} label="Delete" onClick={() => setToDelete(d)} className="hover:text-red-300" />
            </Card>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && remove(toDelete)}
        danger
        title="Delete document?"
        message={`${toDelete?.fileName ?? ''} will be removed permanently.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
