export const PAGINATION_LIMIT = 10;

/** POSTS.access values. These are foreign keys onto the ACCESS_TYPES table, so
    adding one here means adding the matching lookup row (see sql/). */
export const ACCESS_PUBLIC = 1;
export const ACCESS_PRIVATE = 2;
export const ACCESS_DRAFT = 4;
