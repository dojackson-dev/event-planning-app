import LegacyRoute from '@/components/auction/LegacyRoute'

export default function Page({ params }: { params: { id: string } }) {
  return <LegacyRoute id={params.id} view="donate" />
}
