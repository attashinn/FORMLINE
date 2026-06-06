import type { FormField } from "./forms.types";

export type FormTemplate = {
  id: string;
  title: string;
  description: string;
  tagline: string;
  fields: FormField[];
};

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: "client-intake",
    title: "Client intake questionnaire",
    description: "Gather everything you need to kick off a new client project.",
    tagline: "Most popular",
    fields: [
      { id: "name", type: "text", label: "Your full name", required: true, placeholder: "Jane Doe" },
      { id: "email", type: "email", label: "Email", required: true, placeholder: "you@studio.com" },
      { id: "company", type: "text", label: "Company / brand", required: true },
      { id: "website", type: "text", label: "Website", placeholder: "https://" },
      { id: "project", type: "textarea", label: "Tell us about your project", required: true, placeholder: "Goals, audience, deliverables…" },
      { id: "budget", type: "select", label: "Budget range", options: ["< $5k", "$5k – $15k", "$15k – $50k", "$50k +"], required: true },
      { id: "timeline", type: "date", label: "Ideal start date" },
    ],
  },
  {
    id: "contact",
    title: "Contact us",
    description: "A simple, friendly contact form for your site or portfolio.",
    tagline: "Essential",
    fields: [
      { id: "name", type: "text", label: "Your name", required: true },
      { id: "email", type: "email", label: "Email", required: true },
      { id: "subject", type: "text", label: "Subject", required: true },
      { id: "message", type: "textarea", label: "Message", required: true, placeholder: "How can we help?" },
    ],
  },
  {
    id: "event-rsvp",
    title: "Event RSVP",
    description: "Confirm attendance, dietary needs, and plus-ones in one tap.",
    tagline: "Events",
    fields: [
      { id: "name", type: "text", label: "Full name", required: true },
      { id: "email", type: "email", label: "Email", required: true },
      { id: "attending", type: "select", label: "Will you attend?", options: ["Yes, I'll be there", "No, can't make it", "Maybe"], required: true },
      { id: "guests", type: "number", label: "Number of guests", placeholder: "0" },
      { id: "diet", type: "text", label: "Dietary requirements" },
      { id: "notes", type: "textarea", label: "Anything else?" },
    ],
  },
  {
    id: "feedback",
    title: "Customer feedback",
    description: "Collect honest ratings and suggestions from your users.",
    tagline: "Insights",
    fields: [
      { id: "name", type: "text", label: "Name (optional)" },
      { id: "email", type: "email", label: "Email (optional)" },
      { id: "rating", type: "select", label: "Overall rating", options: ["★★★★★ Excellent", "★★★★ Great", "★★★ Okay", "★★ Poor", "★ Terrible"], required: true },
      { id: "liked", type: "textarea", label: "What did you like?" },
      { id: "improve", type: "textarea", label: "What could we improve?" },
      { id: "recommend", type: "checkbox", label: "I'd recommend this to a friend" },
    ],
  },
  {
    id: "job-application",
    title: "Job application",
    description: "Lightweight applicant intake with role, links and a short pitch.",
    tagline: "Hiring",
    fields: [
      { id: "name", type: "text", label: "Full name", required: true },
      { id: "email", type: "email", label: "Email", required: true },
      { id: "phone", type: "tel", label: "Phone" },
      { id: "role", type: "select", label: "Role you're applying for", options: ["Design", "Engineering", "Product", "Marketing", "Operations"], required: true },
      { id: "portfolio", type: "text", label: "Portfolio / LinkedIn URL" },
      { id: "pitch", type: "textarea", label: "Why you?", required: true, placeholder: "Tell us your story in a few lines." },
      { id: "start", type: "date", label: "Earliest start date" },
    ],
  },
  {
    id: "newsletter",
    title: "Newsletter signup",
    description: "Grow your list with a tiny, focused signup form.",
    tagline: "Growth",
    fields: [
      { id: "email", type: "email", label: "Your email", required: true, placeholder: "you@domain.com" },
      { id: "name", type: "text", label: "First name" },
      { id: "interests", type: "select", label: "What are you here for?", options: ["Product updates", "Design tips", "Behind the scenes", "All of it"] },
      { id: "consent", type: "checkbox", label: "I agree to receive occasional emails" },
    ],
  },
];
