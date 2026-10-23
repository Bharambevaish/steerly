import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { collection, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { studentDocumentsCol, studentFilePath, type DocumentType, type StudentDocument } from '@steerly/shared';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useMyDocuments } from '@/lib/data';
import { errorMessage } from '@/lib/callables';
import { confirmAsync, openUrl } from '@/lib/device';
import { fmtDate } from '@/lib/format';
import type { WithId } from '@/lib/live';
import { Badge, Banner, Button, Card, Chip, EmptyState, Icon, IconButton, Row, Screen, Sheet, SkeletonList, Text, useTheme, useToast } from '@/ui';

const TYPES: { id: DocumentType; label: string }[] = [
  { id: 'photo', label: 'Photo' },
  { id: 'id_proof', label: 'ID proof' },
  { id: 'address_proof', label: 'Address proof' },
  { id: 'medical', label: 'Medical cert.' },
  { id: 'learner_licence', label: 'Learner’s licence' },
  { id: 'driving_licence', label: 'Driving licence' },
  { id: 'other', label: 'Other' },
];
const typeLabel = (id?: string) => TYPES.find((x) => x.id === id)?.label ?? 'Document';
const MAX_BYTES = 10 * 1024 * 1024;

interface Picked {
  uri: string;
  name: string;
  mimeType: string;
  size?: number | null;
}

export default function Documents() {
  const t = useTheme();
  const toast = useToast();
  const { user, claims } = useAuth();
  const docs = useMyDocuments();
  const [sheet, setSheet] = useState(false);
  const [type, setType] = useState<DocumentType>('id_proof');
  const [uploading, setUploading] = useState(false);

  const upload = async (file: Picked) => {
    if (!user || !claims.schoolId || !claims.studentId) return;
    if (!/^image\/|^application\/pdf$/.test(file.mimeType)) {
      toast.error('Please choose a photo or a PDF.');
      return;
    }
    if (file.size && file.size > MAX_BYTES) {
      toast.error('That file is over 10 MB. Try a smaller one.');
      return;
    }
    setUploading(true);
    try {
      const metaRef = doc(collection(db, studentDocumentsCol(claims.schoolId, claims.studentId)));
      const path = studentFilePath(claims.schoolId, claims.studentId, metaRef.id, file.name);
      const blob = await (await fetch(file.uri)).blob();
      if (blob.size > MAX_BYTES) throw new Error('That file is over 10 MB. Try a smaller one.');
      await uploadBytes(ref(storage, path), blob, { contentType: file.mimeType });
      await setDoc(metaRef, {
        id: metaRef.id,
        type,
        fileName: file.name,
        contentType: file.mimeType,
        storagePath: path,
        verified: false,
        uploadedBy: user.uid,
        uploadedAt: serverTimestamp(),
      });
      toast.success('Uploaded. Your school will verify it.');
      setSheet(false);
    } catch (e) {
      toast.error(errorMessage(e, 'Upload failed. Please try again.'));
    } finally {
      setUploading(false);
    }
  };

  const pickPhoto = async (camera: boolean) => {
    try {
      // The browser's file chooser needs no permission prompt.
      if (Platform.OS !== 'web') {
        const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          toast.error(camera ? 'Camera permission is needed to take a photo.' : 'Photo access is needed to pick a photo.');
          return;
        }
      }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
      const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      const a = res.canceled ? null : res.assets[0];
      if (!a) return;
      const mime = a.mimeType ?? 'image/jpeg';
      await upload({ uri: a.uri, name: a.fileName ?? `photo-${Date.now()}.${mime.split('/')[1] ?? 'jpg'}`, mimeType: mime, size: a.fileSize });
    } catch (e) {
      toast.error(e);
    }
  };

  const pickPdf = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
      const a = res.canceled ? null : res.assets[0];
      if (!a) return;
      await upload({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'application/pdf', size: a.size });
    } catch (e) {
      toast.error(e);
    }
  };

  const view = async (d: WithId<Partial<StudentDocument>>) => {
    if (!d.storagePath) return;
    try {
      await openUrl(await getDownloadURL(ref(storage, d.storagePath)));
    } catch (e) {
      toast.error(errorMessage(e, 'Couldn’t open that file.'));
    }
  };

  const remove = async (d: WithId<Partial<StudentDocument>>) => {
    if (!claims.schoolId || !claims.studentId) return;
    const schoolId = claims.schoolId;
    const studentId = claims.studentId;
    if (!(await confirmAsync('Delete document?', d.fileName ?? 'This file', 'Delete', true))) return;
    try {
      if (d.storagePath) await deleteObject(ref(storage, d.storagePath)).catch(() => {});
      await deleteDoc(doc(db, studentDocumentsCol(schoolId, studentId), d.id));
      toast.success('Deleted');
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Screen back title="Documents" onRefresh={() => docs.refetch()} footer={<Button title="Upload a document" icon="upload" onPress={() => setSheet(true)} />}>
      {docs.error && !docs.data.length ? <Banner tone="danger" text="Couldn’t load this. Pull down to retry." /> : null}
      {docs.loading ? (
        <SkeletonList count={3} h={72} />
      ) : docs.data.length === 0 ? (
        <EmptyState icon="file" title="No documents yet" body="Upload your ID proof, address proof and a photo so your school can file your licence application." />
      ) : (
        docs.data.map((d) => (
          <Card key={d.id} onPress={() => view(d)}>
            <Row>
              <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: t.c.brandSoft }}>
                <Icon name={d.contentType?.startsWith('image/') ? 'image' : 'file'} size={20} color={t.c.brand} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {typeLabel(d.type)}
                </Text>
                <Text variant="caption" muted numberOfLines={1}>
                  {d.fileName ?? ''} · {fmtDate(d.uploadedAt)}
                </Text>
                <Badge label={d.verified ? 'Verified' : 'Pending review'} tone={d.verified ? 'success' : 'warning'} />
              </View>
              {!d.verified ? <IconButton icon="trash" label="Delete document" color={t.c.danger} onPress={() => remove(d)} /> : null}
            </Row>
          </Card>
        ))
      )}

      <Sheet visible={sheet} onClose={() => !uploading && setSheet(false)} title="Upload document">
        <Text variant="caption" muted>
          What is it?
        </Text>
        <Row wrap gap={8}>
          {TYPES.map((x) => (
            <Chip key={x.id} label={x.label} selected={type === x.id} onPress={() => setType(x.id)} />
          ))}
        </Row>
        <Text variant="caption" faint>
          Photos or PDFs, up to 10 MB.
        </Text>
        {Platform.OS !== 'web' ? <Button title="Take a photo" icon="image" variant="secondary" loading={uploading} onPress={() => pickPhoto(true)} /> : null}
        <Button title={Platform.OS === 'web' ? 'Choose a photo' : 'Choose from gallery'} icon="image" variant="secondary" loading={Platform.OS === 'web' && uploading} disabled={uploading} onPress={() => pickPhoto(false)} />
        <Button title="Choose a PDF / file" icon="file" variant="secondary" disabled={uploading} onPress={pickPdf} />
      </Sheet>
    </Screen>
  );
}
