import { env } from './env';

/**
 * Deterministic development fallback key so local/test environments can encrypt
 * secrets at rest without provisioning an ENCRYPTION_KEY. Using a stable value
 * (never random) guarantees that secrets written in dev can be decrypted again
 * on the next dev boot — a random key per process would silently corrupt stored
 * webhook secrets / SMTP passwords on restart.
 *
 * This is NEVER used in production: the guard refuses to boot there unless a
 * real ENCRYPTION_KEY (>= 16 chars) is provided.
 */
const DEV_FALLBACK_KEY = 'ghostsmtp-dev-only-encryption-key-change-me';

/**
 * Fail-fast guard: in production the ENCRYPTION_KEY is mandatory because it is
 * used to encrypt webhook signing secrets, SMTP upstream passwords and DKIM
 * keys at rest. Starting without it would silently store plaintext secrets, so
 * we refuse to boot instead. Called from every process entrypoint.
 *
 * In non-production environments (development/test) we install the stable dev
 * fallback key so the API and workers can boot out-of-the-box while still
 * encrypting secrets at rest deterministically.
 */
export function assertEncryptionKeyConfigured() {
  const key = env.ENCRYPTION_KEY;

  if (key && key.length >= 16) {
    return;
  }

  if (env.NODE_ENV === 'production') {
    const message =
      'ENCRYPTION_KEY is required in production (min 16 chars) to encrypt secrets at rest. ' +
      'Set it before starting the server or workers.';
    console.error(`[encryptionGuard] ${message}`);
    process.exit(1);
  }

  console.warn(
    '[encryptionGuard] ENCRYPTION_KEY not set — using the deterministic development fallback key. ' +
      'Secrets will still be encrypted at rest, but DO NOT run production workloads with this key. ' +
      'Set ENCRYPTION_KEY in the environment for real deployments.'
  );
  // env is validated at boot; the fallback satisfies the zod schema's optional string field.
  env.ENCRYPTION_KEY = DEV_FALLBACK_KEY;
}

export default assertEncryptionKeyConfigured;
