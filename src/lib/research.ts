export type ResearchInput = {
  topic: string;
  industry?: string;
  region?: string;
  recencyDays?: number;
};

export async function fetchResearch(input: ResearchInput) {
  const res = await fetch("/api/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  // We always get a 200+JSON from our server even on model errors
  // (it returns a valid contract with notes)
  const data = await res.json();
  return data;
}
