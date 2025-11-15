import { redirect } from 'next/navigation'

export default function Home() {
  // Redirect to owner dashboard
  redirect('/dashboard')
}
