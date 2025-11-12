// app/api/chat/route.ts
export async function POST(req: Request) {
  const { message } = await req.json();

  const res = await fetch('https://proud1776ai.com/chat', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      // Forward the session cookie automatically via credentials
    },
    body: JSON.stringify({ prompt: message }),
    credentials: 'include'  // This is key!
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }

  const data = await res.json();
  return Response.json({ reply: data.reply });
}