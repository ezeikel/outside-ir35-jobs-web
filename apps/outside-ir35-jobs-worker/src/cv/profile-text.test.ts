import { describe, expect, it } from 'vitest';
import {
  normalizeSkills,
  type ParsedProfile,
  profileEmbeddingText,
} from './profile-text.js';

describe('normalizeSkills', () => {
  it('trims, collapses whitespace, and drops blanks', () => {
    expect(normalizeSkills(['  React ', 'Node  JS', '', '   '])).toEqual([
      'React',
      'Node JS',
    ]);
  });

  it('de-dupes case-insensitively, keeping first-seen casing', () => {
    expect(normalizeSkills(['AWS', 'aws', 'Terraform', 'terraform'])).toEqual([
      'AWS',
      'Terraform',
    ]);
  });

  it('caps the count', () => {
    const many = Array.from({ length: 50 }, (_, i) => `skill${i}`);
    expect(normalizeSkills(many, 10)).toHaveLength(10);
  });
});

const base: ParsedProfile = {
  headline: 'Senior cloud engineer',
  seniority: 'Senior',
  yearsExperience: 8,
  skills: ['AWS', 'Terraform', 'Kubernetes'],
  experience: [
    {
      title: 'Lead DevOps Engineer',
      company: 'Acme',
      period: '2021–2023',
      summary: 'Built CI/CD',
    },
  ],
  sectors: ['fintech'],
};

describe('profileEmbeddingText', () => {
  it('includes competency fields (headline, skills, titles, sectors)', () => {
    const text = profileEmbeddingText(base);
    expect(text).toContain('Senior cloud engineer');
    expect(text).toContain('AWS, Terraform, Kubernetes');
    expect(text).toContain('Lead DevOps Engineer — Acme — Built CI/CD');
    expect(text).toContain('fintech');
  });

  it('omits empty fields cleanly (no stray separators)', () => {
    const text = profileEmbeddingText({
      ...base,
      headline: null,
      seniority: null,
      sectors: [],
      experience: [
        { title: 'Engineer', company: null, period: null, summary: null },
      ],
    });
    expect(text).toBe('AWS, Terraform, Kubernetes\nEngineer');
  });

  it('returns empty string for an empty profile', () => {
    expect(
      profileEmbeddingText({
        headline: null,
        seniority: null,
        yearsExperience: null,
        skills: [],
        experience: [],
        sectors: [],
      }),
    ).toBe('');
  });
});
