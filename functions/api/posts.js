
export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const postsUrl = new URL('/posts.json', url.origin);

  const res = await context.env.ASSETS.fetch(postsUrl);
  if (!res.ok) {
    return new Response(JSON.stringify({ error: 'cannot load posts.json' }), {
      status: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }

  const posts = await res.json();

  return new Response(JSON.stringify(posts), {
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}
