import { Redirect } from 'expo-router';

export default function SitterRedirect() {
  return <Redirect href="/sitter/[id]" />;
} 