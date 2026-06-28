import { getDayRateBenchmarks, totalBenchmarkSample } from './benchmarks.js';
import { BLOG_MODEL, generateContent, generateMeta } from './generate.js';
import { markdownToPortableText } from './portable-text.js';
import { researchTopic } from './research.js';
import {
  createPost,
  getCoveredTopics,
  isTopicCovered,
  lookupOrCreateAuthor,
  sanityConfigured,
} from './sanity.js';
import {
  BLOG_TOPICS,
  type BlogTopic,
  isIr35GuidanceCategory,
} from './topics.js';
import { validatePost } from './validator.js';

// The blog's AI author persona (a real Sanity author doc, for the byline/bio).
const AUTHOR = {
  name: 'The outsideir35jobs.com Team',
  title: 'Editorial',
  bio: 'Practical guidance for UK limited-company contractors who want outside-IR35 work. We surface what clients state and what is objectively checkable — we never determine IR35 status.',
};

const pickTopic = (
  covered: Set<string>,
  override?: string,
): BlogTopic | null => {
  if (override) {
    const exact = BLOG_TOPICS.find((t) => t.topic === override);
    if (exact) return exact;
    const sub = BLOG_TOPICS.find((t) =>
      t.topic.toLowerCase().includes(override.toLowerCase()),
    );
    return sub ?? null;
  }
  const uncovered = BLOG_TOPICS.filter((t) => !covered.has(t.topic));
  if (uncovered.length === 0) return null;
  // Deterministic-ish pick without Math.random (unavailable): rotate by covered count.
  return uncovered[covered.size % uncovered.length];
};

export type BlogCronResult = {
  status: 'written' | 'dryRun' | 'skipped' | 'rejected';
  topic?: string;
  postId?: string;
  reason?: string;
};

/**
 * One blog generation run: pick an uncovered topic → research (Perplexity) →
 * generate (Claude) → validate (honesty backstop) → write to Sanity. A
 * data-backed topic is aborted unless the day-rate benchmark clears MIN_SAMPLE.
 * A post failing the validator is REJECTED, never written.
 */
export const runBlogCron = async (opts?: {
  topicOverride?: string;
  dryRun?: boolean;
  todayIso?: string;
}): Promise<BlogCronResult> => {
  const dryRun = opts?.dryRun ?? false;
  const todayIso = opts?.todayIso ?? new Date().toISOString();

  if (!sanityConfigured && !dryRun) {
    console.warn('[blog-cron] Sanity not configured — skipping');
    return { status: 'skipped', reason: 'sanity_not_configured' };
  }

  const coveredList =
    dryRun && opts?.topicOverride ? [] : await getCoveredTopics();
  const covered = new Set(coveredList);
  const topic = pickTopic(covered, opts?.topicOverride);
  if (!topic) {
    console.info('[blog-cron] no uncovered topic — nothing to do');
    return { status: 'skipped', reason: 'no_uncovered_topic' };
  }

  // Race-guard: re-check (unless overriding/dry-running a specific topic).
  if (!opts?.topicOverride && (await isTopicCovered(topic.topic))) {
    return { status: 'skipped', topic: topic.topic, reason: 'already_covered' };
  }

  const isIr35Guidance = isIr35GuidanceCategory(topic.category);

  // Data-backed gate: a day-rate post only proceeds if the benchmark clears the
  // sample-size gate. Otherwise abort honestly (no thin-data stats post).
  const benchmarks = topic.dataBacked ? await getDayRateBenchmarks() : [];
  const benchmarkSample = totalBenchmarkSample(benchmarks);
  if (topic.dataBacked && benchmarkSample < 5) {
    console.info(
      `[blog-cron] data-backed topic "${topic.topic}" aborted: only ${benchmarkSample} samples`,
    );
    return {
      status: 'skipped',
      topic: topic.topic,
      reason: 'insufficient_data',
    };
  }

  const research = await researchTopic(topic, todayIso);
  const meta = await generateMeta(topic);
  const content = await generateContent({
    topic,
    research,
    benchmarks,
    isIr35Guidance,
  });

  // Honesty backstop — reject (do NOT write) if it fails.
  const verdict = validatePost({
    markdown: content.markdown,
    isIr35Guidance,
    dataBacked: topic.dataBacked,
    benchmarkSampleCount: benchmarkSample,
  });
  if (!verdict.ok) {
    console.error(
      `[blog-cron] REJECTED "${topic.topic}" — honesty violations:`,
      JSON.stringify(verdict.violations),
    );
    // Surface to Sentry via a thrown error in the caller; here we return rejected.
    return {
      status: 'rejected',
      topic: topic.topic,
      reason: verdict.violations.map((v) => v.kind).join(','),
    };
  }

  const body = markdownToPortableText(content.markdown);

  if (dryRun) {
    console.info('[blog-cron] DRY RUN — would write post:', {
      topic: topic.topic,
      title: meta.title,
      slug: meta.slug,
      wordCount: content.wordCount,
      blocks: body.length,
      dataBacked: topic.dataBacked,
      benchmarkSample,
      researched: Boolean(research),
    });
    return { status: 'dryRun', topic: topic.topic };
  }

  const authorId = await lookupOrCreateAuthor(AUTHOR);
  const postId = await createPost({
    title: meta.title,
    slug: meta.slug,
    excerpt: meta.excerpt,
    body,
    authorId,
    publishedAt: todayIso,
    seo: {
      metaTitle: meta.title,
      metaDescription: meta.metaDescription,
      keywords: meta.keywords,
    },
    generationMeta: {
      topic: topic.topic,
      generatedAt: todayIso,
      model: BLOG_MODEL,
      sourcesCheckedAt: research?.sourcesCheckedAt ?? null,
      dataBacked: topic.dataBacked,
    },
  });

  console.info(`[blog-cron] published "${meta.title}" (${postId})`);
  return { status: 'written', topic: topic.topic, postId };
};
