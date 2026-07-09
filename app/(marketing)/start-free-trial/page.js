import { redirect } from 'next/navigation';

export default function StartFreeTrialPage() {
  redirect('/register');
}