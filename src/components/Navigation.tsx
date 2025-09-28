import Link from 'next/link';

export default function Navigation() {
  return (
    <nav className="bg-[var(--card)] border-b border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link 
            href="/" 
            className="text-xl font-bold bg-gradient-to-r from-[var(--fg)] to-[var(--accent)] bg-clip-text text-transparent hover:from-[var(--accent)] hover:to-[var(--fg)] transition-all duration-200"
          >
            sopakcosauce-blogs
          </Link>
          
          <div className="flex gap-6">
            <Link 
              href="/" 
              className="text-[var(--sub)] hover:text-[var(--accent)] transition-colors font-medium"
            >
              Home
            </Link>
            <Link 
              href="/handlebars-pronouns-converter" 
              className="text-[var(--sub)] hover:text-[var(--accent)] transition-colors font-medium"
            >
              Converter
            </Link>
            <a
              href="https://app.wyvern.chat/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--sub)] hover:text-[var(--accent)] transition-colors font-medium"
            >
              🐉 WyvernChat
            </a>
            <a
              href="https://sopakcosauce.gitbook.io/sopakcosauce-docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--sub)] hover:text-[var(--accent)] transition-colors font-medium"
            >
              📚 Docs
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}