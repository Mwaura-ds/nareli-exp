// /events/[id] — server wrapper (owns `instant = false`: per-request route).
// The interactive experience lives in EventExperience (client).
import EventExperience from './EventExperience';

export const instant = false;

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventExperience id={id} />;
}
