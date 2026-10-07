import type { Note, NoteFolder } from "../../types/note";

export const mockNotes: Note[] = [
  {
    id: 1,
    title: "Design System Revamp Project",
    folder: "Work",
    pinned: false,
    updated: "1 minute ago",
    body: `This document outlines the scope, goals, and planned activities for the design system revamp initiative. The primary objective is to improve consistency, usability, and scalability across all digital products.

## Project Overview
The team reviewed existing UI components, identified gaps in usability, and aligned on priorities for the next phase. Emphasis was placed on accessibility, responsiveness, and design consistency.

## Key Objectives
• Standardize core UI components
• Improve visual hierarchy and spacing
• Enhance accessibility compliance
• Reduce design to development handoff time

## Planned Activities
1. Audit existing components and patterns
2. Define updated typography and color tokens
3. Create reusable components in Figma
4. Document usage guidelines and best practices

## Success Metrics
Progress will be evaluated using both qualitative and quantitative measures to ensure the new system delivers measurable improvements.`,
  },
  {
    id: 2,
    title: "Welcome to Notes",
    folder: "",
    pinned: true,
    updated: "about 1 month ago",
    body: "This is your first note. Start typing to edit it.",
  },
  {
    id: 3,
    title: "Meeting Notes – Q4 Planning",
    folder: "Work",
    pinned: true,
    updated: "8 minutes ago",
    body: "Q4 Planning Session\n\nDiscussed product roadmap and key objectives for Q4. Focus areas include onboarding, performance, and a refreshed design system.",
  },
  {
    id: 4,
    title: "Shopping List",
    folder: "Personal",
    pinned: false,
    updated: "about 1 month ago",
    body: "Milk, eggs, bread, coffee, vegetables",
  },
  {
    id: 5,
    title: "Book Ideas",
    folder: "Personal",
    pinned: false,
    updated: "about 1 month ago",
    body: "Collection of interesting book recommendations from friends",
  },
  {
    id: 6,
    title: "Project Timeline",
    folder: "Work",
    pinned: false,
    updated: "yesterday",
    body: "Milestones and dates for the upcoming project.",
  },
  {
    id: 7,
    title: "Weekend Reset",
    folder: "Personal",
    pinned: false,
    updated: "yesterday",
    body: "A simple plan for a slower, more restorative weekend.\n\n- Tidy the desk and put laundry away\n- Pick up fresh groceries\n- Take a long walk without checking messages\n- Leave Sunday evening open for reading",
  },
  {
    id: 8,
    title: "Ideas for Scribe",
    folder: "Ideas",
    pinned: true,
    updated: "2 days ago",
    body: "Small improvements that could make everyday note taking feel effortless.\n\n## Capture\nA quick note shortcut, recent notes, and a lightweight scratchpad.\n\n## Organization\nTags, optional reminders, and simple ways to find old thoughts.",
  },
  {
    id: 9,
    title: "Recipes to Try",
    folder: "Personal",
    pinned: false,
    updated: "3 days ago",
    body: "Tomato and white bean stew\n\nRoast cherry tomatoes with garlic and olive oil. Fold in butter beans, lemon zest, and torn basil. Serve with toasted sourdough.",
  },
  {
    id: 10,
    title: "Launch Checklist",
    folder: "Work",
    pinned: true,
    updated: "4 days ago",
    body: "## Before launch\n- Review onboarding copy\n- Check keyboard navigation\n- Confirm empty and error states\n- Ask two friends to try the build\n\n## After launch\nCollect feedback and decide what belongs in the first update.",
  },
  {
    id: 11,
    title: "Things to Remember",
    folder: "",
    pinned: false,
    updated: "5 days ago",
    body: "Keep the first version small. Make the common paths feel great. Save the bigger ideas somewhere safe so they do not become urgent by accident.",
  },
  {
    id: 12,
    title: "Reading Notes — The Creative Act",
    folder: "Ideas",
    pinned: false,
    updated: "1 week ago",
    body: "Creativity gets easier when attention is treated as a practice. Notice what keeps returning to mind, then give it a little room to develop.",
  },
  {
    id: 13,
    title: "Coffee with Maya",
    folder: "Personal",
    pinned: false,
    updated: "1 week ago",
    body: "Catch up over coffee next Thursday. Ask about the photography course and share the prototype once the note editor feels ready.",
  },
  {
    id: 14,
    title: "App Color Palette",
    folder: "Work",
    pinned: false,
    updated: "2 weeks ago",
    body: "Canvas: warm charcoal\nSurface: soft graphite\nAccent: violet, with blue and mint as supporting colors\n\nKeep contrast comfortable and let color communicate state instead of decoration.",
  },
  {
    id: 15,
    title: "Travel Packing List",
    folder: "Personal",
    pinned: false,
    updated: "2 weeks ago",
    body: "- Charger and headphones\n- Light jacket\n- Notebook and pen\n- Reusable water bottle\n- Camera and spare battery",
  },
  {
    id: 16,
    title: "Questions for the Team",
    folder: "Work",
    pinned: false,
    updated: "3 weeks ago",
    body: "Which part of the current flow feels slowest? What do you reach for every day? Where do you expect a note to be after you save it?\n\nBring these questions to the next design review.",
  },
  {
    id: 17,
    title: "Tiny Wins",
    folder: "",
    pinned: false,
    updated: "last month",
    body: "The folder picker feels much clearer. Search now has a proper shortcut. The editor finally has enough room to breathe.",
  },
  {
    id: 18,
    title: "Gift Ideas",
    folder: "Personal",
    pinned: false,
    updated: "last month",
    body: "A few ideas to keep nearby for birthdays and small celebrations: a local bookstore gift card, a good travel mug, or a print from an artist they like.",
  },
];

export const mockFolders: NoteFolder[] = [
  { name: "Work", icon: "briefcase", color: "blue" },
  { name: "Personal", icon: "heart", color: "rose" },
  { name: "Ideas", icon: "idea", color: "amber" },
];
