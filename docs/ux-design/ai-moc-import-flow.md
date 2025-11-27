# AI-Powered MOC Import Flow - UX Design

## Overview
**Killer Feature:** Automated MOC ingestion using AI agent and MCP server to extract data from Rebrickable and BrickLink URLs.

**User Goal:** Paste a MOC URL and have the app automatically download instructions, images, parts lists, and metadata.

## Supported Platforms
- **Rebrickable.com** - Primary MOC marketplace
- **BrickLink.com** - Secondary MOC marketplace

## User Flow: Single MOC Import

### Step 1: URL Input Interface
```
┌─────────────────────────────────────────────────────┐
│ 📱 Add New MOC                                      │
├─────────────────────────────────────────────────────┤
│ 🤖 AI-Powered Import                               │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 🔗 Paste MOC URL from Rebrickable or BrickLink │ │
│ └─────────────────────────────────────────────────┘ │
│ [Import with AI] [Manual Entry Instead]            │
│ ─── OR ───                                         │
│ 📁 Upload Files Manually                           │
│ [Choose Files] Instructions, Images, Parts List    │
└─────────────────────────────────────────────────────┘
```

### Step 2: AI Processing State
```
┌─────────────────────────────────────────────────────┐
│ 🤖 AI Agent Working...                             │
├─────────────────────────────────────────────────────┤
│ 🔍 Analyzing URL: rebrickable.com/mocs/123456      │
│ ✅ Platform detected: Rebrickable                   │
│ ⏳ Extracting MOC data...                          │
│ ⏳ Downloading instructions (PDF)...               │
│ ⏳ Collecting images (8 found)...                  │
│ ⏳ Processing parts list...                        │
│ ████████████░░░░ 75% Complete                      │
│ 🔧 MCP Server Status: Connected ✅                 │
│ [Cancel Import]                                     │
└─────────────────────────────────────────────────────┘
```

### Step 3: Review & Confirmation Screen
```
┌─────────────────────────────────────────────────────┐
│ ✨ Review AI-Extracted Data                        │
├─────────────────────────────────────────────────────┤
│ 🖼️ [Main Image]     📝 MOC Details                 │
│    Medieval Castle      ┌─────────────────────────┐ │
│    [8 more images]      │ Title: Medieval Castle  │ │
│                         │ Designer: BuilderPro    │ │
│                         │ Pieces: 2,847          │ │
│                         │ Difficulty: ⭐⭐⭐⭐     │ │
│                         └─────────────────────────┘ │
│ 🏷️ AI-Suggested Tags                              │
│ [Castle] [Medieval] [Architecture] [Large Build]   │
│ + Add custom tag                                    │
│ 📁 Files Found                                     │
│ ✅ Instructions.pdf (2.3 MB)                       │
│ ✅ Parts_List.xml (45 KB)                          │
│ ✅ 8 Images (12.1 MB total)                        │
│ 💰 Estimated Cost: $247.50 (BrickLink avg)        │
│ [✏️ Edit Details] [❌ Cancel] [✅ Import MOC]      │
└─────────────────────────────────────────────────────┘
```

### Step 4: Success Confirmation
```
┌─────────────────────────────────────────────────────┐
│ ✅ MOC Successfully Imported!                      │
├─────────────────────────────────────────────────────┤
│ 🏰 Medieval Castle                                 │
│ Added to your collection                            │
│ 📊 Collection Stats Updated:                       │
│ • Total MOCs: 47 → 48                             │
│ • Total Pieces: 125,847 → 128,694                 │
│ • Castle Theme: 8 → 9                             │
│ [🔍 View MOC] [➕ Import Another] [🏠 Dashboard]   │
└─────────────────────────────────────────────────────┘
```

## Error Handling States

### Import Issue Detected
```
┌─────────────────────────────────────────────────────┐
│ ⚠️ Import Issue Detected                           │
├─────────────────────────────────────────────────────┤
│ 🔍 URL Analysis: rebrickable.com/mocs/123456       │
│ ❌ Could not access instructions (Login required)   │
│ ✅ Images extracted successfully                    │
│ ⚠️ Parts list format not recognized                │
│ 🤖 AI Suggestion:                                  │
│ "Please check your Rebrickable login credentials   │
│  in Settings, or upload instructions manually."    │
│ [⚙️ Check Settings] [📁 Upload Files] [🔄 Retry]  │
└─────────────────────────────────────────────────────┘
```

## Key UX Design Decisions

### 1. Progressive Disclosure
- Start simple (just URL input)
- Show AI progress transparently  
- Full review before commitment
- Clear success feedback

### 2. Trust & Control
- Always show what AI extracted
- Allow editing before import
- Clear file verification
- MCP server status visible

### 3. Mobile-First Design
- Touch-friendly interface
- Simplified mobile workflow
- Responsive layout patterns

## Mobile-Optimized Version

### Mobile URL Input (Stacked Layout)
```
┌─────────────────────────┐
│ 📱 Add MOC             │
├─────────────────────────┤
│ 🤖 AI Import           │
│ ┌─────────────────────┐ │
│ │ 🔗 Paste URL        │ │
│ └─────────────────────┘ │
│ [Import with AI]        │
│ ─── OR ───             │
│ 📁 Manual Upload        │
│ [Choose Files]          │
└─────────────────────────┘
```

## Technical Requirements
- **MCP Server Integration** for AI processing
- **Platform Authentication** (Rebrickable, BrickLink)
- **File Download & Storage** (PDFs, images, XML)
- **Real-time Progress Updates** during processing
- **Error Recovery** with fallback to manual entry
- **URL Validation** for supported platforms
- **Duplicate Detection** to prevent re-importing
- **Cost Calculation** via web scraping price data
