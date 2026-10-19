export const EMBEDDING_DIMENSIONS = 768;

export type ScholarlySource = "islamqa";

export type ScholarlyEntry = {
  id: string;
  source: ScholarlySource;
  title: string;
  question: string;
  answer: string;
  topic: string;
  url: string;
};

export const SCHOLARLY_SOURCES: Record<
  ScholarlySource,
  { name: string; supervisor: string; license: string }
> = {
  islamqa: {
    name: "IslamQA.info",
    supervisor: "Sheikh Muhammad Salih al-Munajjid",
    license: "CC BY-NC 4.0",
  },
};

/**
 * Topics left out of the index on purpose. Muslim mode sticks to the clear,
 * agreed-upon path, so categories that are sectarian, political, punitive or
 * well known for strong scholarly disagreement are not retrieved at all.
 */
export const EXCLUDED_TOPICS = [
  "Alliance and amity disavowal and enmity",
  "Apostasy",
  "Schools of thought and sects",
  "Schools of thought and religions",
  "Religions",
  "Islamic politics",
  "Rulings on jihaad",
  "Striving and migrating for the sake of allaah",
  "Punishment and judicial sentences",
  "Hadd punishment for slander",
  "Felonies",
  "Slavery",
  "Innovations in religion and worship",
  "Condemnation of singing and musical instruments",
  "Images and image making",
  "Rulings on art and acting",
  "Names and attributes of allah",
];
