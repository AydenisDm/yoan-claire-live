import { createFileRoute } from "@tanstack/react-router";
import { FeedbackHub } from "@/components/feedback-hub";

export const Route = createFileRoute("/feedback")({ ssr: false, component: FeedbackHub });
