import { redirect } from "next/navigation";

/**
 * The address form moved INTO the book (round v4 slice 3a).
 *
 * Until then this was a screen of its own; the Feed's book adds and edits in
 * a sheet on `/account/addresses`, opened by `?add=1` or `?edit=<id>`. The old
 * address redirects rather than 404ing — it is in browser histories and in
 * this project's own sweep list — and an edit link keeps its address.
 */
export default async function NewAddressPage(props: PageProps<"/account/addresses/new">) {
  const sp = await props.searchParams;
  const edit = Array.isArray(sp.edit) ? sp.edit[0] : sp.edit;
  redirect(edit ? `/account/addresses?edit=${encodeURIComponent(edit)}` : "/account/addresses?add=1");
}
