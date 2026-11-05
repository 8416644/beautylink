import { LegalDocument } from '@/components/legal-document';
import { PRIVACY_POLICY } from '@/constants/legal';

export default function PrivacyScreen() {
  return <LegalDocument title="מדיניות פרטיות" sections={PRIVACY_POLICY} />;
}
