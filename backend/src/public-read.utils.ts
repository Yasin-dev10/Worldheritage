import { BadRequestException } from '@nestjs/common';

export const MAX_PUBLIC_PAGE_SIZE = 50;
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parsePublicQuery(input: {
  locale?: string;
  limit?: string;
  cursor?: string;
  q?: string;
}) {
  const locale = input.locale ?? 'so';
  if (locale !== 'so' && locale !== 'en') {
    throw new BadRequestException('locale must be so or en.');
  }
  const limit = Number(input.limit ?? 20);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PUBLIC_PAGE_SIZE) {
    throw new BadRequestException(
      `limit must be an integer between 1 and ${MAX_PUBLIC_PAGE_SIZE}.`,
    );
  }
  if (input.cursor && !UUID_PATTERN.test(input.cursor)) {
    throw new BadRequestException('cursor must be a UUID.');
  }
  const query = input.q?.trim();
  if (
    input.q !== undefined &&
    (!query || query.length < 2 || query.length > 100)
  ) {
    throw new BadRequestException(
      'q must contain between 2 and 100 characters.',
    );
  }
  return { locale, limit, cursor: input.cursor, query };
}

export function publicSourceRecordSelection() {
  return {
    source: {
      select: {
        sourceKind: true,
        creator: true,
        title: true,
        publisherOrCollection: true,
        publicationDateText: true,
        stableIdentifier: true,
        url: true,
        rightsStatus: true,
        rightsNotes: true,
      },
    },
  } as const;
}
