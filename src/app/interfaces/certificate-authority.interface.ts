import { CertificateKeyType } from 'app/enums/certificate-key-type.enum';
import { ExtendedKeyUsageFlag } from 'app/enums/extended-key-usage-flag.enum';

export interface BasicConstraints {
  ca: boolean;
  enabled: boolean;
  path_length: number | null;
  extension_critical: boolean;
}

export interface ExtendedKeyUsage {
  usages: ExtendedKeyUsageFlag[];
  enabled: boolean;
  extension_critical: boolean;
}

export interface KeyUsages {
  enabled: boolean;
  digital_signature: boolean;
  content_commitment: boolean;
  key_encipherment: boolean;
  data_encipherment: boolean;
  key_agreement: boolean;
  key_cert_sign: boolean;
  crl_sign: boolean;
  encipher_only: boolean;
  decipher_only: boolean;
  extension_critical: boolean;
}

export interface CertificateExtensions {
  BasicConstraints: BasicConstraints;
  ExtendedKeyUsage: ExtendedKeyUsage;
  KeyUsage: KeyUsages;
}

export interface CertificateAuthority {
  CA_type_existing: boolean;
  CA_type_intermediate: boolean;
  CA_type_internal: boolean;
  CSR: unknown;
  DN: string;
  add_to_trusted_store: boolean;
  cert_type: string; // Enum?
  cert_type_CSR: boolean;
  cert_type_existing: boolean;
  cert_type_internal: boolean;
  certificate: string;
  certificate_path: string;
  chain: boolean;
  chain_list: string[];
  city: string;
  common: string;
  country: string;
  crl_path: string;
  csr_path: string;
  digest_algorithm: string;
  email: string;
  extensions: {
    BasicConstraints: string;
    ExtendedKeyUsage: string;
    KeyUsage: string;
    SubjectAltName: string;
    SubjectKeyIdentifier: string;
  };
  fingerprint: string;
  from: string;
  id: number;
  internal: string;
  issuer: string | { name: string };
  key_length: number;
  key_type: CertificateKeyType;
  lifetime: number;
  name: string;
  organization: string;
  organizational_unit: string;
  parsed: boolean;
  privatekey: string;
  privatekey_path: string;
  revoked: boolean;
  revoked_certs: unknown[];
  revoked_date: unknown;
  root_path: string;
  san: string[];
  serial: number;
  signed_certificates: number;
  signedby: null;
  state: string;
  subject_name_hash: number;
  type: number;
  until: string;
}

export interface CertificateAuthoritySignRequest {
  ca_id: number;
  csr_cert_id: number;
  name: string;
  cert_extensions?: CertificateExtensions;
}
