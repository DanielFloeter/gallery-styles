<?php
/*
 * Plugin Name: Gallery Styles
 * Plugin URI:  https://github.com/DanielFloeter/gallery-styles
 * Description: Additional Styles for the WordPress core/gallery
 * Version:     1.2.0
 * Author:      Daniel Flöter
 * Author URI:  https://tiptoppress.com
 * License:     GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: gallery-styles-block
 *
 */

namespace galleryStyleBlock;

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Write the color and accessing 
 * css variable "--line-color"
 */
function custom_block_wrapper( $block_content, $block ) {
    if ( $block['blockName'] === 'core/gallery' && isset( $block['attrs']['color'] ) && $block['attrs']['color'] !== '' ) {
		$content = '<div style="--line-color:' . $block['attrs']['color'] . '">';
        $content .= $block_content;
        $content .= '</div>';
        return $content;
    }
    return $block_content;
}
 
add_filter( 'render_block', __NAMESPACE__ . '\custom_block_wrapper', 10, 2 );

/**
 * Enqueue Block Styles Javascript and Styles Stylesheet for editing
 */
function custom_gutenberg_scripts() {

    wp_enqueue_style( 'editor-style-index-css',
      plugins_url( '/build/index.css', __FILE__ ),
      array(),
      filemtime( plugin_dir_path( __FILE__ ) . 'build/index.css' )
    );

    wp_enqueue_script(
      'block-styles-script',
      plugins_url( 'build/index.js', __FILE__ ),
      array( 'wp-blocks', 'wp-dom-ready', 'wp-edit-post' ),
      filemtime( plugin_dir_path( __FILE__ ) . './build/index.js' )
    );
}
add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\custom_gutenberg_scripts' );

/**
 * Enqueue Block Styles Stylesheet for editor and front-end
 */
function custom_gutenberg_styles() {

  wp_enqueue_style( 'style-index-css',
    plugins_url( 'build/style-index.css', __FILE__ ),
    array(),
    filemtime( plugin_dir_path( __FILE__ ) . 'build/style-index.css' )
  );
  
}
add_action( 'enqueue_block_assets', __NAMESPACE__ . '\custom_gutenberg_styles' );



