import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-[var(--fg)] to-[var(--accent)] bg-clip-text text-transparent">
            sopakcosauce-blogs
          </h1>
          <p className="text-[var(--sub)] text-lg">
            Welcome to the looney bin.
          </p>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-[var(--fg)] mb-6">Available Posts</h2>
          
          <div className="grid gap-6">
            <Link 
              href="/handlebars-pronouns-converter"
              className="block p-6 bg-[var(--card)] border border-[var(--border)] rounded-xl hover:border-[var(--accent)] transition-colors"
            >
              <h3 className="text-xl font-semibold text-[var(--fg)] mb-2">
                Handlebars Pronouns Converter
              </h3>
              <p className="text-[var(--sub)]">
                Smart pronoun-to-macro conversion for WyvernChat templates
              </p>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
