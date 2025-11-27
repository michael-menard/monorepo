# User Research & Personas - LEGO MOC Organization App

## Project Overview
**Goal:** Migrate legacy React UI monolithic app to modern page-based micro-apps architecture for LEGO MOC organization and inventory management.

**Target Users:** Adult Fans of LEGO (AFOLs) who purchase MOC instructions and need organization tools.

## User Research Interview Results

### Primary User Persona: "The Organized Collector"
- **Demographics:** Adult LEGO enthusiasts who have purchased enough MOC instructions to need organization
- **Pain Points:** 
  - Hard to find specific MOCs in their collection (e.g., "all tree MOCs")
  - Instructions scattered across platforms (Rebrickable, BrickLink)
  - No way to search by themes, tags, or keywords
  - End up not using purchased instructions due to poor organization
- **Goals:**
  - Store and organize MOC instructions with searchable metadata
  - Upload and organize images (MOCs, sets, inspirational content)
  - Track purchased LEGO and alt-brick sets
  - Search by themes, tags, keywords (e.g., "tree", "fantasy")
- **Tech Comfort:** High - comfortable with desktop apps, want advanced features
- **Device Usage:** Primarily desktop, but mobile-first design for tablet/phone access

### Secondary User Persona: "The Selective Builder" 
- **Demographics:** AFOLs with smaller, curated collections (10-30 MOCs)
- **Pain Points:** Wants perfect organization and categorization
- **Goals:** AI assistance with manual review/control over final organization
- **Tech Comfort:** Medium-High - wants automation but with oversight

## Core Use Cases Identified

### 1. MOC Instructions Organization
- **File Formats:** PDF instructions, LDD files, Studio files, images
- **Metadata Needs:** Designer name, piece count, difficulty, purchase date, build status, themes, tags
- **Search Scenarios:** 
  - "Find all tree MOCs"
  - "All vehicles under 500 pieces" 
  - "Unbuilt Christmas MOCs"

### 2. Image Management & Albums
- **Image Types:** MOC photos, LEGO sets, inspirational images (mixed or separate)
- **Linking:** Photo galleries for each MOC, tagging system
- **Albums:** User-organized folders, multiple albums per image
- **Workflow:** See cool creation online → save image → use as inspiration later

### 3. Set Tracking (LEGO & Alt-Brick)
- **Data Tracked:** Set number, name, purchase price, purchase date, build status, condition
- **Alt-Brick:** Companies like Cada, Mould King with set numbers
- **Integration:** Searchable with MOCs, inventory connection for parts

### 4. Cost Calculation (Future Feature)
- **Parts Lists:** BrickLink XML, CSV, manual entry
- **Price Sources:** Web scraping BrickLink, BrickOwl, other marketplaces
- **Use Case:** Budgeting before buying parts, tracking collection value

## Key Insights
- **Not Social:** No community aspects, purely personal organization tool
- **Desktop Focus:** Primary usage on desktop, mobile-responsive for flexibility  
- **Quality Over Speed:** Users want accuracy and control over automation
- **Current Pain:** Rebrickable/BrickLink purchases become "digital hoarding" without organization
