import type { MentionSuggestion } from "../../composables/useComments";

/**
 * A fictional team used to demo @mentions across the site (home page live demo
 * and the playground). Single source so the two demos stay consistent.
 */
export const DEMO_TEAM: MentionSuggestion[] = [
  { id: "u1", name: "Ada Lovelace", email: "ada@example.com" },
  { id: "u2", name: "Alan Turing", email: "alan@example.com" },
  { id: "u3", name: "Grace Hopper", email: "grace@example.com" },
  { id: "u4", name: "Margaret Hamilton", email: "margaret@example.com" },
];

/** @mention provider over {@link DEMO_TEAM}, matching on name or email. */
export const demoMentionSearch = (query: string): MentionSuggestion[] => {
  const q = query.toLowerCase();
  return DEMO_TEAM.filter(
    (u) => u.name.toLowerCase().includes(q) || (u.email?.toLowerCase().includes(q) ?? false)
  );
};
