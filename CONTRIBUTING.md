# Contributing to Criterion

Thank you for your interest in contributing to Criterion! This Islamic knowledge assistant helps people understand Islam through authentic Quran and Hadith sources.

## Quick Start

```bash
# 1. Fork and clone the repository
git clone https://github.com/BalajSaleem/criterion.git
cd criterion

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env.local
# Add your API keys (see .env.example for details)

# 4. Set up database
pnpm db:migrate
pnpm db:enable-pgvector

# 5. Ingest data (optional but recommended)
pnpm ingest:quran         # ~10 min - 6,236 verses
pnpm ingest:quran:slovak  # ~5 min - Slovak translation
pnpm ingest:hadith        # ~20 min - 12,416 hadiths

# 6. Start development server
pnpm dev
```

## Development Workflow

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**

   - Follow existing code patterns
   - Keep it simple (KISS principle)
   - Write clear, focused code
   - Add comments for the "why", not the "what"

3. **Test thoroughly**

   ```bash
   pnpm test:quran          # Test Quran search
   pnpm test:multilingual   # Test translations
   pnpm lint                # Check code quality
   ```

4. **Commit with clear messages**

   ```bash
   git commit -m "feat: add context toggle for verse pages"
   ```

5. **Push and create a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

## Code Style

- **TypeScript**: Full type safety, no `any`
- **Formatting**: Automatically handled by ultracite
- **Components**: Small, focused, single responsibility
- **Functions**: Pure functions where possible
- **Naming**: Self-explanatory, clear intent

## Important Guidelines

### Islamic Content

- **Accuracy is critical**: Never fabricate verses or hadiths
- **Sources matter**: Always cite properly (Surah:Ayah, hadith references)
- **Respect the text**: Arabic is authoritative, translations are interpretations
- **Da'i personality**: Maintain humble, compassionate, knowledgeable tone
- **Focus on fundamentals**: Avoid controversial or sectarian topics

### Performance

- Use `PerformanceTimer` for new features
- Measure first, optimize later
- Keep queries fast (<200ms)

### Documentation

- Update CRITERION.md for major changes
- Add JSDoc comments for complex functions
- Update CRITERION_DETAILED.md if changing architecture

## Project Structure

Key files to understand:

- `lib/ai/embeddings.ts` - Core RAG logic (Quran + Hadith search)
- `lib/ai/tools/` - LLM tools (queryQuran, queryHadith)
- `lib/ai/prompts.ts` - System prompts and Da'i personality
- `app/(chat)/api/chat/route.ts` - Main chat API
- `lib/db/schema.ts` - Database schema
- `lib/db/queries.ts` - Database query functions

## Common Tasks

### Adding a new tool

1. Create tool file in `lib/ai/tools/`
2. Define Zod schema for input
3. Implement execute function
4. Add to tools list in `app/(chat)/api/chat/route.ts`
5. Update system prompt in `lib/ai/prompts.ts`

### Adding a new translation

1. Prepare data files (text + metadata JSON)
2. Create ingestion script in `scripts/`
3. Update `lib/quran-language.ts`
4. Add command to `package.json`

### Improving search

1. Review `lib/ai/embeddings.ts`
2. Test changes with `scripts/test-*.ts`
3. Monitor performance metrics

## Need Help?

- Read [CRITERION.md](./CRITERION.md) for system overview
- Read [CRITERION_DETAILED.md](./CRITERION_DETAILED.md) for deep dive
- Check existing issues on GitHub
- Review code comments and documentation

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

**Remember**: This project helps people learn about Islam. Treat it with care and respect. ☪️
