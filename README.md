# Threads UI — Post Drafts & Content Tracker

A modern, high-performance web interface built with **Next.js 15**, **React 19**, and **Tailwind CSS**, designed for tracking Meta Threads content from scheduling to live publication.

Part of the **Threads MCP** creator workspace.

---

## 🖤 Aesthetic & Visual Identity

- **Monochrome Elegance**: Strict black-and-white theme inspired by Threads.
- **Glassmorphism**: Layered glass panels (`backdrop-filter: blur`), subtle borders, and micro-highlights.
- **Editorial Typography**: Clear hierarchy, monospaced metadata counters, and generous spacing.
- **Micro-Interactions**: One-click copying of URLs/drafts, expandable thread reply chains, and smooth status transitions.

---

## ⚡ Features (Feature 01: Post Drafts & Queue Tracker)

- **Unified Chronological Pipeline**: Real-time aggregation of:
  - **Scheduled Posts**: Intended target publication time, local formatted time (IST/UTC), countdown badges, and thread sequences.
  - **Published Posts**: Actual live publication timestamps, verified permalinks with direct clickable links to `threads.net`.
  - **Publishing & Failed States**: Pulsating live status indicators and error alerts.
  - **Drafts**: AI-generated drafts with suggestion context.
- **Compact Metrics Overview**: Live counts of queued, published, and total posts with next-in-queue countdowns.
- **Multi-Post Thread Support**: Full support for multi-post connected reply threads (e.g., 2–10 posts) with expandable previews.
- **Deep Draft Inspection Modal**: Inspect complete thread drafts segment by segment, with individual character counters (out of 500), raw JSON metadata, and copy tools.
- **Live Search & Status Filtering**: Instant client-side search across content, hooks, and post IDs, with status filtering and date sorting.
- **Queue Check Action**: On-demand button to trigger due scheduled posts via the backend runner.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (tested on Node v24)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/utkarsh-gen/Threads-UI.git
cd Threads-UI

# Install dependencies
npm install
```

### Environment Configuration

Create a `.env.local` file (optional, defaults to local MCP port 3000):

```env
THREADS_MCP_URL=http://localhost:3000
DEFAULT_USER_ID=chatgpt-user
# Optional direct Firestore credentials fallback:
# FIREBASE_PROJECT_ID=your-project-id
# FIREBASE_API_KEY=your-firebase-api-key
```

### Development & Production

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Default UI runs on `http://localhost:3001`.
