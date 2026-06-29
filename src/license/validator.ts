import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';

const GUMROAD_PRODUCT_PERMALINK = 'zswdkyv';
const GUMROAD_API = 'https://api.gumroad.com/v2/licenses/verify';

export interface LicenseInfo {
  key: string;
  email?: string;
  activatedAt: string;
  tier: 'pro' | 'team' | 'enterprise';
  expiresAt?: string;
}

const LICENSE_PATH = join(homedir(), '.reviewpilot', 'license.json');

export function isProLicense(): boolean {
  const license = getStoredLicense();
  if (!license) return false;

  if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
    return false;
  }

  return true;
}

export function getStoredLicense(): LicenseInfo | null {
  try {
    if (existsSync(LICENSE_PATH)) {
      return JSON.parse(readFileSync(LICENSE_PATH, 'utf-8'));
    }
  } catch {
    // ignore
  }
  return null;
}

export function activateLicense(key: string): LicenseInfo {
  const dir = join(homedir(), '.reviewpilot');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  try {
    const body = JSON.stringify({
      product_permalink: GUMROAD_PRODUCT_PERMALINK,
      license_key: key,
    });
    const result = execSync(
      `curl -s -X POST "${GUMROAD_API}" -H "Content-Type: application/json" -d "${body.replace(/"/g, '\\"')}"`,
      { encoding: 'utf-8', timeout: 10000 }
    );
    const data = JSON.parse(result);

    if (!data.success) {
      throw new Error(data.message || 'License activation failed');
    }

    const license: LicenseInfo = {
      key,
      email: data.purchase?.email,
      activatedAt: new Date().toISOString(),
      tier: (data.purchase?.variants as string)?.toLowerCase()?.includes('team')
        ? 'team'
        : data.purchase?.variants?.toLowerCase()?.includes('enterprise')
          ? 'enterprise'
          : 'pro',
      expiresAt: data.purchase?.subscription_cancelled_at
        ? new Date(data.purchase.subscription_cancelled_at).toISOString()
        : undefined,
    };

    writeFileSync(LICENSE_PATH, JSON.stringify(license, null, 2), 'utf-8');
    return license;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`License activation failed: ${message}`);
  }
}

export function getLicenseTier(): 'free' | 'pro' | 'team' | 'enterprise' {
  if (!isProLicense()) return 'free';
  const license = getStoredLicense();
  return license?.tier || 'pro';
}
