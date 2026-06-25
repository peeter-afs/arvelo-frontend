import JournalEntryComposer from '@/components/accounting/JournalEntryComposer';

type EditJournalEntryPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditJournalEntryPage({ params }: EditJournalEntryPageProps) {
  const { id } = await params;
  return <JournalEntryComposer mode="edit" entryId={id} />;
}
