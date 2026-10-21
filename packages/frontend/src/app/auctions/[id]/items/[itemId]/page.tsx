import LegacyRoute from '@/components/auction/LegacyRoute'

export default function Page({ params }: { params: { id: string; itemId: string } }) {
  return <LegacyRoute id={params.id} view="item" itemId={params.itemId} />
}
