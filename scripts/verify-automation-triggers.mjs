/**
 * Run: node scripts/verify-automation-triggers.mjs
 * Mirrors shouldRunTrigger() in src/lib/automations.server.ts — keep in sync.
 */

function shouldRunTrigger(node, triggerKind, payload) {
  if (node.kind !== triggerKind) return false;

  if (triggerKind === "trigger_form_submit") {
    const formId = node.config?.formId;
    if (!formId || formId === "any") return true;
    const payloadFormId = payload.formId ?? payload.form_id;
    if (!payloadFormId) return true;
    return String(formId) === String(payloadFormId);
  }

  if (triggerKind === "trigger_status_change") {
    const statusFilter = node.config?.status;
    if (!statusFilter || statusFilter === "any") return true;
    const newStatus = payload.newStatus ?? payload.status;
    if (!newStatus) return true;
    return String(statusFilter) === String(newStatus);
  }

  if (triggerKind === "trigger_schedule") {
    const schedule = node.config?.schedule ?? "weekly";
    return schedule === "weekly";
  }

  return true;
}

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const formNode = (formId) => ({
  id: "t1",
  kind: "trigger_form_submit",
  config: { formId },
});

assert(
  shouldRunTrigger(formNode("form-a"), "trigger_form_submit", { formId: "form-a" }) === true,
  "form submit matches specific form",
);
assert(
  shouldRunTrigger(formNode("form-a"), "trigger_form_submit", { formId: "form-b" }) === false,
  "form submit rejects other form",
);
assert(
  shouldRunTrigger(formNode("any"), "trigger_form_submit", { formId: "form-b" }) === true,
  "any form accepts all",
);

const statusNode = (status) => ({
  id: "t2",
  kind: "trigger_status_change",
  config: { status },
});

assert(
  shouldRunTrigger(statusNode("Completed"), "trigger_status_change", { newStatus: "Completed" }) === true,
  "status filter matches newStatus",
);
assert(
  shouldRunTrigger(statusNode("Completed"), "trigger_status_change", { newStatus: "New" }) === false,
  "status filter rejects other status",
);
assert(
  shouldRunTrigger(statusNode("any"), "trigger_status_change", { newStatus: "New" }) === true,
  "any status accepts all",
);

assert(
  shouldRunTrigger({ id: "t3", kind: "trigger_schedule", config: { schedule: "weekly" } }, "trigger_schedule", {}) === true,
  "weekly schedule runs",
);
assert(
  shouldRunTrigger({ id: "t4", kind: "trigger_schedule", config: { schedule: "daily" } }, "trigger_schedule", {}) === false,
  "daily schedule skipped",
);

console.log("automation trigger filters: OK");
