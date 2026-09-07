/**
 * @file Playwright global setup — authenticates the Evinced SDK before any test runs.
 */

import { config as loadEnv } from 'dotenv';
import { setCredentials } from '@evinced/js-playwright-sdk';

loadEnv();

/**
 * Reads `EVINCED_SERVICE_ID` / `EVINCED_API_KEY` from `process.env` (after dotenv)
 * and calls `setCredentials` so subsequent `EvincedSDK` usage is authorized.
 *
 * @throws {Error} When credentials are missing or SDK authorization fails.
 */
async function globalSetup(): Promise<void> {
  const serviceId = process.env.EVINCED_SERVICE_ID;
  const secret = process.env.EVINCED_API_KEY;

  if (!serviceId || !secret) {
    throw new Error(
      'Missing EVINCED_SERVICE_ID or EVINCED_API_KEY. Copy .env.example to .env and fill in credentials.',
    );
  }

  try {
    await setCredentials({ serviceId, secret });
  } catch (error) {
    throw new Error(`Evinced SDK authorization failure: ${String(error)}`, { cause: error });
  }
}

export default globalSetup;
