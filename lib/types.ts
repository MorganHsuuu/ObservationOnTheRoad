export type EventStatus = "setup" | "live" | "archived";
export type TaskStatus = "draft" | "published" | "closed";

export type EventRow = {
  id: string;
  slug: string;
  title: string;
  location_name: string | null;
  lat: number | null;
  lng: number | null;
  event_date: string | null;
  story_md: string | null;
  briefing_md: string | null;
  status: EventStatus;
  gallery_public: boolean;
  show_public: boolean;
  created_at: string;
};

export type TaskRow = {
  id: string;
  event_id: string;
  order_index: number;
  title: string;
  prompt_md: string;
  hint: string | null;
  requires_photo: boolean;
  requires_caption: boolean;
  max_photos: number;
  status: TaskStatus;
  published_at: string | null;
  created_at: string;
};

export type TeamRow = {
  id: string;
  event_id: string;
  name: string;
  code: string;
  members: string | null;
};

export type SubmissionRow = {
  id: string;
  task_id: string;
  team_id: string | null;
  image_urls: string[];
  thumb_urls: string[];
  caption: string | null;
  lat: number | null;
  lng: number | null;
  student_id: string | null;
  student_name: string | null;
  is_featured: boolean;
  is_hidden: boolean;
  created_at: string;
};

export type StoredTeam = {
  eventSlug: string;
  teamId: string;
  teamName: string;
  teamCode: string;
  studentId: string;
  studentName: string;
};

export type SubmissionWithMeta = SubmissionRow & {
  task: Pick<TaskRow, "id" | "title" | "order_index" | "prompt_md">;
  team: Pick<TeamRow, "id" | "name" | "code"> | null;
};

export type SubmissionLikeRow = {
  submission_id: string;
  student_id: string;
};

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type BroadcastKind = "ack" | "yesno" | "choice";
export type BroadcastStatus = "live" | "closed";

export type ParticipantRow = {
  id: string;
  event_id: string;
  team_id: string;
  student_id: string;
  student_name: string;
  last_seen_at: string;
  created_at: string;
};

export type BroadcastRow = {
  id: string;
  event_id: string;
  kind: BroadcastKind;
  body: string;
  options: string[];
  status: BroadcastStatus;
  created_at: string;
};

export type BroadcastResponseRow = {
  id: string;
  broadcast_id: string;
  team_id: string | null;
  student_id: string;
  student_name: string;
  answer: string;
  created_at: string;
};
