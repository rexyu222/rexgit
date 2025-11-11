// app/api/chat/route.ts
export async function POST(req: Request) {
  const { message } = await req.json();
  
  // Call your backend
  //const res = await fetch('https://your-backend.com/chat', {
  const res = await fetch('https://proud1776ai.com/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: message })
  });
  const data = await res.json();

  return Response.json({ reply: data.response });
}