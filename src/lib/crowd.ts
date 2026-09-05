export const CHAT_OPTIONS = [
  { id: "love", label: "Love this" },
  { id: "beautiful", label: "So beautiful" },
  { id: "wow", label: "Wow" },
  { id: "withyou", label: "We're with you" },
  { id: "cheers", label: "Cheers" },
  { id: "clap", label: "Clapping" },
] as const;

export const FEEDBACK_GROUPS = [
  {
    kind: "picture",
    title: "Picture",
    options: [
      { id: "clear", label: "Clear" },
      { id: "soft", label: "A bit soft" },
      { id: "stuck", label: "Freezing" },
    ],
  },
  {
    kind: "sound",
    title: "Sound",
    options: [
      { id: "clear", label: "Clear" },
      { id: "quiet", label: "Too quiet" },
      { id: "none", label: "No sound" },
    ],
  },
  {
    kind: "moment",
    title: "The event",
    options: [
      { id: "great", label: "Great" },
      { id: "moving", label: "Moving" },
      { id: "issues", label: "Having issues" },
    ],
  },
] as const;

export type ChatOptionId = (typeof CHAT_OPTIONS)[number]["id"];
export type FeedbackKind = (typeof FEEDBACK_GROUPS)[number]["kind"];

export type ChatLine = {
  from: string;
  id: ChatOptionId;
  label: string;
  at: number;
};

const chatById = new Map(CHAT_OPTIONS.map((o) => [o.id, o.label]));
const feedbackOk = new Map<string, Set<string>>(
  FEEDBACK_GROUPS.map((g) => [g.kind, new Set(g.options.map((o) => o.id))]),
);

export function chatLabel(id: string) {
  return chatById.get(id as ChatOptionId) ?? null;
}

export function isChatId(id: string): id is ChatOptionId {
  return chatById.has(id as ChatOptionId);
}

export function isFeedbackChoice(kind: string, choice: string) {
  return feedbackOk.get(kind)?.has(choice) ?? false;
}
