/**
 * Version tolerant helpers for the "Link to" / "Expand on click" options
 * of the core/gallery block.
 *
 * Background (see issue #10): depending on the WordPress version the
 * `linkTo` attribute of core/gallery is either missing, or present but not
 * applied to the inner core/image blocks. Therefore the plugin does not rely
 * on the attribute default alone, it also writes `href`, `linkDestination`
 * and the lightbox attribute onto the inner image blocks itself.
 */

/* Gutenberg constants */
export const LINK_DESTINATION_NONE = 'none';
export const LINK_DESTINATION_MEDIA = 'media';
export const LINK_DESTINATION_ATTACHMENT = 'attachment';
export const LINK_DESTINATION_LIGHTBOX = 'lightbox';

/* WordPress core (media library) constants */
export const LINK_DESTINATION_MEDIA_WP_CORE = 'file';
export const LINK_DESTINATION_ATTACHMENT_WP_CORE = 'post';

/**
 * Attributes of the registered core/image block, or an empty object when the
 * block is not (yet) registered.
 *
 * @return {Object} Image block attribute definitions.
 */
function getImageBlockAttributes() {
	return wp?.blocks?.getBlockType?.( 'core/image' )?.attributes ?? {};
}

/**
 * Whether the installed WordPress version offers a lightbox
 * ("Expand on click" / "Enlarge image") for the image block.
 *
 * WordPress 6.5+ uses the `lightbox` attribute, WordPress 6.4 used
 * `behaviors.lightbox`. Older versions have neither.
 *
 * @return {boolean} True when a lightbox attribute exists.
 */
export function hasLightboxSupport() {
	const attributes = getImageBlockAttributes();
	return 'lightbox' in attributes || 'behaviors' in attributes;
}

/**
 * Lightbox attributes for an inner image block, written in whichever shape
 * the installed WordPress version understands.
 *
 * @param {boolean} enabled Enable or disable the lightbox.
 * @return {Object} Attributes to merge into the image block.
 */
export function getLightboxAttributes( enabled ) {
	const attributes = getImageBlockAttributes();
	const result = {};

	if ( 'lightbox' in attributes ) {
		// WordPress 6.5+
		result.lightbox = enabled ? { enabled: true } : undefined;
	}
	if ( 'behaviors' in attributes ) {
		// WordPress 6.4
		result.behaviors = enabled
			? { lightbox: { enabled: true } }
			: undefined;
	}

	return result;
}

/**
 * New `href`, `linkDestination` and lightbox attributes for an inner image
 * block, derived from the gallery link destination.
 *
 * @param {?Object} media       Attachment record from core data, may be undefined.
 * @param {string}  destination Gallery link destination.
 * @param {Object}  attributes  Current attributes of the image block.
 * @return {Object} Attributes to merge into the image block.
 */
export function getHrefAndDestination( media, destination, attributes = {} ) {
	switch ( destination ) {
		case LINK_DESTINATION_MEDIA:
		case LINK_DESTINATION_MEDIA_WP_CORE:
			return {
				href: media?.source_url || attributes.url,
				linkDestination: LINK_DESTINATION_MEDIA,
				...getLightboxAttributes( false ),
			};
		case LINK_DESTINATION_ATTACHMENT:
		case LINK_DESTINATION_ATTACHMENT_WP_CORE:
			return {
				href: media?.link || attributes.href,
				linkDestination: LINK_DESTINATION_ATTACHMENT,
				...getLightboxAttributes( false ),
			};
		case LINK_DESTINATION_LIGHTBOX:
			return {
				href: undefined,
				linkDestination: LINK_DESTINATION_NONE,
				...getLightboxAttributes( true ),
			};
		case LINK_DESTINATION_NONE:
		default:
			return {
				href: undefined,
				linkDestination: LINK_DESTINATION_NONE,
				...getLightboxAttributes( false ),
			};
	}
}

/**
 * Normalises the WordPress core media option values to the Gutenberg ones,
 * so that a gallery saved by an older version keeps working.
 *
 * @param {?string} destination Raw attribute value.
 * @return {string} Normalised link destination.
 */
export function normalizeLinkDestination( destination ) {
	switch ( destination ) {
		case LINK_DESTINATION_MEDIA_WP_CORE:
			return LINK_DESTINATION_MEDIA;
		case LINK_DESTINATION_ATTACHMENT_WP_CORE:
			return LINK_DESTINATION_ATTACHMENT;
		case LINK_DESTINATION_MEDIA:
		case LINK_DESTINATION_ATTACHMENT:
		case LINK_DESTINATION_LIGHTBOX:
		case LINK_DESTINATION_NONE:
			return destination;
		default:
			return LINK_DESTINATION_NONE;
	}
}

/**
 * Whether an inner image block already matches the wanted link destination.
 *
 * @param {Object} attributes  Attributes of the image block.
 * @param {string} destination Wanted link destination.
 * @return {boolean} True when nothing has to be changed.
 */
export function matchesLinkDestination( attributes, destination ) {
	const lightboxEnabled =
		attributes?.lightbox?.enabled === true ||
		attributes?.behaviors?.lightbox?.enabled === true;

	switch ( destination ) {
		case LINK_DESTINATION_LIGHTBOX:
			return lightboxEnabled;
		case LINK_DESTINATION_NONE:
			return ! attributes?.href && ! lightboxEnabled;
		default:
			return (
				!! attributes?.href &&
				normalizeLinkDestination( attributes?.linkDestination ) ===
					normalizeLinkDestination( destination )
			);
	}
}
