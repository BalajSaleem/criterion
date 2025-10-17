import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Developers - Criterion Open Source',
  description: 'Criterion is open source. Explore our code, contribute, or build your own Islamic AI applications.',
  keywords: [
    'open source Islamic AI',
    'Criterion GitHub',
    'contribute',
    'RAG implementation',
    'Next.js AI',
  ],
};

export default function DevelopersPage() {
  return (
    <div className="prose prose-gray dark:prose-invert max-w-none">
      <h1>Developers</h1>
      
      <p className="lead">
        Criterion is fully open source. Built to help people understand Islam through 
        authentic sources using modern AI technology.
      </p>

      <div className="not-prose my-8 rounded-lg border-2 border-primary bg-primary/5 p-6 text-center">
        <h2 className="mb-2 text-2xl font-bold">Open Source on GitHub</h2>
        <p className="mb-4 text-muted-foreground">
          Explore our code, contribute, or learn how we built it
        </p>
        <a
          href="https://github.com/BalajSaleem/criterion"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          View on GitHub →
        </a>
      </div>

      <h2>What is Criterion?</h2>
      <p>
        An AI assistant that helps people learn about Islam through:
      </p>
      <ul>
        <li><strong>6,236 Quran verses</strong> - Full Arabic text with English translations</li>
        <li><strong>12,416 Hadiths</strong> - From authentic collections (Sahih Bukhari, Muslim, etc.)</li>
        <li><strong>Semantic search</strong> - Find verses and hadiths by meaning, not just keywords</li>
        <li><strong>RAG technology</strong> - Grounded responses with citations</li>
      </ul>

      <h2>Why Open Source?</h2>
      <ul>
        <li><strong>Transparency</strong> - Anyone can verify our sources and methodology</li>
        <li><strong>Trust</strong> - Open code builds confidence in authenticity</li>
        <li><strong>Education</strong> - Learn how to build AI applications with RAG</li>
        <li><strong>Collaboration</strong> - Community can improve and extend the project</li>
        <li><strong>Islamic values</strong> - Knowledge should be shared freely</li>
      </ul>

      <h2>Tech Stack</h2>
      <ul>
        <li><strong>Frontend:</strong> Next.js 15, React 19, TypeScript, Tailwind CSS</li>
        <li><strong>AI:</strong> GPT-4o Mini, Gemini embeddings, Vercel AI SDK</li>
        <li><strong>Search:</strong> PostgreSQL + pgvector (HNSW index)</li>
        <li><strong>Hosting:</strong> Vercel, Neon Database</li>
      </ul>

      <h2>How to Contribute</h2>
      <ol>
        <li>Fork the repository on GitHub</li>
        <li>Clone and set up locally (see README)</li>
        <li>Pick an issue or suggest a feature</li>
        <li>Make your changes and test</li>
        <li>Submit a pull request</li>
      </ol>
      <p>
        All contributions welcome - features, bug fixes, documentation, or ideas!
      </p>

      <h2>Documentation</h2>
      <p>
        Check the repository for detailed documentation:
      </p>
      <ul>
        <li><code>README.md</code> - Quick start guide</li>
        <li><code>CRITERION.md</code> - System overview</li>
        <li><code>CRITERION_DETAILED.md</code> - Technical deep dive</li>
      </ul>

      <div className="not-prose my-8 grid gap-4 sm:grid-cols-2">
        <a
          href="https://github.com/BalajSaleem/criterion/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border p-4 transition-colors hover:bg-muted"
        >
          <h3 className="mb-2 font-semibold">Report Issues</h3>
          <p className="text-sm text-muted-foreground">
            Found a bug? Have a feature request? Let us know
          </p>
        </a>
        <a
          href="https://github.com/BalajSaleem/criterion/discussions"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border p-4 transition-colors hover:bg-muted"
        >
          <h3 className="mb-2 font-semibold">Join Discussions</h3>
          <p className="text-sm text-muted-foreground">
            Ask questions, share ideas, or help others
          </p>
        </a>
      </div>

      <h2>License</h2>
      <p>
        Criterion is open source. Check the{' '}
        <a 
          href="https://github.com/BalajSaleem/criterion/blob/main/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
        >
          LICENSE
        </a>
        {' '}file for details.
      </p>
    </div>
  );
}
