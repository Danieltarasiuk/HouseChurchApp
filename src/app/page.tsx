import { redirect } from 'next/navigation';

export default function Home() {
  // Temporary redirect - in the future, check auth status
  redirect('/dashboard');
}
