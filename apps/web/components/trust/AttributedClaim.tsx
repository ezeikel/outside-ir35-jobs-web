import { faQuoteLeft } from '@fortawesome/pro-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from '@/utils/cn';

/**
 * AttributedClaim — what the CLIENT claims, never what the platform asserts.
 *
 * The single most important trust component. We legally cannot determine IR35
 * status; only the end-client can (via an SDS). So a claim is always rendered
 * as the client's, attributed and timestamped, visually SEPARATED from
 * verified facts (VerifiedFactRow) — it carries no green tick. In the Register
 * direction this reads like a pull-quote: a stated position, on the record,
 * with a source. See docs/ir35-trust-model.md.
 */

type AttributedClaimProps = {
  /** The claim itself, e.g. "This role is intended to be outside IR35." */
  claim: string;
  /** Who is making the claim, e.g. "Acme Ltd (client)". */
  attributedTo: string;
  /** When it was stated. */
  statedOn?: string;
  /** Optional supporting evidence label, e.g. "SDS attached" — client-supplied, not our verification. */
  evidence?: string;
  className?: string;
};

const AttributedClaim = ({
  claim,
  attributedTo,
  statedOn,
  evidence,
  className,
}: AttributedClaimProps) => (
  <figure
    className={cn(
      'relative rounded-lg border border-border bg-muted/40 p-4 pl-5',
      // left rule signals "a quoted position", not a verified fact
      'before:absolute before:left-0 before:top-3 before:bottom-3 before:w-0.5 before:rounded-full before:bg-ink-300',
      className,
    )}
  >
    <FontAwesomeIcon
      icon={faQuoteLeft}
      className="mb-1.5 h-3 w-3 text-muted-foreground"
    />
    <blockquote className="font-display text-lg leading-snug text-foreground">
      {claim}
    </blockquote>
    <figcaption className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground tabular">
      <span className="font-medium text-foreground">{attributedTo}</span>
      {statedOn && <span>· stated {statedOn}</span>}
      {evidence && (
        <span className="rounded-full border border-border bg-card px-2 py-0.5">
          {evidence} (client-supplied)
        </span>
      )}
    </figcaption>
  </figure>
);

export default AttributedClaim;
