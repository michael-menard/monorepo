#!/usr/bin/env python3
"""
Shard user-metrics-prd.md into separate phase files.
"""

import re
from pathlib import Path

# Read the source PRD
prd_path = Path("user-metrics-prd.md")
content = prd_path.read_text()

# Split into sections
sections = re.split(r'^## ', content, flags=re.MULTILINE)

# Find the intro sections (before Epic 1)
header_parts = []
epic_content = None
current_phase = None
phases = {
    "phase-1": [],
    "phase-2": [],
    "phase-3": [],
    "phase-4": []
}

in_epic = False
for section in sections:
    if section.startswith("Epic and Story Structure"):
        header_parts.append("## " + section)
    elif section.startswith("Epic 1: User Tracking"):
        in_epic = True
        epic_content = "## " + section
    elif in_epic:
        epic_content += "## " + section

# Now parse the epic content by phases
if epic_content:
    phase_sections = re.split(r'^### PHASE ', epic_content, flags=re.MULTILINE)

    # First part is Epic header
    epic_header = phase_sections[0]

    # Process each phase
    for i, phase_section in enumerate(phase_sections[1:], 1):
        phase_key = f"phase-{i}"
        phases[phase_key].append(f"### PHASE {phase_section}")

# Write sharded files
output_dir = Path(".")

# Write phase files
for phase_num in range(1, 5):
    phase_key = f"phase-{phase_num}"
    if phases[phase_key]:
        output_file = output_dir / f"phase-{phase_num}.md"

        # Build content
        content_parts = []

        # Add header
        content_parts.append(f"# User Tracking & Metrics Implementation - Phase {phase_num}\n")
        content_parts.append("Part of the User Metrics PRD brownfield enhancement.\n")
        content_parts.append(f"See [user-metrics-prd.md](./user-metrics-prd.md) for complete context.\n")
        content_parts.append("---\n")

        # Add phase content
        content_parts.extend(phases[phase_key])

        # Write file
        output_file.write_text("\n".join(content_parts))
        print(f"Created {output_file}")

print("\nSharding complete!")
print("Created 4 phase files: phase-1.md through phase-4.md")
