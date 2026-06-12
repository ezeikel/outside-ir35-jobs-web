'use client';

import { useFormContext } from 'react-hook-form';
import HTMLViewer from '../HTMLViewer/HTMLViewer';
import {
  AttributedClaim,
  DayRatePill,
  IR35SignalChip,
  type WorkMode,
  WorkModePill,
} from '../trust';

/**
 * Live preview of the listing as it will appear, built from the SAME trust
 * components the public job-detail uses — so what the poster sees is what gets
 * published. Register skin.
 */
const JobPostPreview = () => {
  const { watch } = useFormContext();
  const {
    companyName,
    position,
    description,
    location,
    dayRate,
    howToApply,
    workMode,
  } = watch();

  const rate: number[] = Array.isArray(dayRate)
    ? dayRate.filter((n) => Number(n) > 0).map(Number)
    : [];

  return (
    <div className="lg:sticky lg:top-24 lg:self-start">
      <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Live preview
      </p>
      <div className="rounded-lg border border-border bg-card p-6">
        {position ? (
          <h3 className="font-display text-3xl leading-tight">{position}</h3>
        ) : (
          <h3 className="font-display text-3xl leading-tight text-muted-foreground">
            Job title
          </h3>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          {companyName && (
            <span className="font-medium text-foreground">{companyName}</span>
          )}
          {location?.address && (
            <>
              <span>·</span>
              <span>{location.address}</span>
            </>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <IR35SignalChip signal="CLIENT_INTENDS_OUTSIDE" />
          {workMode && <WorkModePill mode={workMode as WorkMode} />}
          {rate.length > 0 && (
            <span className="ml-auto">
              <DayRatePill rate={rate} />
            </span>
          )}
        </div>

        <div className="mt-5">
          <AttributedClaim
            claim="This role is intended to be outside IR35."
            attributedTo={`${companyName || 'Your company'} (client)`}
          />
        </div>

        {description && (
          <div className="editor-preview mt-6 text-[15px] leading-relaxed text-foreground/90">
            <HTMLViewer html={description} />
          </div>
        )}
        {howToApply && (
          <div className="editor-preview mt-4 text-[15px] leading-relaxed text-foreground/90">
            <HTMLViewer html={howToApply} />
          </div>
        )}
      </div>
    </div>
  );
};

export default JobPostPreview;
