/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FileSystemService } from '@google/gemini-cli-core';
import type * as acp from './acp.js';

/**
 * ACP client-based implementation of FileSystemService
 */
export class AcpFileSystemService implements FileSystemService {
  constructor(
    private readonly client: acp.Client,
    private readonly sessionId: string,
    private readonly capabilities: acp.FileSystemCapability,
    private readonly fallback: FileSystemService,
  ) {}

  async readTextFile(filePath: string): Promise<string> {
    if (!this.capabilities.readTextFile) {
      return this.fallback.readTextFile(filePath);
    }

    const response = await this.client.readTextFile({
      path: filePath,
      sessionId: this.sessionId,
      line: null,
      limit: null,
    });

    return response.content;
  }

  async writeTextFile(filePath: string, content: string): Promise<void> {
    if (!this.capabilities.writeTextFile) {
      return this.fallback.writeTextFile(filePath, content);
    }

    await this.client.writeTextFile({
      path: filePath,
      content,
      sessionId: this.sessionId,
    });
  }

  async unlink(filePath: string): Promise<void> {
    if (!this.capabilities.unlink) {
      return this.fallback.unlink(filePath);
    }
    // TODO: acp.Client doesn't have an unlink method yet.
    return this.fallback.unlink(filePath);
  }

  async mkdir(
    dirPath: string,
    options?: { recursive: boolean },
  ): Promise<void> {
    if (!this.capabilities.mkdir) {
      return this.fallback.mkdir(dirPath, options);
    }
    // TODO: acp.Client doesn't have a mkdir method yet.
    return this.fallback.mkdir(dirPath, options);
  }
}
