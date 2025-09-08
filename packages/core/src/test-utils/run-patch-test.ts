/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview A test runner to apply a real git patch file using PatchTool.
 * This script simulates how the Gemini CLI would invoke the tool.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { PatchTool } from '../tools/patch.js'; // Adjust path if needed
import type { Config } from '../config/config.js'; // Adjust path if needed
import { StandardFileSystemService } from '../services/fileSystemService.js'; // Adjust path if needed

async function main() {
  const originalCwd = process.cwd();
  const patchFilePathArg = process.argv[2];
  const targetDirArg = process.argv[3]; // Optional target directory

  if (!patchFilePathArg) {
    console.error(
      '❌ Error: Please provide the path to a patch file as an argument.',
    );
    console.log(
      'Usage: npx tsx run-patch-test.ts <path-to-patch.patch> [path-to-target-dir]',
    );
    process.exit(1);
  }

  // Resolve paths from the original execution directory
  const targetDir = targetDirArg
    ? path.resolve(originalCwd, targetDirArg)
    : // eslint-disable-next-line n/no-process-env
      process.env.BUILD_WORKSPACE_DIRECTORY || originalCwd;
  const patchFilePath = path.resolve(originalCwd, patchFilePathArg);

  // Read the patch file content before changing directories
  let patchContent: string;
  try {
    patchContent = await fs.readFile(patchFilePath, 'utf-8');
  } catch (_error) {
    console.error(`❌ Error: Could not read patch file at ${patchFilePath}`);
    return;
  }

  try {
    // "pushd": Change to the target directory
    await fs.access(targetDir); // Ensure directory exists
    process.chdir(targetDir);

    console.log(`🎯 Applying patch from: ${patchFilePath}`);
    console.log(`📂 In target directory: ${process.cwd()}\n`);

    // The tool should now operate on the CWD.
    const mockConfig: Config = {
      getFileSystemService: () => new StandardFileSystemService(),
      getTargetDir: () => process.cwd(),
      isPathWithinWorkspace: (pathToCheck: string): boolean => {
        const targetDir = process.cwd();
        const relative = path.relative(targetDir, pathToCheck);
        return !relative.startsWith('..') && !path.isAbsolute(relative);
      },
    } as unknown as Config;

    const patchTool = new PatchTool(mockConfig);
    const invocation = patchTool.build({ unified_diff: patchContent });

    console.log('🚀 Executing PatchTool...\n');
    const result = await invocation.execute();

    // Display Results
    console.log('--- ✨ TOOL RESULTS ---');
    console.log(result.returnDisplay);
    console.log('----------------------\n');

    // Check for complete failure first.
    if (result.error) {
      console.error('⚠️  Tool execution failed catastrophically.');
      console.error('\n--- RAW ERROR MESSAGE ---');
      console.error(result.error.message);
      console.error('-------------------------\n');
    } else if (result.llmContent.includes('failed to apply')) {
      // Check for partial failure by inspecting the content passed to the LLM.
      console.error('⚠️  Patch was only partially successful.');
      console.error('\n--- FAILED HUNKS ---');
      // The llmContent contains the detailed diff of what failed.
      console.error(result.llmContent);
      console.error('--------------------\n');
    } else {
      console.log(
        `✅ Patch applied successfully! Verify the changes in the '${path.basename(targetDir)}' directory.`,
      );
    }
  } catch (e) {
    console.error('🔥 A fatal error occurred during the test run:', e);
  } finally {
    // "popd": Always change back to the original directory
    process.chdir(originalCwd);
  }
}

main();
