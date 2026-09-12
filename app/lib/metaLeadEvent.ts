export const META_LEAD_EVENT_ID_PATTERN =
  /^axven_lead_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function buildMetaLeadEventId(uuid: string) {
  const eventId = `axven_lead_${uuid}`;
  if (!META_LEAD_EVENT_ID_PATTERN.test(eventId)) {
    throw new Error("UUID invalido para Meta Lead event ID");
  }
  return eventId;
}

export function shouldTrackMetaSubmission(result: {
  idempotent?: boolean;
  meta_event_id?: unknown;
}) {
  return (
    result.idempotent !== true &&
    typeof result.meta_event_id === "string" &&
    META_LEAD_EVENT_ID_PATTERN.test(result.meta_event_id)
  );
}
