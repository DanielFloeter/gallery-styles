<?php
/*
Plugin Name: Gallery Styles
Plugin URI: https://tiptoppress.com
Description: Additional Styles for the WordPress core/gallery
Author: Daniel Flöter
Author URI: https://tiptoppress.com
Version: 1.0
*/

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Enqueue Block Styles Javascript
 */
function custom_gutenberg_scripts() {
    wp_enqueue_script(
		'block-styles-script',
		plugins_url( 'block.js', __FILE__ ),
		array( 'wp-blocks', 'wp-dom-ready', 'wp-edit-post' ),
		filemtime( plugin_dir_path( __FILE__ ) . 'block.js' )
    );
}
add_action( 'enqueue_block_editor_assets', 'custom_gutenberg_scripts' );

/**
 * Enqueue Block Styles Stylesheet
 */
function custom_gutenberg_styles() {
	 wp_enqueue_style( 'block-styles-css',
	 	plugins_url( 'block-styles.css', __FILE__ ) 
	);
}
add_action( 'enqueue_block_assets', 'custom_gutenberg_styles' );