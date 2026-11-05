import { LegalDocument } from '@/components/legal-document';
import { TERMS_OF_USE } from '@/constants/legal';

export default function TermsScreen() {
  return <LegalDocument title="תנאי שימוש" sections={TERMS_OF_USE} />;
}
