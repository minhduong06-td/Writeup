const CORRECT_PASSWORD = "your-secret-password"; // ← đổi password ở đây

export async function onRequestGet(context) {
  const slug = decodeURIComponent(context.params.slug);
  const url = new URL(context.request.url);

  const postsRes = await context.env.ASSETS.fetch(new URL('/posts.json', url.origin));
  if (!postsRes.ok) {
    return new Response(JSON.stringify({ error: 'cannot load posts.json' }), {
      status: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }

  const posts = await postsRes.json();
  const post = posts.find(item => item.slug === slug);

  if (!post) {
    return new Response(JSON.stringify({ error: 'post not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }

  // ── Password gate ──
  if (post.password_required) {
    const provided = context.request.headers.get('x-post-password') || '';
    if (provided !== CORRECT_PASSWORD) {
      return new Response(JSON.stringify({ error: 'password_required' }), {
        status: 401,
        headers: { 'content-type': 'application/json; charset=utf-8' }
      });
    }
  }

  const mdRes = await context.env.ASSETS.fetch(new URL(`/${post.path}`, url.origin));
  if (!mdRes.ok) {
    return new Response(JSON.stringify({ error: 'markdown file not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }

  const content = await mdRes.text();
  return new Response(JSON.stringify({ ...post, content }), {
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}
