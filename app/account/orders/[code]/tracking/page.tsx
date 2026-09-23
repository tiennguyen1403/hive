import { redirect } from "next/navigation";

/**
 * The journey moved INTO the order.
 *
 * Until v3 slice 4 this was a screen of its own, reached from a "Theo dõi
 * chi tiết" button on the order — two pages saying the same five milestones,
 * one of them with the order's money and address and one without. The v3
 * detail carries the timeline itself, so the old address redirects rather
 * than 404ing: it is in browser histories and in this project's own sweep
 * list.
 */
export default async function TrackingPage(
  props: PageProps<"/account/orders/[code]/tracking">,
) {
  const { code } = await props.params;
  redirect(`/account/orders/${code}`);
}
