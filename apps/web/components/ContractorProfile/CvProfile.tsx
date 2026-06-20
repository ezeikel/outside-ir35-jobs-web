import type { ParsedCvProfile } from './ContractorProfile';

/**
 * Read-only display of the AI-parsed CV profile. These are the CONTRACTOR'S OWN
 * stated facts pulled from their CV — clearly labelled as such, never presented
 * as platform-verified, and unrelated to IR35 status (see docs/ir35-trust-model).
 */
const CvProfile = ({ profile }: { profile: ParsedCvProfile }) => {
  const skills = profile.skills ?? [];
  const experience = profile.experience ?? [];
  const sectors = profile.sectors ?? [];
  const hasAnything =
    profile.headline ||
    skills.length > 0 ||
    experience.length > 0 ||
    sectors.length > 0;

  if (!hasAnything) return null;

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">From your CV</p>
        <p className="text-xs text-muted-foreground">
          Self-reported — not verified by us
        </p>
      </div>

      {profile.headline ? (
        <p className="mb-3 text-sm text-foreground/90">{profile.headline}</p>
      ) : null}

      {(profile.seniority || profile.yearsExperience != null) && (
        <p className="mb-3 text-xs text-muted-foreground">
          {[
            profile.seniority,
            profile.yearsExperience != null
              ? `${profile.yearsExperience} yrs experience`
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}

      {skills.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            Skills
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <li
                key={skill}
                className="rounded-full border border-border px-2.5 py-0.5 text-xs text-foreground/80"
              >
                {skill}
              </li>
            ))}
          </ul>
        </div>
      )}

      {experience.length > 0 && (
        <div className="mb-1">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            Experience
          </p>
          <ul className="space-y-2">
            {experience.map((exp) => (
              <li key={`${exp.title}-${exp.company ?? ''}-${exp.period ?? ''}`}>
                <p className="text-sm font-medium">
                  {exp.title}
                  {exp.company ? (
                    <span className="font-normal text-muted-foreground">
                      {' '}
                      · {exp.company}
                    </span>
                  ) : null}
                </p>
                {exp.period ? (
                  <p className="text-xs text-muted-foreground">{exp.period}</p>
                ) : null}
                {exp.summary ? (
                  <p className="text-sm text-foreground/80">{exp.summary}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {sectors.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Sectors: {sectors.join(', ')}
        </p>
      )}
    </section>
  );
};

export default CvProfile;
