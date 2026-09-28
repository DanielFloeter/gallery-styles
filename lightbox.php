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
 * locked. So the plugin serves a patched copy of that module, lightbox/view.js,
 * in its place, and adds the styles the fix needs.
 *
 * The copy is taken from one particular core module. It is only served while
 * WordPress ships exactly that module - any other version, one that already
 * carries the fix or the Gutenberg plugin's own, is left alone.
 *
 * Remove once the fix has reached every supported WordPress version.
 */

namespace galleryStyleBlock;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Id of the lightbox script module of core/image.
 */
const LIGHTBOX_MODULE = '@wordpress/block-library/image/view';

/**
 * Version of the core module lightbox/view.js was copied from (WordPress 7.1).
 */
const LIGHTBOX_MODULE_VERSION = '25ee935fd6c67371d0f3';

/**
 * Whether the lightbox WordPress ships is the one lightbox/view.js replaces.
 *
 * @return bool True when the patched copy is to be served.
 */
function lightbox_needs_fix() {
    $block_type = \WP_Block_Type_Registry::get_instance()->get_registered( 'core/image' );
    // The Gutenberg plugin renders the image block - and its lightbox - itself.
    if ( ! $block_type || 'render_block_core_image' !== $block_type->render_callback ) {
        return false;
    }

    $assets_file = ABSPATH . WPINC . '/assets/script-modules-packages.php';
    $assets      = file_exists( $assets_file ) ? include $assets_file : array();

    return LIGHTBOX_MODULE_VERSION === ( $assets['block-library/image/view.js']['version'] ?? null );
}

/**
 * Serves the patched lightbox in place of the core module.
 *
 * The image block enqueues the module by its id while rendering, so the id
 * stays and only what it points to changes.
 */
function replace_lightbox_module() {
    if ( ! function_exists( 'wp_deregister_script_module' ) || ! lightbox_needs_fix() ) {
        return;
    }

    $version = LIGHTBOX_MODULE_VERSION . '-' . filemtime( plugin_dir_path( __FILE__ ) . 'lightbox/view.js' );

    wp_deregister_script_module( LIGHTBOX_MODULE );
    wp_register_script_module(
        LIGHTBOX_MODULE,
        plugins_url( 'lightbox/view.js', __FILE__ ),
        array(
            array(
                'id'     => '@wordpress/interactivity',
                'import' => 'static',
            ),
        ),
        $version,
        array(
            'fetchpriority' => 'low',
            'in_footer'     => true,
        )
    );

    wp_enqueue_style(
        'gallery-styles-lightbox',
        plugins_url( 'lightbox/style.css', __FILE__ ),
        array(),
        filemtime( plugin_dir_path( __FILE__ ) . 'lightbox/style.css' )
    );
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\replace_lightbox_module', 1 );
