import Link from 'next/link';

export default function Navigation() {
  return (
    <nav className="bg-[var(--card)] border-b border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <Link 
            href="/" 
            className="text-xl font-bold bg-gradient-to-r from-[var(--fg)] to-[var(--accent)] bg-clip-text text-transparent hover:from-[var(--accent)] hover:to-[var(--fg)] transition-all duration-200 text-center lg:text-left"
          >
            SopakcoSauce Blogs
          </Link>
          
          <div className="flex flex-wrap justify-center lg:justify-end gap-3 lg:gap-6">
            <Link 
              href="/" 
              className="px-3 py-2 text-[var(--fg)] hover:text-[var(--accent)] hover:bg-[var(--hover)] transition-all duration-200 font-medium rounded-md text-sm lg:text-base"
            >
              Home
            </Link>
            <Link 
              href="/handlebars-pronouns-converter" 
              className="px-3 py-2 text-[var(--fg)] hover:text-[var(--accent)] hover:bg-[var(--hover)] transition-all duration-200 font-medium rounded-md text-sm lg:text-base"
            >
              Converter
            </Link>
            <a
              href="https://app.wyvern.chat/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 text-[var(--fg)] hover:text-[var(--accent)] hover:bg-[var(--hover)] transition-all duration-200 font-medium rounded-md text-sm lg:text-base flex items-center gap-1"
            >
              <span>🐉</span>
              <span className="hidden sm:inline">WyvernChat</span>
              <span className="sm:hidden">Wyvern</span>
            </a>
            <a
              href="https://sopakcosauce.gitbook.io/sopakcosauce-docs"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 text-[var(--fg)] hover:text-[var(--accent)] hover:bg-[var(--hover)] transition-all duration-200 font-medium rounded-md text-sm lg:text-base flex items-center gap-1"
            >
              <span>📚</span>
              <span>Docs</span>
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}