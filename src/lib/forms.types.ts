export type FieldType =
  | "text"
  | "email"
  | "textarea"
  | "select"
  | "checkbox"
  | "date"
  | "number"
  | "tel";

export type FormField = {
  id: string;
  type: FieldType;
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: string[]; // for select
};

export type FormRecord = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  fields: FormField[];
  share_token: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

export type SubmissionStatus = "New" | "Reviewed" | "Converted" | "Archived";

export type SubmissionRecord = {
  id: string;
  form_id: string;
  data: { [k: string]: JsonValue };
  submitter_name: string | null;
  submitter_email: string | null;
  submitted_at: string;
  status: SubmissionStatus;
  converted_client_id: string | null;
};
