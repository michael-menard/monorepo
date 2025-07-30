# Tech Radar for Monorepo

A **Tech Radar** is a visual tool to track technologies, tools, and practices adopted, trialed, or considered by a team or organization. It helps communicate technology strategy, encourage exploration, and align the team on tech choices.

## Purpose
- Document and visualize the technologies, tools, and practices in use or under consideration in this monorepo
- Support tech lead decision-making and team onboarding
- Encourage regular review and discussion of tech choices

## Structure
- `radar.json` — Main data file for the tech radar (edit this to add or update entries)
- `generate-radar.ts` — Script to generate a visual radar (Mermaid, SVG, or web-based)
- `README.md` — This file

## How to Update the Radar
1. Edit `radar.json` to add, move, or update technologies, tools, or practices
2. Run `pnpm ts-node tech-radar/generate-radar.ts` to generate or update the visualization
3. Commit and push changes

## Visualization
- The radar can be rendered as a Mermaid diagram, SVG, or interactive web page
- See the generated output in `tech-radar/radar.md` or `tech-radar/radar.svg`

---

For details, see [radar.json](./radar.json) and [generate-radar.ts](./generate-radar.ts) 