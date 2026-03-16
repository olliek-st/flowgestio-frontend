export default function Signup() {
  return (
    <div className="min-h-screen grid place-items-center bg-gray100">
      <form className="bg-white p-6 rounded-xl shadow-card border w-96 space-y-3">
        <h1 className="text-xl font-semibold">Create your account</h1>
        <input className="border rounded px-3 py-2 w-full" placeholder="Name" />
        <input className="border rounded px-3 py-2 w-full" placeholder="Email" />
        <input type="password" className="border rounded px-3 py-2 w-full" placeholder="Password" />
        <button className="bg-primary text-white px-4 py-2 rounded w-full">Start Free</button>
      </form>
    </div>
  );
}
