/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { Config } from '../config/config.js';

/**
 * Logs a custom metric object to a session-specific metrics.jsonl file.
 * This is an append-only operation and is safe from corruption.
 *
 * @param config The global Config object, used to find the session temp directory.
 * @param metric A JSON-serializable object representing the metric to record.
 */
export async function logLocalMetric(
  config: Config,
  metric: Record<string, unknown>,
) {
  try {
    // 1. Get the unique temporary directory for the current session.
    const sessionDir = config.storage.getProjectTempDir();
    const metricsFilePath = path.join(sessionDir, 'metrics.jsonl');

    // 2. Add a timestamp to the metric for context.
    const metricWithTimestamp = {
      timestamp: new Date().toISOString(),
      ...metric,
    };

    // 3. Format the metric as a single-line JSON string.
    const metricLine = JSON.stringify(metricWithTimestamp) + '\n';

    // 4. Append the line to your metrics file.
    // fs.appendFile is atomic and safe for this purpose.
    await fs.appendFile(metricsFilePath, metricLine, 'utf-8');
  } catch (error) {
    // Log to the console if your custom logging fails for any reason.
    console.error('Failed to write local metric:', error);
  }
}
