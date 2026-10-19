import { tool } from "ai";
import { z } from "zod";
import { SCHOLARLY_SOURCES } from "@/lib/scholarly/config";
import { findScholarlyAnswers } from "@/lib/scholarly/search";

export const searchScholarlyAnswers = tool({
  description: `Search answers written by qualified scholars to questions Muslims have asked (fatwas) on worship, purification, prayer,
  fasting, zakah, hajj, family, marriage, finance, food, character, repentance and everyday life.
  Each answer explains the ruling with its evidence from the Quran and Sunnah and often cites the positions of the four schools of fiqh.
  Use this for practical "what is the ruling / how do I / is it allowed" questions, and for detailed questions that go beyond a single verse or hadith.
  Phrase the query like the question a Muslim would ask (e.g. "Does using an asthma inhaler break the fast?").`,

  inputSchema: z.object({
    question: z
      .string()
      .describe("The question, phrased the way a Muslim would ask it"),
  }),

  execute: async ({ question }) => {
    const answers = await findScholarlyAnswers(question);

    if (answers.length === 0) {
      return {
        success: false as const,
        message: "No closely matching scholarly answer found.",
      };
    }

    return {
      success: true as const,
      answers: answers.map((a) => ({
        title: a.title,
        question: a.question,
        answer: a.answer,
        topic: a.topic,
        url: a.url,
        source: SCHOLARLY_SOURCES[a.source].name,
        supervisor: SCHOLARLY_SOURCES[a.source].supervisor,
        relevance: `${(a.similarity * 100).toFixed(0)}%`,
      })),
    };
  },
});
