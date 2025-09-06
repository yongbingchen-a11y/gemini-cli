import argparse
import json
import os
import re

def parse_metrics_file(filepath):
    """
    Parses a metrics.jsonl file to extract details from failed patch operations.

    For each failed patch, it creates a dedicated 'debug_session_N' directory.
    Inside this directory, it recreates the file structure of the original
    project, writes the original file content, and saves the corresponding
    .diff file, allowing for easy local debugging.
    """
    if not os.path.exists(filepath):
        print(f"Error: File not found at '{filepath}'")
        return

    print(f"Parsing metrics file: {filepath}")
    failure_index = 0
    try:
        with open(filepath, 'r') as f:
            for i, line in enumerate(f):
                try:
                    metric = json.loads(line)

                    # Check for a failed patch with original file content
                    if (metric.get('tool') == 'patch' and
                        metric.get('status') == 'Failed' and
                        'failed_files_original_content' in metric and
                        'arguments' in metric and
                        'unified_diff' in metric['arguments']):

                        print(f"\nFound a failed patch operation on line {i + 1}.")

                        # Create a unique directory for this debug session
                        debug_dir = f"debug_session_{failure_index}"
                        os.makedirs(debug_dir, exist_ok=True)
                        print(f"  - Created directory: {debug_dir}")

                        # 1. Get the patch content and define its path
                        patch_content = metric['arguments']['unified_diff']
                        patch_filename = os.path.join(debug_dir, "failed_patch.diff")

                        # 2. Write the patch content to a .diff file
                        with open(patch_filename, 'w') as patch_file:
                            patch_file.write(patch_content)
                        print(f"  - Wrote attempted patch to: {patch_filename}")

                        # 3. Get the original file contents
                        original_files = metric['failed_files_original_content']
                        for original_filepath, content in original_files.items():
                            # Construct the full path inside the debug directory
                            full_target_path = os.path.join(debug_dir, original_filepath)

                            # Get the directory part of the path
                            target_dir = os.path.dirname(full_target_path)

                            # 4. Create the directory structure if it doesn't exist
                            if target_dir:
                                os.makedirs(target_dir, exist_ok=True)

                            # 5. Write the original content to the file
                            with open(full_target_path, 'w') as content_file:
                                content_file.write(content)
                            print(f"  - Wrote original content for '{original_filepath}' to: {full_target_path}")

                        failure_index += 1

                except json.JSONDecodeError:
                    print(f"Warning: Could not parse line {i + 1} as JSON. Skipping.")
                    continue

        if failure_index == 0:
            print("\nNo failed patch operations with debug information were found in the file.")
        else:
            print(f"\nSuccessfully extracted debug files for {failure_index} failed patch operation(s).")

    except IOError as e:
        print(f"Error reading file: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Parse a Gemini CLI metrics.jsonl file to extract debug "
                    "information from failed patch operations."
    )
    parser.add_argument(
        "metrics_file",
        help="Path to the metrics.jsonl file."
    )
    args = parser.parse_args()
    parse_metrics_file(args.metrics_file)
