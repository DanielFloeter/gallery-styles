<?php
/**
 * Temporary workaround for https://github.com/WordPress/gutenberg/pull/79058
 *
 * The lightbox of the image block sizes itself by the thumbnail instead of the
 * original image: in a gallery with "Crop images to fit", or for an image set
 * to a cropped size, "Expand on click" shows the image with the thumbnail's
 * proportions.
 *
 * The fix lives in the lightbox script module of core/image, whose store is
 * locked. So the plugin serves a patched copy of that module in its place, and
 * adds the styles the fix needs.
 *
 * The copy is made on the fly from the module WordPress ships: the hunks of
 * lightbox/view.patch replace the faulty lines of `callbacks.setOverlayStyles()`,
 * the rest stays as shipped. That only happens while every faulty line is still
 * there - a module that has the fix, or the Gutenberg plugin's own, is left
 * alone. Nothing is written to disk; the plugin serves the copy itself, see
 * serve_lightbox_module().
 *
 * Remove once the fix has reached every supported WordPress version
 * (expected in WordPress 7.2).
 */

namespace galleryStyleBlock;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Id of the lightbox script module of core/image.
 */
const LIGHTBOX_MODULE = '@wordpress/block-library/image/view';

/**
 * Query var under which the plugin serves the patched module.
 */
const LIGHTBOX_QUERY_VAR = 'gallery-styles-lightbox';

/**
 * The lightbox module WordPress ships, as registered by core.
 *
 * @return array|null Asset data with 'version' and 'module_dependencies', or null.
 */
function core_lightbox_asset() {
    $assets_file = ABSPATH . WPINC . '/assets/script-modules-packages.php';
    $assets      = file_exists( $assets_file ) ? include $assets_file : array();

    return $assets['block-library/image/view.js'] ?? null;
}

/**
 * The lightbox module WordPress ships, with the hunks of lightbox/view.patch
 * applied.
 *
 * The unminified module is patched, whatever SCRIPT_DEBUG says - the minified
 * one has no stable lines to replace.
 *
 * @return string|null The patched module, or null when a hunk does not apply.
 */
function patched_lightbox() {
    static $patched = false;
    if ( false !== $patched ) {
        return $patched;
    }
    $patched = null;

    $core = @file_get_contents( ABSPATH . WPINC . '/js/dist/script-modules/block-library/image/view.js' );
    if ( ! $core ) {
        return null;
    }

    $patch = file_get_contents( __DIR__ . '/lightbox/view.patch' );
    if ( ! preg_match_all( '/^@@ core\n(.*?)\n@@ fix\n(.*?)\n@@ end$/ms', $patch, $hunks, PREG_SET_ORDER ) ) {
        return null;
    }

    foreach ( $hunks as list( , $faulty, $fixed ) ) {
        if ( 1 !== substr_count( $core, $faulty ) ) {
            return null;
        }
        $core = str_replace( $faulty, $fixed, $core );
    }

    $patched = "/* core/image lightbox, patched by Gallery Styles, see lightbox.php. */\n" . $core;

    return $patched;
}

/**
 * Whether the lightbox WordPress ships is to be replaced by the patched one.
 *
 * @return bool True when the patched copy is to be served.
 */
function lightbox_needs_fix() {
    $block_type = \WP_Block_Type_Registry::get_instance()->get_registered( 'core/image' );
    // The Gutenberg plugin renders the image block - and its lightbox - itself.
    if ( ! $block_type || 'render_block_core_image' !== $block_type->render_callback ) {
        return false;
    }

    return null !== core_lightbox_asset() && null !== patched_lightbox();
}

/**
 * Serves the patched lightbox in place of the core module.
 *
 * The image block enqueues the module by its id while rendering, so the id
 * stays and only what it points to changes. Block themes render the template
 * before wp_enqueue_scripts, so the module may already be queued - and
 * deregistering dequeues it, so it is queued again.
 */
function replace_lightbox_module() {
    if ( ! function_exists( 'wp_deregister_script_module' ) || ! lightbox_needs_fix() ) {
        return;
    }

    $asset   = core_lightbox_asset();
    $version = $asset['version'] . '-' . filemtime( __DIR__ . '/lightbox/view.patch' );
    $queued  = in_array( LIGHTBOX_MODULE, wp_script_modules()->get_queue(), true );

    wp_deregister_script_module( LIGHTBOX_MODULE );
    wp_register_script_module(
        LIGHTBOX_MODULE,
        add_query_arg( LIGHTBOX_QUERY_VAR, $asset['version'], home_url( '/' ) ),
        $asset['module_dependencies'] ?? array(),
        $version,
        array(
            'fetchpriority' => 'low',
            'in_footer'     => true,
        )
    );
    if ( $queued ) {
        wp_enqueue_script_module( LIGHTBOX_MODULE );
    }

    wp_enqueue_style(
        'gallery-styles-lightbox',
        plugins_url( 'lightbox/style.css', __FILE__ ),
        array(),
        filemtime( __DIR__ . '/lightbox/style.css' )
    );
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\replace_lightbox_module', 1 );

/**
 * Answers the request for the patched module registered above.
 *
 * Its URL carries the version of the core module it was made from, so it is
 * cached for good as long as that version is the one installed. A page cached
 * from before a WordPress update still gets the current module, uncached.
 */
function serve_lightbox_module() {
    if ( ! isset( $_GET[ LIGHTBOX_QUERY_VAR ] ) ) {
        return;
    }

    $module = patched_lightbox();
    if ( null === $module ) {
        status_header( 404 );
        exit;
    }

    $asset = core_lightbox_asset();
    status_header( 200 );
    header( 'Content-Type: text/javascript; charset=utf-8' );
    header( 'X-Content-Type-Options: nosniff' );
    if ( $asset && $asset['version'] === wp_unslash( $_GET[ LIGHTBOX_QUERY_VAR ] ) ) {
        header( 'Cache-Control: public, max-age=31536000, immutable' );
    } else {
        header( 'Cache-Control: no-cache' );
    }
    echo $module;
    exit;
}
add_action( 'plugins_loaded', __NAMESPACE__ . '\serve_lightbox_module' );
