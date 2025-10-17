import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Criterion - Quran & Hadith Powered AI Assistant',
  description: 'Learn about Criterion, an open-source AI assistant that helps people understand Islam through authentic sources. Built with RAG technology using 6,236 Quran verses and 12,416 Hadiths.',
  keywords: [
    'Islamic AI assistant',
    'Quran chatbot',
    'Hadith search',
    'Islamic education',
    'open source Islam',
    'authentic Islamic sources',
  ],
};

export default function AboutPage() {
  return (
    <div className="prose prose-gray dark:prose-invert max-w-none">
      <h1>About Criterion</h1>
      
      <p className="lead">
        Criterion is an AI-powered Islamic knowledge assistant that helps people 
        understand Islam through authentic sources: the Quran and Hadith.
      </p>

      <h2>Our Mission</h2>
      <p>
        We believe that understanding Islam should be accessible to everyone—whether 
        you're a curious seeker, a new Muslim, or someone deepening their knowledge. 
        Criterion bridges the gap between Islamic scholarship and modern technology, 
        making it easy to explore the Quran and Hadith through natural conversation.
      </p>

      <h2>What Makes Us Different</h2>
      
      <h3>📖 Authentic Sources</h3>
      <p>
        Every answer is grounded in verified Islamic texts:
      </p>
      <ul>
        <li><strong>6,236 Quran verses</strong> - Complete Arabic text with English translations</li>
        <li><strong>12,416 Hadiths</strong> - From Sahih Bukhari, Sahih Muslim, and other authentic collections</li>
        <li>All references include citations with direct links to Quran.com and Sunnah.com</li>
      </ul>

      <h3>🔍 Semantic Search (RAG Technology)</h3>
      <p>
        Unlike traditional keyword search, our AI understands the <em>meaning</em> of your question. 
        Ask "What does Islam say about patience?" and we'll find relevant verses and hadiths even 
        if they don't contain the exact word "patience."
      </p>
      <p>
        We use advanced Retrieval Augmented Generation (RAG) with:
      </p>
      <ul>
        <li>Vector embeddings for semantic similarity</li>
        <li>Hybrid search (semantic + keyword matching)</li>
        <li>Contextual retrieval - surrounding verses for proper understanding</li>
      </ul>

      <h3>🎯 Contextual Understanding</h3>
      <p>
        We don't just retrieve isolated verses. For Quran results, we include surrounding 
        verses to prevent out-of-context interpretations. For Hadiths, we default to 
        Sahih (most authentic) narrations.
      </p>

      <h3>🌐 Open Source</h3>
      <p>
        Criterion is completely open source. Our code, data sources, and methodology are 
        transparent and available for review, contribution, and learning.
      </p>
      <p>
        <a 
          href="https://github.com/BalajSaleem/criterion"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2"
        >
          View on GitHub →
        </a>
      </p>

      <h2>How It Works</h2>
      <p>
        When you ask a question:
      </p>
      <ol>
        <li>Our AI analyzes your question to understand its meaning</li>
        <li>We search through 6,236 Quran verses and 12,416 Hadiths using semantic similarity</li>
        <li>The most relevant passages are retrieved with proper context</li>
        <li>Our AI generates a response grounded in these authentic sources</li>
        <li>Every claim is cited with references you can verify</li>
      </ol>
      <p>
        <Link href="/how-it-works">Learn more about our technology →</Link>
      </p>

      <h2>Our Approach</h2>
      <p>
        Criterion acts as a knowledgeable and compassionate <em>Da'i</em> (invitor to Islam):
      </p>
      <ul>
        <li><strong>Humble</strong> - We acknowledge limitations and encourage seeking scholars for complex issues</li>
        <li><strong>Authentic</strong> - Only verified Quran verses and Sahih hadiths</li>
        <li><strong>Contextual</strong> - Never out-of-context quotes</li>
        <li><strong>Respectful</strong> - Patient and welcoming to all questions</li>
        <li><strong>Focused</strong> - Emphasize fundamentals (<em>aqaid</em>) and guidance (<em>hidaya</em>)</li>
      </ul>

      <h2>Who We're For</h2>
      <ul>
        <li><strong>Curious non-Muslims</strong> learning about Islam</li>
        <li><strong>New Muslims</strong> seeking guidance</li>
        <li><strong>Students</strong> studying Islamic texts</li>
        <li><strong>Muslims</strong> deepening their understanding</li>
        <li><strong>Researchers</strong> exploring Islamic knowledge</li>
      </ul>

      <h2>Technology</h2>
      <p>
        Built with modern AI and web technologies:
      </p>
      <ul>
        <li><strong>Frontend:</strong> Next.js 15, React 19, TypeScript</li>
        <li><strong>AI:</strong> GPT-4o Mini, Gemini embeddings, Vercel AI SDK</li>
        <li><strong>Search:</strong> PostgreSQL with pgvector (HNSW index)</li>
        <li><strong>Hosting:</strong> Vercel, Neon Database</li>
      </ul>
      <p>
        <Link href="/developers">Read our technical documentation →</Link>
      </p>

      <h2>Get Started</h2>
      <div className="not-prose my-8 grid gap-4 sm:grid-cols-3">
        <Link
          href="/"
          className="rounded-lg border p-4 transition-colors hover:bg-muted"
        >
          <h3 className="mb-2 font-semibold">Start Chatting</h3>
          <p className="text-sm text-muted-foreground">
            Ask questions and get answers grounded in Quran & Hadith
          </p>
        </Link>
        <Link
          href="/search"
          className="rounded-lg border p-4 transition-colors hover:bg-muted"
        >
          <h3 className="mb-2 font-semibold">Search by Theme</h3>
          <p className="text-sm text-muted-foreground">
            Find verses and hadiths about any topic
          </p>
        </Link>
        <Link
          href="/quran"
          className="rounded-lg border p-4 transition-colors hover:bg-muted"
        >
          <h3 className="mb-2 font-semibold">Browse Quran</h3>
          <p className="text-sm text-muted-foreground">
            Read all 114 Surahs with Arabic & English
          </p>
        </Link>
      </div>

      <h2>Questions?</h2>
      <p>
        Check our <Link href="/faq">Frequently Asked Questions</Link> or explore our{' '}
        <Link href="/developers">developer documentation</Link>.
      </p>
    </div>
  );
}
