import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How Criterion Works - RAG-Powered Islamic AI',
  description: 'Learn how Criterion uses Retrieval Augmented Generation (RAG) to provide accurate answers from the Quran and Hadith. Understand our semantic search technology.',
  keywords: [
    'RAG technology',
    'semantic search Islam',
    'vector search Quran',
    'AI Islamic assistant',
    'how chatbot works',
  ],
};

export default function HowItWorksPage() {
  return (
    <div className="prose prose-gray dark:prose-invert max-w-none">
      <h1>How Criterion Works</h1>
      
      <p className="lead">
        Criterion combines modern AI with authentic Islamic texts to help you explore 
        Islam. Here's how our technology works in simple terms.
      </p>

      <h2>The Big Picture</h2>
      <p>
        When you ask a question, Criterion doesn't just look for keywords. Instead, it:
      </p>
      <ol>
        <li><strong>Understands</strong> the meaning of your question</li>
        <li><strong>Searches</strong> through 6,236 Quran verses and 12,416 Hadiths</li>
        <li><strong>Retrieves</strong> the most relevant passages with context</li>
        <li><strong>Generates</strong> a response grounded in these authentic sources</li>
        <li><strong>Cites</strong> every reference so you can verify</li>
      </ol>

      <h2>Semantic Search (Understanding Meaning)</h2>
      
      <h3>Traditional Search (Keywords)</h3>
      <p>
        Most search engines look for exact words. If you search "afterlife," they only 
        find verses with the word "afterlife."
      </p>
      
      <h3>Semantic Search (Meaning)</h3>
      <p>
        Criterion understands <em>concepts</em>. Search for "afterlife" and we'll also find:
      </p>
      <ul>
        <li>"Day of Judgment"</li>
        <li>"Paradise and Hell"</li>
        <li>"Resurrection"</li>
        <li>"The Hereafter"</li>
      </ul>
      <p>
        This works because we convert all text into mathematical representations called 
        "embeddings" that capture meaning, not just words.
      </p>

      <h2>RAG Technology (Retrieval Augmented Generation)</h2>
      
      <p>
        RAG is the secret sauce that makes Criterion reliable. Here's the difference:
      </p>

      <div className="not-prose my-6">
        <div className="rounded-lg border p-4 mb-4">
          <h4 className="font-semibold mb-2 text-red-600 dark:text-red-400">
            ❌ Regular AI Chatbots
          </h4>
          <p className="text-sm text-muted-foreground">
            Generate answers from training data → can hallucinate → no sources → unreliable
          </p>
        </div>
        
        <div className="rounded-lg border p-4 bg-green-50 dark:bg-green-950">
          <h4 className="font-semibold mb-2 text-green-600 dark:text-green-400">
            ✅ Criterion (RAG-Powered)
          </h4>
          <p className="text-sm text-muted-foreground">
            Retrieve authentic texts first → generate answer from retrieved texts → cite sources → reliable
          </p>
        </div>
      </div>

      <h3>Step-by-Step: What Happens When You Ask</h3>
      
      <h4>1. Question Analysis</h4>
      <p>
        Your question is converted into an embedding (a list of numbers representing its meaning).
      </p>
      <p className="text-sm text-muted-foreground">
        Example: "What does Islam say about patience?" → [0.23, -0.45, 0.78, ...]
      </p>

      <h4>2. Similarity Search</h4>
      <p>
        We compare your question's embedding with embeddings of all 6,236 Quran verses 
        and 12,416 Hadiths using vector similarity (cosine distance).
      </p>
      <p>
        The most similar passages are retrieved. For Quran, we use <strong>hybrid search</strong>:
      </p>
      <ul>
        <li><strong>Vector search</strong> - finds semantic matches</li>
        <li><strong>Keyword search</strong> - finds exact terms (important for names like "Moses" or "Abu Bakr")</li>
        <li>Both results are merged using Reciprocal Rank Fusion</li>
      </ul>

      <h4>3. Context Enhancement</h4>
      <p>
        For top Quran results, we fetch surrounding verses (±2 verses) to avoid out-of-context 
        interpretations. A verse about patience might make more sense with the verses before 
        and after it.
      </p>

      <h4>4. Response Generation</h4>
      <p>
        The AI (GPT-4o Mini) receives:
      </p>
      <ul>
        <li>Your original question</li>
        <li>Retrieved verses and hadiths with context</li>
        <li>System instructions to act as a knowledgeable Da'i</li>
      </ul>
      <p>
        It generates a response using <em>only</em> the retrieved information—no making things up!
      </p>

      <h4>5. Citation & Verification</h4>
      <p>
        Every verse and hadith mentioned includes:
      </p>
      <ul>
        <li>Surah:Ayah reference (e.g., Al-Baqarah 2:153)</li>
        <li>Direct link to Quran.com or Sunnah.com</li>
        <li>Full Arabic text + English translation</li>
        <li>Hadith grading (Sahih, Hasan, etc.)</li>
      </ul>

      <h2>Our Data Sources</h2>
      
      <h3>Quran (6,236 verses)</h3>
      <ul>
        <li><strong>Arabic:</strong> Tanzil Quran Text (v1.1)</li>
        <li><strong>English:</strong> Verified translation</li>
        <li><strong>Structure:</strong> 114 Surahs, organized by Surah:Ayah</li>
      </ul>

      <h3>Hadith (12,416 narrations)</h3>
      <ul>
        <li><strong>Sahih Bukhari:</strong> 7,558 hadiths</li>
        <li><strong>Sahih Muslim:</strong> 2,920 hadiths</li>
        <li><strong>40 Hadith Nawawi:</strong> 42 hadiths</li>
        <li><strong>Riyadh as-Salihin:</strong> 1,896 hadiths</li>
      </ul>
      <p>
        All hadiths include narrator chains, grading (authenticity), and references.
      </p>

      <h2>Quality Safeguards</h2>
      
      <h3>1. Authenticity Filter</h3>
      <p>
        By default, we only show <strong>Sahih</strong> (most authentic) hadiths. You can 
        adjust this if needed.
      </p>

      <h3>2. Context Windows</h3>
      <p>
        Top Quran results include ±2 surrounding verses to prevent misinterpretation.
      </p>

      <h3>3. Similarity Threshold</h3>
      <p>
        Only passages with {'>'}30% similarity to your question are shown. If we can't find 
        relevant passages, we say so rather than making things up.
      </p>

      <h3>4. Citation Required</h3>
      <p>
        Our AI is instructed to <em>always</em> cite sources. If it can't find relevant 
        texts, it admits it rather than guessing.
      </p>

      <h2>Performance</h2>
      <ul>
        <li><strong>Search speed:</strong> 100-150ms per query</li>
        <li><strong>Accuracy:</strong> Top result typically {'>'}75% relevant</li>
        <li><strong>Coverage:</strong> Complete Quran + major authentic hadith collections</li>
      </ul>

      <h2>Limitations & Honesty</h2>
      <p>
        We're transparent about what Criterion <em>can't</em> do:
      </p>
      <ul>
        <li><strong>Not a scholar:</strong> Complex legal (fiqh) questions need human scholars</li>
        <li><strong>English-focused:</strong> Arabic queries may not work as well (coming soon!)</li>
        <li><strong>No Tafsir yet:</strong> We show verses but not scholarly commentary (planned)</li>
        <li><strong>Limited to texts:</strong> Can't access knowledge outside our database</li>
      </ul>

      <h2>Future Improvements</h2>
      <p>
        We're constantly improving Criterion:
      </p>
      <ul>
        <li>Multilingual support (Arabic, Urdu, French, etc.)</li>
        <li>Tafsir (commentary) integration</li>
        <li>More hadith collections</li>
        <li>Contextual chunk embeddings (+35% accuracy)</li>
        <li>Advanced reranking</li>
      </ul>

      <h2>Try It Yourself</h2>
      <div className="not-prose my-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/"
          className="rounded-lg border p-4 transition-colors hover:bg-muted"
        >
          <h3 className="mb-2 font-semibold">Chat Assistant</h3>
          <p className="text-sm text-muted-foreground">
            Ask natural questions and get answers with citations
          </p>
        </Link>
        <Link
          href="/quran/search"
          className="rounded-lg border p-4 transition-colors hover:bg-muted"
        >
          <h3 className="mb-2 font-semibold">Theme Search</h3>
          <p className="text-sm text-muted-foreground">
            See RAG in action - search by topic
          </p>
        </Link>
      </div>

      <h2>Technical Deep Dive</h2>
      <p>
        Developers can explore our open-source codebase:
      </p>
      <ul>
        <li><Link href="/developers">Developer Documentation</Link></li>
        <li>
          <a 
            href="https://github.com/BalajSaleem/criterion"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub Repository →
          </a>
        </li>
      </ul>
    </div>
  );
}
