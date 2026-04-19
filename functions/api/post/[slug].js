export async function onRequestGet(context) {
  const slug = decodeURIComponent(context.params.slug); // ← thêm dòng này
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
