export default function Login() {
  return (
    <div className="min-h-screen grid place-items-center bg-gray100">
      <form className="bg-white p-6 rounded-xl shadow-card border w-96 space-y-3">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <input className="border rounded px-3 py-2 w-full" placeholder="Email" />
        <input type="password" className="border rounded px-3 py-2 w-full" placeholder="Password" />
        <button className="bg-primary text-white px-4 py-2 rounded w-full">Sign in</button>
      </form>
    </div>
  );
}
