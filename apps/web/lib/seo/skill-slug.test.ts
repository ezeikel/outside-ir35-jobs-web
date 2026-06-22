import { describe, expect, it } from 'vitest';
import { skillDisplay, skillToSlug } from './skill-slug';

describe('skillToSlug', () => {
  it('slugifies common skills URL-safely', () => {
    expect(skillToSlug('React')).toBe('react');
    expect(skillToSlug('node.js')).toBe('node-js');
    expect(skillToSlug('AWS Lambda')).toBe('aws-lambda');
    expect(skillToSlug('C#')).toBe('c-sharp');
    expect(skillToSlug('C++')).toBe('c-plus-plus');
    expect(skillToSlug('CI/CD')).toBe('ci-cd');
  });

  it('collapses dashes and trims', () => {
    expect(skillToSlug('  Spring   Boot  ')).toBe('spring-boot');
    expect(skillToSlug('.NET')).toBe('net');
  });
});

describe('skillDisplay', () => {
  it('title-cases words but uppercases known acronyms', () => {
    expect(skillDisplay('react')).toBe('React');
    expect(skillDisplay('aws lambda')).toBe('AWS Lambda');
    expect(skillDisplay('spring boot')).toBe('Spring Boot');
  });
});
