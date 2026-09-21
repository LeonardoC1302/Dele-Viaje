'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, DownloadSimple, Trash, UploadSimple } from '@phosphor-icons/react';
import { PanelHeading } from '@/components/ui/panel-heading';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export interface TripDocumentData {
  id: string;
  fileName: string;
  storagePath: string;
  fileSize: number | null;
  createdAt: string;
}

// Host-team-uploaded files (reservation confirmations, plane tickets,
// etc.) visible to every confirmed member of a private plan. Insert goes
// straight through a normal RLS-checked table insert rather than a
// SECURITY DEFINER RPC — unlike payment evidence, there's no asymmetric
// column-access problem here (only the uploader, always the host team,
// ever writes these rows), so the "trip_documents: host team uploads"
// policy alone is enough.
export function TripDocuments({
  tripId,
  isHostTeam,
  initialDocuments,
}: {
  tripId: string;
  isHostTeam: boolean;
  initialDocuments: TripDocumentData[];
}) {
  const t = useTranslations('plans');
  const [supabase] = useState(() => createClient());
  const [documents, setDocuments] = useState(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setError(null);

    const path = `${tripId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('trip-documents').upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      setUploading(false);
      setError(t('documentsUploadError'));
      return;
    }

    const { data, error: insertError } = await supabase
      .from('trip_documents')
      .insert({
        trip_id: tripId,
        uploaded_by: (await supabase.auth.getUser()).data.user?.id,
        storage_path: path,
        file_name: file.name,
        file_size: file.size,
        content_type: file.type,
      })
      .select('id, created_at')
      .single();

    setUploading(false);

    if (insertError || !data) {
      setError(t('documentsUploadError'));
      return;
    }

    setDocuments((prev) => [
      { id: data.id, fileName: file.name, storagePath: path, fileSize: file.size, createdAt: data.created_at },
      ...prev,
    ]);
  };

  const download = async (doc: TripDocumentData) => {
    setError(null);
    const { data, error: signError } = await supabase.storage
      .from('trip-documents')
      .createSignedUrl(doc.storagePath, 60);
    if (signError || !data) {
      setError(t('documentsDownloadError'));
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const remove = async (docId: string, storagePath: string) => {
    setBusyId(docId);
    setError(null);
    const { error: deleteError } = await supabase.from('trip_documents').delete().eq('id', docId);
    if (deleteError) {
      setBusyId(null);
      setError(t('documentsDeleteError'));
      return;
    }
    await supabase.storage.from('trip-documents').remove([storagePath]);
    setBusyId(null);
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  if (!isHostTeam && documents.length === 0) return null;

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between">
        <PanelHeading icon={FileText}>{t('documentsTitle')}</PanelHeading>
        {isHostTeam && (
          <>
            <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
            <Button
              size="xs"
              variant="secondary"
              isLoading={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadSimple size={14} weight="regular" strokeWidth={1.5} />
              {t('documentsUpload')}
            </Button>
          </>
        )}
      </div>
      <p className="mt-1 text-xs text-sand-500 dark:text-sand-400">{t('documentsHelper')}</p>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {documents.length === 0 ? (
        <p className="mt-4 text-sm text-sand-500 dark:text-sand-400">{t('documentsEmpty')}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-2 rounded-md border border-sand-200 p-2 dark:border-sand-800"
            >
              <FileText size={18} weight="regular" strokeWidth={1.5} className="shrink-0 text-sand-500 dark:text-sand-400" />
              <span className="min-w-0 flex-1 truncate text-sm text-sand-800 dark:text-sand-200">
                {doc.fileName}
              </span>
              <Button size="xs" variant="ghost" onClick={() => download(doc)} aria-label={t('documentsDownload')}>
                <DownloadSimple size={14} weight="regular" strokeWidth={1.5} />
              </Button>
              {isHostTeam && (
                <Button
                  size="xs"
                  variant="ghost"
                  isLoading={busyId === doc.id}
                  onClick={() => remove(doc.id, doc.storagePath)}
                  aria-label={t('documentsDelete')}
                  className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                >
                  <Trash size={14} weight="regular" strokeWidth={1.5} />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
