import type { Metadata } from "next";
import { createFAQSchema } from "@/lib/seo/schema";

const faqs = [
  {
    question: "What is Criterion?",
    answer:
      "Criterion is an open-source AI-powered assistant that helps you understand Islam through authentic sources. We use advanced semantic search across 6,236 Quran verses and 12,416 authentic Hadiths to provide accurate, contextual answers to your questions about Islamic teachings.",
  },
  {
    question: "Is the information authentic?",
    answer:
      "Yes. All Quran verses are from verified translations, and Hadiths are primarily from Sahih (authentic) collections including Sahih Bukhari and Sahih Muslim. Every response includes proper citations with direct links to original sources at Quran.com and Sunnah.com.",
  },
  {
    question: "How does the AI work?",
    answer:
      "We use Retrieval Augmented Generation (RAG) technology. When you ask a question, our AI searches through Islamic texts using semantic understanding (not just keywords), retrieves the most relevant verses and Hadiths, and generates a response grounded in these authentic sources.",
  },
  {
    question: "Can I learn about Islam here if I'm not Muslim?",
    answer:
      "Absolutely! Criterion is designed for everyone curious about Islam—whether you're exploring for the first time, considering converting, or seeking to deepen your understanding. We provide clear explanations with proper context and authentic sources.",
  },
  {
    question: "Is this free to use?",
    answer:
      "Yes, Criterion is completely free and open source. We believe Islamic knowledge should be accessible to everyone without barriers.",
  },
  {
    question: "How do I ask a question?",
    answer:
      "Simply type your question in natural language on the chat interface. Ask anything like 'What does Islam say about patience?' or 'Tell me about prayer in Islam.' The AI will search relevant sources and provide a comprehensive answer with citations.",
  },
  {
    question: "What makes Criterion different from other Islamic websites?",
    answer:
      "Unlike traditional Islamic websites where you browse through content, Criterion lets you ask questions naturally and get AI-powered answers grounded in authentic sources. We also provide surrounding context for verses (not just isolated quotes) and use semantic search to understand the meaning of your question.",
  },
  {
    question: "Can I search for specific verses or topics?",
    answer:
      "Yes! Use our search page to find Quran verses and Hadiths by theme or topic. You can also browse all 114 Surahs in the Quran section. The AI automatically searches these sources when you ask questions in the chat.",
  },
  {
    question: "Who created Criterion?",
    answer:
      "Criterion is an open-source project built by developers passionate about making Islamic knowledge accessible through modern technology. The code is available on GitHub for anyone to review, contribute to, or learn from.",
  },
  {
    question: "How accurate are the translations?",
    answer:
      "We use established English translations for the Quran and Hadiths from recognized Islamic sources. However, we always recommend consulting with knowledgeable scholars for important religious questions, as translations can never fully capture the depth of the original Arabic.",
  },
  {
    question: "Can I use this for religious rulings (fatwa)?",
    answer:
      "While Criterion provides authentic Islamic sources, it should not be used as the sole basis for religious rulings. For specific Islamic legal questions, please consult qualified scholars. Criterion is best used for learning, exploring, and understanding Islamic teachings.",
  },
  {
    question: "Is my conversation private?",
    answer:
      "Yes. Your chat conversations are private by default and are not indexed by search engines or shared publicly.",
  },
];

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Common questions about Criterion, Islam, the Quran, and how our AI-powered Islamic knowledge assistant works.",
  openGraph: {
    title: "FAQ - Criterion",
    description: "Common questions about learning Islam with Criterion's AI assistant.",
  },
};

export default function FAQPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(createFAQSchema(faqs)),
        }}
      />

      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <h1>Frequently Asked Questions</h1>
        <p className="lead">
          Everything you need to know about Criterion and learning Islam through
          our AI-powered assistant.
        </p>

        <div className="space-y-8 mt-8">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b pb-6 last:border-b-0">
              <h2 className="text-xl font-semibold mb-3">{faq.question}</h2>
              <p className="text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 bg-muted rounded-lg">
          <h2 className="text-lg font-semibold">Still have questions?</h2>
          <p className="mb-4">
            Try asking in the chat interface - our AI can help answer specific
            questions about Islamic teachings.
          </p>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Start Chatting
          </a>
        </div>
      </div>
    </>
  );
}
